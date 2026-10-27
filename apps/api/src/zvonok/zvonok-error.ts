export type ZvonokErrorKind =
  | 'bad-phone'
  | 'campaign-config'
  | 'auth'
  | 'rate-limit'
  | 'no-code'
  | 'unknown';

export class ZvonokDeliveryError extends Error {
  readonly kind: ZvonokErrorKind;
  readonly providerMessage: string;
  readonly httpStatus: number | null;

  constructor(kind: ZvonokErrorKind, providerMessage: string, httpStatus: number | null = null) {
    super(providerMessage);
    this.name = 'ZvonokDeliveryError';
    this.kind = kind;
    this.providerMessage = providerMessage;
    this.httpStatus = httpStatus;
  }
}

const ENTITIES: Record<string, string> = {
  '&#x27;': "'",
  '&#39;': "'",
  '&quot;': '"',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
};

/** Zvonok отдаёт текст ошибки в HTML-экранировании. */
export function decodeEntities(text: string): string {
  return text.replace(/&#x27;|&#39;|&quot;|&amp;|&lt;|&gt;|&nbsp;/g, (m) => ENTITIES[m] ?? m);
}

const CAMPAIGN_MARKERS = [
  'invalid campaign type',
  "campaign doesn't exist",
  'campaign does not exist',
  "campaign doesn't support adding via api",
  'campaign does not support adding via api',
  'pincode length',
];

/**
 * Провайдер перечисляет все проблемы разом, например
 * «* No valid phone * campaign_id * Invalid campaign type» — конфиг кампании
 * важнее жалобы на номер, иначе админ будет искать причину не там.
 */
export function classify(providerMessage: string, httpStatus: number | null): ZvonokErrorKind {
  const text = providerMessage.toLowerCase();
  if (httpStatus === 401 || text.includes('user not found')) return 'auth';
  if (httpStatus === 429 || text.includes('too many')) return 'rate-limit';
  if (CAMPAIGN_MARKERS.some((marker) => text.includes(marker))) return 'campaign-config';
  if (text.includes('no valid phone')) return 'bad-phone';
  return 'unknown';
}

export interface ZvonokFailure {
  kind: ZvonokErrorKind;
  message: string;
}

/**
 * Разбирает тело ответа Zvonok в любом из видов: успех, конверт
 * {status:'error', data}, ошибка в error/message/detail, HTML вместо JSON.
 */
export function extractError(
  payload: any,
  raw: string,
  status: number,
): ZvonokFailure | null {
  if (!payload) {
    if (status >= 400) return { kind: classify('', status), message: `HTTP ${status}` };
    return null;
  }

  if (payload.status === 'error' || payload.status === 'fail') {
    const data = payload.data;
    const text =
      typeof data === 'string'
        ? data
        : data
          ? JSON.stringify(data)
          : String(payload.message ?? `HTTP ${status}`);
    const message = decodeEntities(text).trim();
    return { kind: classify(message, status), message };
  }

  const rawError = payload.error ?? payload.message ?? payload.detail ?? payload.description;
  if (rawError) {
    const text = typeof rawError === 'string' ? rawError : JSON.stringify(rawError);
    const message = decodeEntities(text).trim();
    return { kind: classify(message, status), message };
  }

  if (status >= 400) {
    const message = typeof payload.raw === 'string' ? decodeEntities(payload.raw).trim() : `HTTP ${status}`;
    return { kind: classify(message, status), message };
  }

  if (typeof payload.status === 'string' && payload.status !== 'ok') {
    return { kind: 'unknown', message: payload.status };
  }

  return null;
}
