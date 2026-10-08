import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ChannelKind, MessageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { isValidPhone, normalizePhone } from '../client-auth/phone';
import { ChannelRegistry } from '../integrations/channels/channel-registry';
import {
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
      newClients: 0,
    };

    for (const event of events) {
      if (isInboundEvent(event)) {
        const client = await this.clientByPhone(event.from, event.contactName);
        if (client.created) outcome.newClients += 1;

        const { created } = await this.chat.appendInbound({
          clientId: client.id,
          text: event.text,
          direction: 'INBOUND',
          channel: event.channel,
          externalId: event.externalId,
          createdAt: event.at,
        });
        if (created) {
          outcome.created += 1;
        } else {
          outcome.duplicated += 1;
        }

        // Сам факт входящего подтверждает канал надёжнее любой пробы номера.
        await this.probes.registerInbound(client.id, event.channel, normalizePhone(event.from));
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

  private async clientByPhone(rawPhone: string, contactName?: string) {
    const phone = normalizePhone(rawPhone);
    if (!isValidPhone(phone)) {
      throw new BadRequestException(`Входящее с номером «${rawPhone}» не в формате 7XXXXXXXXXX`);
    }

    const existing = await this.clients.findByPhone(phone);
    if (existing) return { id: existing.id, created: false };

    try {
      const client = await this.prisma.client.create({
        data: { phone, name: (contactName || '').trim() },
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
}
