import { Injectable, Logger } from '@nestjs/common';
import { ChannelKind } from '@prisma/client';
import { IntegrationsService } from '../integrations.service';
import { ChannelConfig, ChannelDriver } from './channel-driver.interface';
import { StubDriver } from './stub.driver';
import { WazzupDriver } from './wazzup.driver';

/**
 * Выбор драйвера по конфигурации. Боевой режим включается сам, когда заданы
 * адрес и ключ, — отдельного переключателя, которое можно забыть включить,
 * нет. Без ключа работает заглушка, и это видно и в логе, и в интерфейсе.
 */
@Injectable()
export class ChannelRegistry {
  private readonly logger = new Logger(ChannelRegistry.name);
  private warnedStub = false;

  constructor(private readonly integrations: IntegrationsService) {}

  async config(): Promise<ChannelConfig> {
    const values = await this.integrations.values('wazzup');
    const channelIds: Partial<Record<ChannelKind, string>> = {};
    if (values.whatsappChannelId) channelIds[ChannelKind.WHATSAPP] = values.whatsappChannelId;
    if (values.telegramChannelId) channelIds[ChannelKind.TELEGRAM] = values.telegramChannelId;
    if (values.maxChannelId) channelIds[ChannelKind.MAX] = values.maxChannelId;

    return {
      apiBaseUrl: values.apiBaseUrl || '',
      apiKey: values.apiKey || '',
      webhookSecret: values.webhookSecret || '',
      driverMode: (values.driverMode || '').trim().toLowerCase(),
      channelIds,
      probePath: values.probePath || '',
      stubFailPhone: values.stubFailPhone || '',
    };
  }

  async driver(): Promise<ChannelDriver> {
    const config = await this.config();
    if (this.isLive(config)) return new WazzupDriver(config);
    if (!this.warnedStub) {
      this.warnedStub = true;
      this.logger.warn(`Каналы работают в режиме заглушки: ${this.stubReason(config)}`);
    }
    return new StubDriver(config);
  }

  /** Чем именно сейчас отправляем — нужно интерфейсу, чтобы не выдавать заглушку за работу. */
  async mode(): Promise<{ kind: 'wazzup' | 'stub'; reason: string }> {
    const config = await this.config();
    if (this.isLive(config)) return { kind: 'wazzup', reason: 'Боевой драйвер' };
    return { kind: 'stub', reason: this.stubReason(config) };
  }

  /** Секрет наружу не отдаём, но он нужен и для подписи фикстуры. */
  async webhookSecret(): Promise<string> {
    return (await this.config()).webhookSecret;
  }

  /** Без секрета вебхук принимать нечем: отличаем «не настроен» от «подпись неверна». */
  async webhookSecretConfigured(): Promise<boolean> {
    return Boolean(await this.webhookSecret());
  }

  private isLive(config: ChannelConfig): boolean {
    return config.driverMode !== 'stub' && Boolean(config.apiBaseUrl) && Boolean(config.apiKey);
  }

  private stubReason(config: ChannelConfig): string {
    if (config.driverMode === 'stub') return 'Драйвер вручную переведён в режим stub';
    if (!config.apiBaseUrl) return 'Не задан URL API — отправка и проверка номера имитируются';
    return 'Не задан ключ API — отправка и проверка номера имитируются';
  }
}
