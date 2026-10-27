import { Logger } from '@nestjs/common';
import { ChannelKind } from '@prisma/client';
import { timingSafeEqual } from 'crypto';
import {
  ChannelConfig,
  ChannelDriver,
  ChannelState,
  DigitsPhone,
  InboundEvent,
  ProbeResult,
  StatusEvent,
  WebhookContext,
} from './channel-driver.interface';

/**
 * Контракт — публичная документация Wazzup API v3 (wazzup24.ru/help/api-ru):
 * авторизация `Authorization: Bearer <ключ>`, отправка `POST /v3/message`,
 * каналы `GET /v3/channels`, вебхуки `PATCH/GET /v3/webhooks`.
 *
 * Подписи у вебхука нет: провайдер либо кладёт в заголовок наш crmKey, либо
 * не кладёт ничего, поэтому ключ доступа живёт в query строке адреса.
 *
 * Проверить «зарегистрирован ли номер в WhatsApp» этим API нельзя — такого
 * метода нет, — поэтому probe() отвечает только за состояние нашего канала.
 */
const MESSAGE_PATH = '/v3/message';
const CHANNELS_PATH = '/v3/channels';
const REQUEST_TIMEOUT_MS = 8000;

/** Тип сущности в мессенджере, который просим у Wazzup для каждого канала. */
const CHAT_TYPE: Partial<Record<ChannelKind, string>> = {
  [ChannelKind.WHATSAPP]: 'whatsapp',
  [ChannelKind.TELEGRAM]: 'telegram',
  [ChannelKind.MAX]: 'max',
};

/** Обратное соответствие: из webhook-а приходим к нашему каналу. */
const CHANNEL_BY_CHAT_TYPE: Record<string, ChannelKind | null> = {
  whatsapp: ChannelKind.WHATSAPP,
  telegram: ChannelKind.TELEGRAM,
  max: ChannelKind.MAX,
  // Групповые чаты и прочие мессенджеры нам не клиентов несут — пропускаем.
  whatsgroup: null,
  telegroup: null,
  maxgroup: null,
  viber: null,
  instagram: null,
  vk: null,
  avito: null,
};

const STATUS_MAP: Record<string, StatusEvent['status'] | null> = {
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  error: 'failed',
  // Сообщение изменили — в нашей ленте мы его не переписываем.
  edited: null,
};

