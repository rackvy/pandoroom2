import { Injectable, Logger } from '@nestjs/common';
import { ChannelKind } from '@prisma/client';
import { IntegrationsService } from '../integrations.service';
import { ChannelConfig, ChannelDriver } from './channel-driver.interface';
import { StubDriver } from './stub.driver';
import { WazzupDriver } from './wazzup.driver';

/** Снимок доступности живёт минуту: вход не должен ходить к провайдеру на каждый экран. */
const AVAILABLE_TTL_MS = 60_000;

/**
 * Кого предлагаем запасным путём кода помимо звонка. WhatsApp здесь не
 * появится, пока не будет утверждённого в Meta шаблона с кодом: свободный
 * текст незнакомому номеру WABA не пропускает.
 */
const FALLBACK_CANDIDATES: ChannelKind[] = [ChannelKind.TELEGRAM, ChannelKind.MAX];

/**
 * Выбор драйвера по конфигурации. Боевой режим включается сам, когда заданы
 * адрес и ключ, — отдельного переключателя, которое можно забыть включить,
 * нет. Без ключа работает заглушка, и это видно и в логе, и в интерфейсе.
 */
@Injectable()
export class ChannelRegistry {
  private readonly logger = new Logger(ChannelRegistry.name);
  private warnedStub = false;
  private availableCache: { fetchedAt: number; channels: ChannelKind[] } | null = null;

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

  /**
   * Куда реально можно отдать код прямо сейчас: настроенный ID и состояние
   * `active` у провайдера. Проверка по факту, а не по наличию ID: кнопку,
   * которая не доставит, показывать нельзя. В заглушке и при сбое — пусто.
   */
  async available(): Promise<ChannelKind[]> {
    if (this.availableCache && Date.now() - this.availableCache.fetchedAt < AVAILABLE_TTL_MS) {
      return this.availableCache.channels;
    }

    const config = await this.config();
    let channels: ChannelKind[] = [];
    if (this.isLive(config)) {
      try {
        const states = new Map(
          (await new WazzupDriver(config).channelStates()).map((row) => [row.channelId, row.state]),
        );
        channels = FALLBACK_CANDIDATES.filter((kind) => {
          const id = config.channelIds[kind];
          if (!id) return false;
          return states.get(id) === 'active';
        });
      } catch (error) {
        this.logger.warn(
          `Состояния каналов Wazzup не получены: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    this.availableCache = { fetchedAt: Date.now(), channels };
    return channels;
  }

  /** Чем именно сейчас отправляем — нужно интерфейсу, чтобы не выдавать заглушку за работу. */
  async mode(): Promise<{ kind: 'wazzup' | 'stub'; reason: string }> {
    const config = await this.config();
    if (this.isLive(config)) return { kind: 'wazzup', reason: 'Боевой драйвер' };
    return { kind: 'stub', reason: this.stubReason(config) };
  }

  /** Ключ доступа вебхука наружу не отдаём, но он нужен, чтобы собрать пробный запрос. */
  async webhookSecret(): Promise<string> {
    return (await this.config()).webhookSecret;
  }

  /** Без ключа сверять нечего: отличаем «не настроен» от «ключ не совпал». */
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
