import { Logger } from '@nestjs/common';
import { ChannelKind } from '@prisma/client';
import {
  ChannelConfig,
  DigitsPhone,
  InboundEvent,
  ProbeResult,
  StatusEvent,
  WebhookContext,
  ChannelDriver,
} from './channel-driver.interface';
import { signWebhookBody, verifySignature } from './signature';

/**
 * ПУТИ НЕ ПОДТВЕРЖДЕНЫ. Точных путей отправки и проверки номера в открытом
 * описании Wazzup найти не удалось, а прямой доступ к документации закрыт.
 * Здесь контракт, зафиксированный нашими фикстурами, — в фазе 6 он сверяется
 * с реальным аккаунтом, и расхождение правится в этом файле и в фикстурах.
 */
const SEND_PATH = '/messages/send';
const REQUEST_TIMEOUT_MS = 8000;

const STATUS_MAP: Record<string, StatusEvent['status']> = {
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  failed: 'failed',
  error: 'failed',
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export class WazzupDriver implements ChannelDriver {
  readonly kind = 'wazzup' as const;
  private readonly logger = new Logger(WazzupDriver.name);

  constructor(private readonly config: ChannelConfig) {}

  async send(channel: ChannelKind, to: DigitsPhone, text: string): Promise<{ externalId: string }> {
    const channelId = this.config.channelIds[channel];
    if (!channelId) {
      throw new Error(`Для канала ${channel} не задан идентификатор экземпляра в настройках Wazzup`);
    }

    const data = await this.request(SEND_PATH, { channelId, to, text });
    const externalId = str(data?.externalId) || str(data?.id);
    if (!externalId) {
      throw new Error(`Wazzup не вернул идентификатор сообщения: ${JSON.stringify(data)}`);
    }
    return { externalId };
  }

  async probe(channel: ChannelKind, phone: DigitsPhone): Promise<ProbeResult> {
    if (!this.config.probePath) {
      return { available: false, reason: 'Путь проверки номера не настроен' };
    }
    const channelId = this.config.channelIds[channel];
    if (!channelId) {
      return { available: false, reason: `Канал ${channel} не настроен` };
    }

    const data = await this.request(this.config.probePath, { channelId, phone });
    const available = Boolean(data?.available ?? data?.exists ?? data?.isRegistered);
    return {
      available,
      externalId: str(data?.externalId) || phone,
      reason: available ? undefined : str(data?.reason) || 'Провайдер не подтвердил номер',
    };
  }

  verifyWebhookSignature(ctx: WebhookContext, header: string | undefined): boolean {
    if (!this.config.webhookSecret) return false;
    if (!header) return false;
    return verifySignature(this.config.webhookSecret, ctx.rawBody, header);
  }

  /** Секрет наружу не отдаём, но подпись для фикстуры собрать нужно. */
  sign(rawBody: Buffer): string {
    return signWebhookBody(this.config.webhookSecret, rawBody);
  }

  async parseWebhook(ctx: WebhookContext): Promise<Array<InboundEvent | StatusEvent>> {
    const body = asRecord(ctx.body);
    if (!body) return [];

    const channel = this.channelByInstanceId(str(body.channelId));
    if (!channel) {
      this.logger.warn(`Вебхук Wazzup с незнакомым экземпляром канала: ${str(body.channelId)}`);
      return [];
    }

    if (body.event === 'message.status') {
      const status = STATUS_MAP[str(body.status)];
      const externalId = str(body.externalId);
      if (!status || !externalId) return [];
      return [{ externalId, channel, status, errorText: str(body.errorText) || undefined }];
    }

    if (body.event !== 'message.created' || str(body.direction) !== 'incoming') {
      return [];
    }

    const contact = asRecord(body.contact);
    const message = asRecord(body.message);
    const externalId = str(body.externalId);
    const from = str(contact?.phone);
    const text = str(message?.text);
    if (!externalId || !from || !text) return [];

    const at = str(message?.createdAt) ? new Date(str(message?.createdAt)) : undefined;
    const inbound: InboundEvent = {
      externalId,
      channel,
      from,
      contactName: str(contact?.name) || undefined,
      text,
      at: at && !Number.isNaN(at.getTime()) ? at : undefined,
    };
    return [inbound];
  }

  private channelByInstanceId(instanceId: string): ChannelKind | null {
    if (!instanceId) return null;
    const entry = (Object.keys(this.config.channelIds) as ChannelKind[]).find(
      (kind) => this.config.channelIds[kind] === instanceId,
    );
    return entry ?? null;
  }

  private async request(path: string, payload: unknown): Promise<Record<string, unknown> | null> {
    const url = `${this.config.apiBaseUrl.replace(/\/+$/, '')}${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new Error(`Wazzup ${response.status}: ${text.slice(0, 300)}`);
    }
    return asRecord(data);
  }
}