/** Состояния канала по документации: human-readable, чтобы менеджер понял подсказку. */
const STATE_LABELS: Record<string, string> = {
  active: 'активен',
  init: 'запускается',
  disabled: 'выключен — убран из подписки или удалён',
  phoneUnavailable: 'нет связи с телефоном',
  qridle: 'нужно отсканировать QR-код',
  openelsewhere: 'авторизован в другом аккаунте Wazzup',
  notEnoughMoney: 'не оплачен',
  foreignphone: 'QR отсканирован чужим аккаунтом мессенджера',
  unauthorized: 'не авторизован',
  waitForPassword: 'нужен пароль двухфакторной аутентификации',
  blocked: 'заблокирован',
  onModeration: 'на модерации',
  rejected: 'отклонён',
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Без суффикса зоны время приезжает в формате провайдера — считаем его UTC. */
function parseAt(raw: string): Date | undefined {
  if (!raw) return undefined;
  const iso = /^\d{4}-\d{2}-\d{2}T[\d:.]+$/.test(raw) ? `${raw}Z` : raw;
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? undefined : at;
}

/** Wazzup в WhatsApp кладёт именем контакта сам номер — это не имя. */
function displayName(contact: Record<string, unknown> | null): string | undefined {
  const name = str(contact?.name);
  if (!name) return undefined;
  const phone = str(contact?.phone);
  if (name.replace(/\D/g, '') === phone.replace(/\D/g, '')) return undefined;
  return name;
}

function constantTimeEquals(expected: string, given: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(given, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

interface ChannelRow {
  channelId: string;
  transport: string;
  plainId: string;
  state: string;
}

export class WazzupDriver implements ChannelDriver {
  readonly kind = 'wazzup' as const;
  private readonly logger = new Logger(WazzupDriver.name);
  /** Список каналов держим в рамках одного обращения: проба трёх каналов — это один запрос. */
  private channelsCache: ChannelRow[] | null = null;

  constructor(private readonly config: ChannelConfig) {}

  async send(channel: ChannelKind, to: DigitsPhone, text: string): Promise<{ externalId: string }> {
    const chatType = CHAT_TYPE[channel];
    if (!chatType) {
      throw new Error(`Канал ${channel} не выводится наружу`);
    }
    const channelId = this.config.channelIds[channel];
    if (!channelId) {
      throw new Error(`Для канала ${channel} не задан ID канала в настройках интеграций`);
    }

    const data = await this.request('POST', MESSAGE_PATH, {
      channelId,
      chatType,
      text,
      ...this.recipientParams(channel, to),
    });

    const messageId = str(data?.messageId);
    if (!messageId) {
      throw new Error(`Wazzup не вернул идентификатор сообщения: ${JSON.stringify(data)}`);
    }
    return { externalId: messageId };
  }

  async probe(channel: ChannelKind, phone: DigitsPhone): Promise<ProbeResult> {
    const channelId = this.config.channelIds[channel];
    if (!channelId) {
      return { available: false, reason: `Канал ${channel} не настроен в настройках интеграций` };
    }

    let channels: ChannelRow[];
    try {
      channels = await this.listChannels();
    } catch (error) {
      // Сбой обращения — не приговор каналу клиента: ответ помечаем неразрешающим.
      return {
        available: false,
        inconclusive: true,
        reason: `Список каналов Wazzup не получен: ${this.reason(error)}`,
      };
    }

    const row = channels.find((c) => c.channelId === channelId);
    if (!row) {
      return {
        available: false,
        inconclusive: true,
        reason: 'Канал не найден среди подключённых в Wazzup — проверьте ID канала',
      };
    }
    if (row.state !== 'active') {
      const label = STATE_LABELS[row.state] ?? row.state;
      return { available: false, reason: `Канал Wazzup ${channel.toLowerCase()}: ${label}` };
    }

    return {
      available: false,
      inconclusive: true,
      externalId: phone,
      reason: 'Wazzup не проверяет регистрацию номера — канал подтвердится первым входящим сообщением',
    };
  }

  /** Состояния всех подключённых каналов: реестр отбирает из них наши ID. */
  async channelStates(): Promise<ChannelState[]> {
    const rows = await this.listChannels();
    return rows.map(({ channelId, state }) => ({ channelId, state }));
  }

  /**
   * Ключ доступа в query строке (`?key=...`) — адрес вебхука настраиваем мы,
   * и это единственный способ проверить, что событие от нашего аккаунта.
   * Заголовок Authorization: Bearer провайдер добавляет, только если у него
   * есть наш crmKey, поэтому он опционален.
   */
  verifyWebhookAuth(ctx: WebhookContext): boolean {
    const secret = this.config.webhookSecret;
    if (!secret) return false;

    const bearer = str(ctx.headers['authorization']);
    const given = [str(ctx.query?.key), bearer.replace(/^Bearer\s+/i, '')];
    return given.some((value) => value && constantTimeEquals(secret, value));
  }

  async parseWebhook(ctx: WebhookContext): Promise<Array<InboundEvent | StatusEvent>> {
    const body = asRecord(ctx.body);
    if (!body) return [];
    // Проверочный POST при подключении вебхуков: событий в нём нет.
    if (body.test === true) return [];

    const events: Array<InboundEvent | StatusEvent> = [];
    for (const item of array(body.messages)) {
      const event = this.inboundEvent(asRecord(item));
      if (event) events.push(event);
    }
    for (const item of array(body.statuses)) {
      const event = this.statusEvent(asRecord(item));
      if (event) events.push(event);
    }
    return events;
  }

  private inboundEvent(message: Record<string, unknown> | null): InboundEvent | null {
    if (!message) return null;

    const chatType = str(message.chatType).toLowerCase();
    const channel = CHANNEL_BY_CHAT_TYPE[chatType];
    if (channel === undefined) {
      this.logger.warn(`Вебхук Wazzup с незнакомым chatType: ${chatType || 'пустой'}`);
      return null;
    }
    if (channel === null) return null;

    const externalId = str(message.messageId);
    if (!externalId) return null;

    const contact = asRecord(message.contact);
    const chatId = str(message.chatId);
    const fromStaff = message.isEcho === true;
    if (!fromStaff && !chatId && !str(contact?.phone)) return null;

    const text = this.messageText(message);
    if (!text) return null;

    return {
      externalId,
      channel,
      from: str(contact?.phone),
      chatId: chatId || undefined,
      contactName: fromStaff ? undefined : displayName(contact),
      text,
      at: parseAt(str(message.dateTime)),
      fromStaff,
      authorName: fromStaff ? str(message.authorName) || undefined : undefined,
    };
  }

  private statusEvent(status: Record<string, unknown> | null): StatusEvent | null {
    if (!status) return null;
    const externalId = str(status.messageId);
    if (!externalId) return null;

    const incoming = str(status.status).toLowerCase();
    const mapped = STATUS_MAP[incoming];
    if (mapped === undefined) {
      this.logger.warn(`Вебхук Wazzup со статусом вне списка: ${incoming || 'пустой'}`);
      return null;
    }
    if (mapped === null) return null;

    const error = asRecord(status.error);
    return {
      externalId,
      status: mapped,
      errorText:
        mapped === 'failed' ? str(error?.description) || str(error?.error) || undefined : undefined,
    };
  }

  /**
   * Текст у Wazzup есть не всегда: картинка, голосовая, документ приезжают с
   * contentUri. Ссылку показываем как есть — другого способа открыть вложение
   * из нашей ленты нет, а молча выбросить сообщение значит потерять обращение.
   */
  private messageText(message: Record<string, unknown>): string {
    const text = str(message.text);
    if (text) return text;
    const contentUri = str(message.contentUri);
    if (contentUri) return `[${str(message.type) || 'вложение'}] ${contentUri}`;
    return '';
  }

  /**
   * WhatsApp адресуется номером как chatId. У Telegram и MAX идентификатор
   * собеседника — свой, и номер провайдер принимает только через phone.
   */
  private recipientParams(channel: ChannelKind, to: string): Record<string, string> {
    const isPhone = /^\d{10,15}$/.test(to);
    if (channel === ChannelKind.WHATSAPP) return { chatId: to };
    return isPhone ? { phone: to } : { chatId: to };
  }

  private async listChannels(): Promise<ChannelRow[]> {
    if (this.channelsCache) return this.channelsCache;

    const data = await this.request<unknown[]>('GET', CHANNELS_PATH);
    const rows = array(data).map((item) => {
      const row = asRecord(item);
      return {
        channelId: str(row?.channelId),
        transport: str(row?.transport),
        plainId: str(row?.plainId),
        state: str(row?.state),
      };
    });
    this.channelsCache = rows;
    return rows;
  }

  private async request<T = Record<string, unknown> | null>(
    method: 'GET' | 'POST',
    path: string,
    payload?: unknown,
  ): Promise<T> {
    const url = `${this.config.apiBaseUrl.replace(/\/+$/, '')}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new Error(`Wazzup ${response.status}: ${text.slice(0, 300)}`);
    }
    return data as T;
  }

  private reason(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
