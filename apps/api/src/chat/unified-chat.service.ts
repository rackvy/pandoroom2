import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ChannelKind, MessageDirection, MessageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChannelDriver } from '../integrations/channels/channel-driver.interface';
import { ChatBroadcaster } from './chat-broadcaster';

/** Бронь в ленте — контекст-тег, поэтому из неё нужен только заголовок. */
const MESSAGE_INCLUDE = {
  booking: { select: { id: true, eventDate: true, clientName: true, status: true } },
} satisfies Prisma.ChatMessageInclude;

export type ChatMessageWithBooking = Prisma.ChatMessageGetPayload<{
  include: typeof MESSAGE_INCLUDE;
}>;

/**
 * Колонка sender устарела и будет удалена отдельной миграцией, но задеплоенные
 * ЛК и админка читают именно её — поэтому пишем обе.
 */
const LEGACY_SENDER: Record<MessageDirection, 'client' | 'admin' | 'system'> = {
  INBOUND: 'client',
  OUTBOUND: 'admin',
  SYSTEM: 'system',
};

const MAX_TEXT_LENGTH = 4000;
const MAX_PAGE_SIZE = 200;

export interface AppendMessageInput {
  clientId: string;
  text: string;
  direction: MessageDirection;
  channel?: ChannelKind;
  status?: MessageStatus;
  bookingId?: string | null;
  authorId?: string | null;
  authorName?: string | null;
  externalId?: string | null;
  errorText?: string | null;
  isRead?: boolean;
  /** Время у провайдера: ретрай вебхука не должен переставлять ленту. */
  createdAt?: Date;
}

export interface FeedQuery {
  cursor?: string;
  limit?: number;
}

/**
 * Единственная точка записи переписки. Раньше сообщение создавалось в четырёх
 * местах — в шлюзе и в трёх сервисах, — и у каждого была своя логика пометки
 * о прочтении. Теперь запись и рассылка живут только здесь.
 */
@Injectable()
export class UnifiedChatService {
  private readonly logger = new Logger(UnifiedChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcaster: ChatBroadcaster,
  ) {}

  async appendMessage(input: AppendMessageInput): Promise<ChatMessageWithBooking> {
    const text = this.normalizeText(input.text);
    const authorId = input.authorId ?? null;
    const authorName =
      input.authorName ?? (authorId ? await this.resolveAuthorName(authorId) : null);

    const message = await this.prisma.chatMessage.create({
      data: {
        clientId: input.clientId,
        bookingId: input.bookingId ?? null,
        sender: LEGACY_SENDER[input.direction],
        direction: input.direction,
        channel: input.channel ?? ChannelKind.INTERNAL,
        status: input.status ?? MessageStatus.SENT,
        authorId,
        authorName,
        externalId: input.externalId ?? null,
        errorText: input.errorText ?? null,
        text,
        isRead: input.isRead ?? false,
        ...(input.createdAt ? { createdAt: input.createdAt } : {}),
      },
      include: MESSAGE_INCLUDE,
    });

    await this.broadcast(message);
    return message;
  }

