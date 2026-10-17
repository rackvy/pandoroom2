import { Injectable, Logger } from '@nestjs/common';
import { ChannelKind, MessageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { isValidPhone, normalizePhone } from '../client-auth/phone';
import { ChannelRegistry } from '../integrations/channels/channel-registry';
import {
  InboundEvent,
  WebhookContext,
  isInboundEvent,
} from '../integrations/channels/channel-driver.interface';
import { UnifiedChatService } from './unified-chat.service';
import { ChannelProbeService } from './channel-probe.service';

export interface WebhookOutcome {
  /** Всего событий в запросе. */
  events: number;
  created: number;
  /** Повтор ретрая — событие уже было записано. */
  duplicated: number;
  /** Статусы, которые легли на отправленное нами сообщение. */
  statuses: number;
  /** Незнакомое событие или статус для сообщения, которое мы не отправляли. */
  ignored: number;
  /**
   * Сообщение, которое не к кому привязать: мессенджер не прислал телефон, а по
   * идентификатору собеседника клиента нет. Не ошибка — карточку заводим только
   * по номеру, иначе в базу попадут строки без способа связаться с человеком.
   */
  noClient: number;
  /** Клиент заведён автоматически: по нему видно, сколько незнакомых номеров пришло. */
  newClients: number;
}

export interface StaffSendInput {
  clientId: string;
  text: string;
  channel: ChannelKind;
  bookingId?: string | null;
  authorId?: string | null;
}

/**
 * Всё, что пересекает границу канала: входящее из вебхука, статусы доставки и
 * ответ менеджера наружу. Разбором чужого формата занимается драйвер, здесь —
 * только маршрутизация до клиента и запись через единый сервис переписки.
 */
@Injectable()
export class ChannelService {
  private readonly logger = new Logger(ChannelService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ChannelRegistry,
    private readonly chat: UnifiedChatService,
    private readonly probes: ChannelProbeService,
    private readonly clients: ClientsService,
  ) {}

  async handleWebhook(ctx: WebhookContext): Promise<WebhookOutcome> {
    const driver = await this.registry.driver();
    const events = await driver.parseWebhook(ctx);
    const outcome: WebhookOutcome = {
      events: events.length,
      created: 0,
      duplicated: 0,
      statuses: 0,
      ignored: 0,
      noClient: 0,
      newClients: 0,
    };

    for (const event of events) {
      if (isInboundEvent(event)) {
        const client = await this.clientForEvent(event);
        if (!client) {
          outcome.noClient += 1;
          this.logger.warn(
            `Сообщение в ${event.channel} не к кому привязать: номер не прислан, chatId «${
              event.chatId ?? 'пустой'
            }» не известен`,
          );
          continue;
        }
        if (client.created) outcome.newClients += 1;

        // Эхо провайдера — ответ сотрудника, отправленный не через нас
        // (из виджета Wazzup или с телефона): в ленте он тоже исходящее.
        const { created } = await this.chat.appendFromProvider({
          clientId: client.id,
          text: event.text,
          direction: event.fromStaff ? 'OUTBOUND' : 'INBOUND',
          channel: event.channel,
          externalId: event.externalId,
          authorName: event.authorName ?? null,
          createdAt: event.at,
        });
        if (created) {
          outcome.created += 1;
        } else {
          outcome.duplicated += 1;
        }

        // Сам факт сообщения подтверждает канал надёжнее любой пробы номера.
        await this.probes.registerInbound(client.id, event.channel, this.recipientId(event));
        continue;
      }

      const applied = await this.chat.applyDeliveryStatus(
        event.channel,
        event.externalId,
        MessageStatus[event.status.toUpperCase() as keyof typeof MessageStatus],
        event.errorText,
      );
      if (applied) {
        outcome.statuses += 1;
      } else {
        outcome.ignored += 1;
        this.logger.log(`Статус ${event.status} для неизвестного сообщения ${event.externalId}`);
      }
    }

    return outcome;
  }

  /**
   * Ответ менеджера. Внутренний канал — просто запись в ленту; наружный идёт
   * через драйвер, и его ошибка становится статусом сообщения, а не ошибкой
   * запроса: текст уже виден клиенту в ленте, он должен видеть и исход.
   */
  async sendFromStaff(input: StaffSendInput) {
    if (input.channel === ChannelKind.INTERNAL) {
      return this.chat.appendMessage({
        clientId: input.clientId,
        text: input.text,
        direction: 'OUTBOUND',
        channel: ChannelKind.INTERNAL,
        bookingId: input.bookingId ?? null,
        authorId: input.authorId ?? null,
      });
    }

    const client = await this.chat.assertClientExists(input.clientId);
    const driver = await this.registry.driver();
    const recipient = await this.recipientFor(input.clientId, client.phone, input.channel);

    return this.chat.sendThroughChannel(
      {
        clientId: input.clientId,
        text: input.text,
        direction: 'OUTBOUND',
        channel: input.channel,
        bookingId: input.bookingId ?? null,
        authorId: input.authorId ?? null,
        recipient,
      },
      driver,
    );
  }

  /**
   * Номер клиента — это только ключ карточки. У канала может быть свой
   * идентификатор получателя (chatId в Telegram), он и идёт провайдеру.
   */
  private async recipientFor(clientId: string, phone: string, channel: ChannelKind) {
    const row = await this.prisma.clientChannel.findUnique({
      where: { clientId_channel: { clientId, channel } },
      select: { externalId: true },
    });
    return row?.externalId || normalizePhone(phone);
  }

  /**
   * Клиент по входящему. Номер — единственный надёжный ключ карточки; если
   * мессенджер его не прислал, остаётся искать по сохранённому идентификатору
   * собеседника — он появляется после первого сообщения с этим номером.
   */
  private async clientForEvent(event: InboundEvent) {
    const phone = normalizePhone(event.from);
    if (isValidPhone(phone)) {
      const existing = await this.clients.findByPhone(phone);
      if (existing) return { id: existing.id, created: false };

      try {
        const client = await this.prisma.client.create({
          data: { phone, name: (event.contactName || '').trim() },
        });
        this.logger.log(`Клиент ${phone} заведён из входящего сообщения`);
        return { id: client.id, created: true };
      } catch (error) {
        // Два первых сообщения от незнакомца приходят почти одновременно.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const raced = await this.clients.findByPhone(phone);
          if (raced) return { id: raced.id, created: false };
        }
        throw error;
      }
    }

    if (!event.chatId) return null;
    const known = await this.prisma.clientChannel.findFirst({
      where: { channel: event.channel, externalId: event.chatId },
      select: { clientId: true },
    });
    return known ? { id: known.clientId, created: false } : null;
  }

  /** Адрес для ответа: идентификатор собеседника в мессенджере, иначе номер. */
  private recipientId(event: InboundEvent): string {
    return event.chatId || normalizePhone(event.from);
  }
}
