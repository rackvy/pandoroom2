import { Injectable, Logger } from '@nestjs/common';
import { IntegrationsService } from '../integrations/integrations.service';
import { PrismaService } from '../prisma/prisma.service';
import { ZvonokDeliveryError, extractError } from './zvonok-error';

/** V1 работает на хосте zvonok.com и авторизуется по public_key в параметрах. */
const V1_BASE = 'https://zvonok.com/manager/cabapi_external/api/v1';

/**
 * Оператор 700 в РФ не выдан, поэтому Zvonok отбраковывает номер на валидации
 * и звонок не создаётся. Правдоподобный мобильный здесь ставить нельзя:
 * 8999… провайдер нормализует в +7999… и реально звонит.
 */
const PROBE_PHONE = '+70001234567';

const CAMPAIGN_TYPE_HINT =
  'В кабинете Zvonok создайте кампанию типа «Диктовка кода роботом» и впишите её ID сюда.';

export interface ZvonokConfig {
  publicKey?: string;
  apiV2Key?: string;
  callCampaignId?: string;
  smsCampaignId?: string;
}

export interface SendCodeResult {
  /** Код, который продиктует робот. */
  pincode: string;
  callId: string | null;
}

export interface CampaignSummary {
  id: string;
  name: string;
  type: string | null;
  isActive: boolean | null;
}

export interface CampaignCheck {
  status: 'ok' | 'invalid-type' | 'missing' | 'auth' | 'unavailable' | 'skipped';
  message: string | null;
}

@Injectable()
export class ZvonokService {
  private readonly logger = new Logger(ZvonokService.name);

  constructor(
    private integrations: IntegrationsService,
    private prisma: PrismaService,
  ) {}

  async config(): Promise<ZvonokConfig> {
    return (await this.integrations.values('zvonok')) as ZvonokConfig;
  }

  /** Звонок с диктовкой кода (кампания типа «Диктовка кода роботом»). */
  async sendCodeByCall(phone: string): Promise<SendCodeResult> {
    const cfg = await this.requireCallConfig();

    // pincode не передаём: Zvonok генерирует код под длину, заданную в кампании,
    // и возвращает его в ответе — хэшируем именно то, что услышит гость.
    const payload = await this.post('phones/tellcode/', {
      public_key: cfg.publicKey,
      campaign_id: cfg.callCampaignId,
      phone,
    });

    const data = payload?.data ?? {};
    const pincode = data.pincode ? String(data.pincode) : '';
    if (!pincode) {
      throw new ZvonokDeliveryError(
        'no-code',
        'Zvonok принял звонок, но не вернул код для проверки',
      );
    }

    return {
      pincode,
      callId: data.call_id !== undefined ? String(data.call_id) : null,
    };
  }

  /**
   * СМС с кодом. Отдельного «отправить текст» метода у Zvonok нет — СМС уходит
   * как действие внутри кампании, поэтому нужен campaign с текстом-заглушкой.
   */
  async sendCodeBySms(phone: string, code: string): Promise<SendCodeResult> {
    const cfg = await this.config();
    if (!cfg.publicKey || !cfg.smsCampaignId) {
      throw new ZvonokDeliveryError('campaign-config', 'СМС-канал не настроен — код приходит звонком');
    }

    const payload = await this.post('phones/call/', {
      public_key: cfg.publicKey,
      campaign_id: cfg.smsCampaignId,
      phone,
      pincode: code,
      sms_text: `Код входа в личный кабинет: ${code}`,
    });

    const data = payload?.data ?? {};
    return {
      pincode: data.pincode ? String(data.pincode) : code,
      callId: data.call_id !== undefined ? String(data.call_id) : null,
    };
  }

  /** Баланс, список кампаний и проверка, годится ли кампания для диктовки кода. */
  async status() {
    const cfg = await this.config();
    const base = {
      configured: Boolean(cfg.publicKey && cfg.callCampaignId),
      publicKeySet: Boolean(cfg.publicKey),
      callCampaignId: cfg.callCampaignId || null,
      smsCampaignId: cfg.smsCampaignId || null,
      balance: null as string | null,
      campaigns: [] as CampaignSummary[],
      campaignCheck: { status: 'skipped', message: null } as CampaignCheck,
      error: null as string | null,
    };

    if (!cfg.publicKey) {
      base.error = 'API Public Key не задан';
      return base;
    }

    try {
      const balance = await this.get(`${V1_BASE}/users/balance/`, cfg.publicKey);
      base.balance = String(balance?.balance ?? '');

      const campaigns = await this.get(`${V1_BASE}/campaigns/`, cfg.publicKey, { mode: 'all' });
      base.campaigns = (Array.isArray(campaigns?.campaigns) ? campaigns.campaigns : []).map(
        (c: any) => ({
          id: String(c.id ?? c.campaign_id ?? ''),
          name: String(c.campaign_name ?? c.name ?? ''),
          type: c.type ? String(c.type) : c.campaign_type ? String(c.campaign_type) : null,
          isActive:
            typeof c.is_active === 'boolean'
              ? c.is_active
              : typeof c.active === 'boolean'
                ? c.active
                : null,
        }),
      );
    } catch (err) {
      base.error = err instanceof Error ? err.message : 'Zvonok недоступен';
      this.logger.warn(`Zvonok status failed: ${base.error}`);
    }

    if (!cfg.callCampaignId) {
      base.campaignCheck = {
        status: 'skipped',
        message: 'ID кампании не заполнен — код входа отправить некуда',
      };
    } else if (!base.error) {
      base.campaignCheck = await this.checkCampaign(cfg, base.campaigns);
    }

    return base;
  }

