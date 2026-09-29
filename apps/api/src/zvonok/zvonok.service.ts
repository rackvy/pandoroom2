import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { IntegrationsService } from '../integrations/integrations.service';

/** V1 работает на хосте zvonok.com и авторизуется по public_key в параметрах. */
const V1_BASE = 'https://zvonok.com/manager/cabapi_external/api/v1';

export interface ZvonokConfig {
  publicKey?: string;
  apiV2Key?: string;
  callCampaignId?: string;
  smsCampaignId?: string;
}

export interface SendCodeResult {
  /** Код, который продиктует робот: наш или сгенерированный Zvonok. */
  pincode: string;
  callId: string | null;
}

export interface CampaignSummary {
  id: string;
  name: string;
  type: string | null;
  isActive: boolean | null;
}

@Injectable()
export class ZvonokService {
  private readonly logger = new Logger(ZvonokService.name);

  constructor(private integrations: IntegrationsService) {}

  async config(): Promise<ZvonokConfig> {
    return (await this.integrations.values('zvonok')) as ZvonokConfig;
  }

  /** Звонок с диктовкой кода (кампания типа «Диктовка кода роботом»). */
  async sendCodeByCall(phone: string, code: string): Promise<SendCodeResult> {
    const cfg = await this.config();
    if (!cfg.publicKey || !cfg.callCampaignId) {
      throw new BadRequestException('Отправка кодов не настроена — заполните Zvonok в Настройках');
    }
    return this.requestCode(`${V1_BASE}/phones/tellcode/`, {
      publicKey: cfg.publicKey,
      campaignId: cfg.callCampaignId,
      phone,
      code,
    });
  }

  /**
   * СМС с кодом. Отдельного «отправить текст» метода у Zvonok нет — СМС уходит
   * как действие внутри кампании, поэтому нужен campaign с текстом-заглушкой.
   */
  async sendCodeBySms(phone: string, code: string): Promise<SendCodeResult> {
    const cfg = await this.config();
    if (!cfg.publicKey || !cfg.smsCampaignId) {
      throw new BadRequestException('СМС-канал не настроен — код приходит звонком');
    }
    return this.requestCode(`${V1_BASE}/phones/call/`, {
      publicKey: cfg.publicKey,
      campaignId: cfg.smsCampaignId,
      phone,
      code,
      extra: { sms_text: `Код входа в личный кабинет: ${code}` },
    });
  }

  /** Баланс и список кампаний — для кнопки «Проверить» в админке. */
  async status() {
    const cfg = await this.config();
    const base = {
      configured: Boolean(cfg.publicKey && cfg.callCampaignId),
      publicKeySet: Boolean(cfg.publicKey),
      callCampaignId: cfg.callCampaignId || null,
      smsCampaignId: cfg.smsCampaignId || null,
      balance: null as string | null,
      campaigns: [] as CampaignSummary[],
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

    return base;
  }

  private async requestCode(
    url: string,
    params: {
      publicKey: string;
      campaignId: string;
      phone: string;
      code: string;
      extra?: Record<string, string>;
    },
  ): Promise<SendCodeResult> {
    const body = new FormData();
    body.set('public_key', params.publicKey);
    body.set('campaign_id', params.campaignId);
    body.set('phone', params.phone);
    body.set('pincode', params.code);
    for (const [key, value] of Object.entries(params.extra || {})) {
      body.set(key, value);
    }

    const response = await fetch(url, { method: 'POST', body });
    const payload = await this.readJson(response);
    const error = this.pickError(payload, response.status);

    if (error) {
      this.logger.warn(`Zvonok ${url} rejected the request: ${error}`);
      throw new BadRequestException(`Zvonok: ${error}`);
    }

    const data = payload?.data ?? {};
    return {
      pincode: data.pincode ? String(data.pincode) : params.code,
      callId: data.call_id !== undefined ? String(data.call_id) : null,
    };
  }

  private async get(
    url: string,
    publicKey: string,
    extra?: Record<string, string>,
  ): Promise<any> {
    const query = new URLSearchParams({ public_key: publicKey, ...extra });
    const response = await fetch(`${url}?${query.toString()}`);
    const payload = await this.readJson(response);
    const error = this.pickError(payload, response.status);
    if (error) throw new Error(error);
    return payload;
  }

  private async readJson(response: Response): Promise<any> {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      // Zvonok отдаёт HTML-страницу и при 429, и при ошибке авторизации
      return { raw: text.slice(0, 200) };
    }
  }

  private pickError(payload: any, status: number): string | null {
    if (status === 429) return 'слишком много запросов, повторите позже';
    if (!payload) return status >= 400 ? `HTTP ${status}` : null;

    const raw =
      payload.error ?? payload.message ?? payload.detail ?? payload.description ?? null;
    const text = typeof raw === 'string' ? raw : raw ? JSON.stringify(raw) : null;
    if (text) return text;

    if (status >= 400) {
      return typeof payload.raw === 'string' ? payload.raw : `HTTP ${status}`;
    }
    if (typeof payload.status === 'string' && payload.status !== 'ok') {
      return payload.status;
    }
    return null;
  }
}