  /**
   * Лента клиента с курсором. Общий список сообщений без лимита при одной
   * ленте на все каналы рос бы бесконечно, поэтому пагинация здесь обязательна.
   */
  async getFeed(clientId: string, query: FeedQuery = {}) {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), MAX_PAGE_SIZE);

    const rows = await this.prisma.chatMessage.findMany({
      where: { clientId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: MESSAGE_INCLUDE,
    });

    const hasMore = rows.length > limit;
    const page = (hasMore ? rows.slice(0, limit) : rows).reverse();

    return {
      messages: page,
      nextCursor: hasMore && page.length > 0 ? page[0].id : null,
    };
  }

  /**
   * Непрочитанное у команды — общее на всех сотрудников: одна колонка isRead,
   * сторона различается по direction. Для INBOUND это «не прочитано командой».
   */
  async unreadForStaff(): Promise<number> {
    return this.prisma.chatMessage.count({
      where: { direction: 'INBOUND', isRead: false },
    });
  }

  /** Для OUTBOUND и SYSTEM та же колонка означает «не прочитано клиентом». */
  async unreadForClient(clientId: string): Promise<number> {
    return this.prisma.chatMessage.count({
      where: { clientId, direction: { in: ['OUTBOUND', 'SYSTEM'] }, isRead: false },
    });
  }

  async markReadByStaff(clientId?: string, bookingId?: string | null): Promise<number> {
    await this.prisma.chatMessage.updateMany({
      where: {
        direction: 'INBOUND',
        isRead: false,
        ...(clientId ? { clientId } : {}),
        ...(bookingId ? { bookingId } : {}),
      },
      data: { isRead: true },
    });

    const unread = await this.unreadForStaff();
    this.broadcaster.toStaff('unread:update', { unread });
    return unread;
  }

  async markReadByClient(clientId: string, bookingId?: string | null): Promise<number> {
    await this.prisma.chatMessage.updateMany({
      where: {
        clientId,
        direction: { in: ['OUTBOUND', 'SYSTEM'] },
        isRead: false,
        ...(bookingId ? { bookingId } : {}),
      },
      data: { isRead: true },
    });

    const unread = await this.unreadForClient(clientId);
    this.broadcaster.toClient(clientId, 'unread:update', { unread });
    return unread;
  }

  /**
   * Клиент может приписать сообщение только своей брони. Прежний путь через сокет
   * эту проверку не делал вовсе, а HTTP-путь делал — теперь она одна и для обоих.
   */
  async assertBookingBelongsToClient(bookingId: string, clientId: string): Promise<void> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, clientId },
      select: { id: true },
    });
    if (!booking) {
      throw new NotFoundException('Бронирование не найдено');
    }
  }

  async assertClientExists(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, phone: true, email: true },
    });
    if (!client) {
      throw new NotFoundException('Клиент не найден');
    }
    return client;
  }

  private async broadcast(message: ChatMessageWithBooking): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { id: message.clientId },
      select: { id: true, name: true, phone: true },
    });

    this.broadcaster.toClient(message.clientId, 'message:new', message);
    this.broadcaster.toStaff('message:new', { ...message, client });

    const [staffUnread, clientUnread] = await Promise.all([
      this.unreadForStaff(),
      this.unreadForClient(message.clientId),
    ]);
    this.broadcaster.toStaff('unread:update', { unread: staffUnread });
    this.broadcaster.toClient(message.clientId, 'unread:update', { unread: clientUnread });
  }

  private async resolveAuthorName(authorId: string): Promise<string | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: authorId },
      select: { fullName: true },
    });
    return employee?.fullName ?? null;
  }

  private normalizeText(raw: unknown): string {
    const text = typeof raw === 'string' ? raw.trim() : '';
    if (!text) {
      throw new BadRequestException('Пустое сообщение');
    }
    if (text.length > MAX_TEXT_LENGTH) {
      throw new BadRequestException(`Сообщение длиннее ${MAX_TEXT_LENGTH} символов`);
    }
    return text;
  }

  /**
   * Обращения для админки: группы по клиенту, а не по брони. Прежний список
   * собирал диалоги только там, где bookingId не пустой, поэтому обращения без
   * брони в интерфейс не попадали вовсе.
   */
  async getInbox(query: FeedQuery = {}) {
    const limit = Math.min(Math.max(query.limit ?? 30, 1), MAX_PAGE_SIZE);

    const grouped = await this.prisma.chatMessage.groupBy({
      by: ['clientId'],
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: 'desc' } },
      take: limit,
    });
    if (grouped.length === 0) return [];

    const clientIds = grouped.map((g) => g.clientId);
    const [lastMessages, unreadGroups, clients] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { clientId: { in: clientIds } },
        orderBy: [{ clientId: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
        distinct: ['clientId'],
        select: {
          id: true,
          clientId: true,
          text: true,
          direction: true,
          channel: true,
          authorName: true,
          createdAt: true,
        },
      }),
      this.prisma.chatMessage.groupBy({
        by: ['clientId'],
        where: { clientId: { in: clientIds }, direction: 'INBOUND', isRead: false },
        _count: { _all: true },
      }),
      this.prisma.client.findMany({
        where: { id: { in: clientIds } },
        select: { id: true, name: true, phone: true },
      }),
    ]);

    const lastByClient = new Map(lastMessages.map((m) => [m.clientId, m]));
    const unreadByClient = new Map(unreadGroups.map((g) => [g.clientId, g._count._all]));
    const clientById = new Map(clients.map((c) => [c.id, c]));

    return grouped
      .map((g) => {
        const client = clientById.get(g.clientId);
        if (!client) return null;
        return {
          client,
          lastMessage: lastByClient.get(g.clientId) ?? null,
          unreadCount: unreadByClient.get(g.clientId) ?? 0,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }

  /**
   * Входящее из мессенджера. Провайдер ретраит вебхуки, поэтому повтор того же
   * externalId не создаёт вторую строку — иначе счётчик непрочитанного рос бы
   * на каждую повторную доставку.
   */
  async appendInbound(
    input: AppendMessageInput & { externalId: string },
  ): Promise<{ message: ChatMessageWithBooking; created: boolean }> {
    const channel = input.channel ?? ChannelKind.INTERNAL;

    const known = await this.prisma.chatMessage.findUnique({
      where: { channel_externalId: { channel, externalId: input.externalId } },
      include: MESSAGE_INCLUDE,
    });
    if (known) return { message: known, created: false };

    try {
      const message = await this.appendMessage({ ...input, channel });
      return { message, created: true };
    } catch (error) {
      // Гонка двух ретраев: пока первый вставлялся, второй уже не вставка.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const raced = await this.prisma.chatMessage.findUnique({
          where: { channel_externalId: { channel, externalId: input.externalId } },
          include: MESSAGE_INCLUDE,
        });
        if (raced) return { message: raced, created: false };
      }
      throw error;
    }
  }

  /**
   * Статус доставки от провайдера. Сообщения, которого мы не отправляли, здесь
   * быть не может — возвращаем null, и вызывающий не выдаёт это за ошибку.
   */
  async applyDeliveryStatus(
    channel: ChannelKind,
    externalId: string,
    status: MessageStatus,
    errorText?: string,
  ): Promise<ChatMessageWithBooking | null> {
    const found = await this.prisma.chatMessage.findUnique({
      where: { channel_externalId: { channel, externalId } },
      select: { id: true },
    });
    if (!found) return null;
    return this.transition(found.id, status, { errorText });
  }

  /**
   * Отправка наружу. Сообщение заводится со статусом PENDING до обращения к
   * провайдеру: если тот не ответит, в ленте останется видимый след, а не
   * молча пропавший текст.
   */
  async sendThroughChannel(
    input: AppendMessageInput & { channel: ChannelKind; recipient: string },
    driver: ChannelDriver,
  ): Promise<ChatMessageWithBooking> {
    const { recipient, ...rest } = input;
    const message = await this.appendMessage({ ...rest, status: MessageStatus.PENDING });

    try {
      const { externalId } = await driver.send(message.channel, recipient, message.text);
      return await this.transition(message.id, MessageStatus.SENT, { externalId });
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Отправка в ${message.channel} не удалась: ${errorText}`);
      return await this.transition(message.id, MessageStatus.FAILED, { errorText });
    }
  }

  /** Переход статуса уже созданного сообщения: наружу уходит одно и то же событие. */
  private async transition(
    id: string,
    status: MessageStatus,
    patch: { externalId?: string; errorText?: string } = {},
  ): Promise<ChatMessageWithBooking> {
    const current = await this.prisma.chatMessage.findUnique({ where: { id }, select: { id: true } });
    if (!current) throw new NotFoundException('Сообщение не найдено');

    const updated = await this.prisma.chatMessage.update({
      where: { id },
      data: {
        status,
        ...(patch.externalId ? { externalId: patch.externalId } : {}),
        errorText: status === MessageStatus.FAILED ? patch.errorText ?? null : null,
        // «Прочитано» от провайдера — это он же флаг прочтения клиентом:
        // иначе счётчик в личном кабинете расходится с мессенджером.
        ...(status === MessageStatus.READ ? { isRead: true } : {}),
      },
      include: MESSAGE_INCLUDE,
    });

    const payload = { id: updated.id, status: updated.status, errorText: updated.errorText };
    this.broadcaster.toClient(updated.clientId, 'message:status', payload);
    this.broadcaster.toStaff('message:status', payload);

    if (status === MessageStatus.READ) {
      const unread = await this.unreadForClient(updated.clientId);
      this.broadcaster.toClient(updated.clientId, 'unread:update', { unread });
    }

    return updated;
  }
}