  /** Последние сбои отправки кодов — для баннера в настройках интеграций. */
  async incidents(limit = 10) {
    const incidents = await this.prisma.notificationLog.findMany({
      // Сбои доставки кода: звонок от Zvonok и запасные пути через Wazzup.
      where: { channel: { in: ['zvonok', 'wazzup'] }, status: 'failed' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, template: true, recipient: true, errorText: true, createdAt: true },
    });
    return { incidents };
  }

  private async checkCampaign(
    cfg: ZvonokConfig,
    campaigns: CampaignSummary[],
  ): Promise<CampaignCheck> {
    const known = campaigns.find((c) => c.id === cfg.callCampaignId);

    try {
      await this.post('phones/tellcode/', {
        public_key: cfg.publicKey!,
        campaign_id: cfg.callCampaignId!,
        phone: PROBE_PHONE,
      });
      return { status: 'ok', message: null };
    } catch (err) {
      if (!(err instanceof ZvonokDeliveryError)) {
        return { status: 'unavailable', message: 'Не удалось проверить кампанию в Zvonok' };
      }

      switch (err.kind) {
        case 'bad-phone':
          // Единственная придирка — тестовый номер: тип кампании подходит.
          return { status: 'ok', message: null };
        case 'auth':
          return { status: 'auth', message: 'Zvonok не принял API Public Key — проверьте ключ' };
        case 'campaign-config': {
          const missing =
            /doesn.?t exist/i.test(err.providerMessage) || (!known && campaigns.length > 0);
          const label = known ? `${known.id} «${known.name}»` : String(cfg.callCampaignId);
          return {
            status: missing ? 'missing' : 'invalid-type',
            message: missing
              ? `Кампания ${label} не найдена в кабинете Zvonok — проверьте ID.`
              : `Кампания ${label} не подходит для диктовки кода (Zvonok: ${err.providerMessage}). ${CAMPAIGN_TYPE_HINT}`,
          };
        }
        default:
          return {
            status: 'unavailable',
            message: `Не удалось проверить кампанию: ${err.providerMessage}`,
          };
      }
    }
  }

  private async requireCallConfig(): Promise<{ publicKey: string; callCampaignId: string }> {
    const cfg = await this.config();
    if (!cfg.publicKey || !cfg.callCampaignId) {
      throw new ZvonokDeliveryError(
        'campaign-config',
        'Отправка кодов не настроена — заполните Zvonok в Настройках',
      );
    }
    return { publicKey: cfg.publicKey, callCampaignId: cfg.callCampaignId };
  }

  private async post(path: string, fields: Record<string, string>): Promise<any> {
    const body = new FormData();
    for (const [key, value] of Object.entries(fields)) body.set(key, value);
    const { payload } = await this.send(`${V1_BASE}/${path}`, { method: 'POST', body });
    return payload;
  }

  private async get(
    url: string,
    publicKey: string,
    extra?: Record<string, string>,
  ): Promise<any> {
    const query = new URLSearchParams({ public_key: publicKey, ...extra });
    const { payload } = await this.send(`${url}?${query.toString()}`);
    return payload;
  }

  private async send(url: string, init?: RequestInit): Promise<{ payload: any; status: number }> {
    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new ZvonokDeliveryError('unknown', `Zvonok недоступен: ${reason}`);
    }

    const { payload, raw } = await this.readBody(response);
    const failure = extractError(payload, raw, response.status);
    if (failure) {
      this.logger.warn(
        `Zvonok ${this.redact(url)} → ${failure.kind}: ${failure.message}`,
      );
      throw new ZvonokDeliveryError(failure.kind, failure.message, response.status);
    }

    return { payload, status: response.status };
  }

  private async readBody(response: Response): Promise<{ payload: any; raw: string }> {
    const text = await response.text();
    if (!text) return { payload: null, raw: '' };
    try {
      return { payload: JSON.parse(text), raw: text.slice(0, 500) };
    } catch {
      // Zvonok отдаёт HTML-страницу и при 429, и при ошибке авторизации
      return { payload: { raw: text.slice(0, 500) }, raw: text.slice(0, 500) };
    }
  }

  private redact(url: string): string {
    return url.replace(/(public_key=)[^&]+/i, '$1***');
  }
}
