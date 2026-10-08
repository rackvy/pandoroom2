import { Logger } from '@nestjs/common';
import { ChannelKind } from '@prisma/client';
import { createHash } from 'crypto';
import {
  ChannelConfig,
  ChannelDriver,
  DigitsPhone,
  InboundEvent,
  ProbeResult,
  StatusEvent,
  WebhookContext,
} from './channel-driver.interface';
import { WazzupDriver } from './wazzup.driver';

/**
 * Заглушка на случай, когда ключа провайдера ещё нет. Разбор вебхука и подпись
 * не подделываются — они общие с боевым драйвером, иначе проверка вебхука
 * доказывалась бы на коде, который в бою не участвует. Подменён только
 * транспорт наружу: отправка и проба номера.
 *
 * То, что работает заглушка, видно и в логе (`[STUB]`), и в API: `kind`
 * отдаётся клиенту, и интерфейс помечает режим как тестовый.
 */
export class StubDriver implements ChannelDriver {
  readonly kind = 'stub' as const;
  private readonly logger = new Logger(StubDriver.name);
  private readonly transport: WazzupDriver;
  private sequence = 0;

  constructor(private readonly config: ChannelConfig) {
    this.transport = new WazzupDriver(config);
  }

  async send(channel: ChannelKind, to: DigitsPhone, text: string): Promise<{ externalId: string }> {
    if (this.config.stubFailPhone && to === this.config.stubFailPhone) {
      throw new Error('Заглушка: абонент недоступен (injected failure)');
    }
    this.sequence += 1;
    const digest = createHash('sha1')
      .update(`${channel}|${to}|${text}`)
      .digest('hex')
      .slice(0, 12);
    const externalId = `stub-${digest}-${this.sequence}`;
    this.logger.log(`[STUB] ${channel} → ${to} (${externalId}): ${text}`);
    return { externalId };
  }

  async probe(channel: ChannelKind, phone: DigitsPhone): Promise<ProbeResult> {
    if (this.config.stubFailPhone && phone === this.config.stubFailPhone) {
      return { available: false, externalId: phone, reason: 'Заглушка: номер помечен недоступным' };
    }
    if (phone.length !== 11 || !phone.startsWith('7')) {
      return { available: false, reason: 'Номер не в формате 7XXXXXXXXXX' };
    }
    return { available: true, externalId: phone, reason: undefined };
  }

  verifyWebhookSignature(ctx: WebhookContext, header: string | undefined): boolean {
    return this.transport.verifyWebhookSignature(ctx, header);
  }

  parseWebhook(ctx: WebhookContext): Promise<Array<InboundEvent | StatusEvent>> {
    return this.transport.parseWebhook(ctx);
  }
}
