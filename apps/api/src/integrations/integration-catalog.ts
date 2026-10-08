import { BadRequestException, Injectable } from '@nestjs/common';

export type IntegrationProviderId =
  | 'tbank'
  | 'zvonok'
  | 'wazzup'
  | 'yandex_disk'
  | 'google_calendar';

export interface IntegrationFieldDef {
  key: string;
  label: string;
  /** Значение не отдаётся наружу целиком, только маска */
  secret?: boolean;
  /** Запасной источник значения, если в БД пусто */
  env?: string;
  type?: 'text' | 'textarea' | 'bool';
  hint?: string;
}

export interface IntegrationGroupDef {
  provider: IntegrationProviderId;
  label: string;
  note?: string;
  fields: IntegrationFieldDef[];
}

/**
 * Единственный разрешённый список ключей: записать в БД произвольное
 * поле нельзя, а сервисы читают конфигурацию по именам из этого каталога.
 */
export const INTEGRATIONS: IntegrationGroupDef[] = [
  {
    provider: 'tbank',
    label: 'Т-Банк эквайринг',
    note: 'Ссылка на оплату для предоплаты брони',
    fields: [
      { key: 'terminalKey', label: 'Терминал', env: 'TBANK_TERMINAL_KEY' },
      { key: 'password', label: 'Пароль', secret: true, env: 'TBANK_PASSWORD' },
      {
        key: 'apiUrl',
        label: 'URL API',
        env: 'TBANK_API_URL',
        hint: 'https://securepay.tinkoff.ru/v2',
      },
      {
        key: 'notificationUrl',
        label: 'URL уведомлений (NotificationURL)',
        env: 'PAYMENT_WEBHOOK_URL',
        hint: 'https://pandoroom-back.e-rma.ru/api/payments/webhook',
      },
      { key: 'successUrl', label: 'URL успешной оплаты', env: 'PAYMENT_SUCCESS_URL' },
      { key: 'failUrl', label: 'URL ошибки оплаты', env: 'PAYMENT_FAIL_URL' },
    ],
  },
  {
    provider: 'zvonok',
    label: 'Zvonok',
    note: 'Код входа в личный кабинет: звонок или СМС',
    fields: [
      { key: 'publicKey', label: 'API Public Key', secret: true, env: 'ZVONOK_PUBLIC_KEY' },
      { key: 'apiV2Key', label: 'APIv2 Key', secret: true, env: 'ZVONOK_API_V2_KEY' },
      {
        key: 'callCampaignId',
        label: 'ID кампании «Диктовка кода роботом»',
        env: 'ZVONOK_CALL_CAMPAIGN_ID',
      },
      {
        key: 'smsCampaignId',
        label: 'ID кампании для СМС',
        env: 'ZVONOK_SMS_CAMPAIGN_ID',
        hint: 'Пусто — вход только звонком',
      },
    ],
  },
  {
    provider: 'wazzup',
    label: 'Wazzup',
    note: 'WhatsApp, Telegram и MAX одним коннектором: входящие и исходящие переписки',
    fields: [
      {
        key: 'apiBaseUrl',
        label: 'URL API',
        env: 'WAZZUP_API_URL',
        hint: 'https://wazzup.me/api',
      },
      { key: 'apiKey', label: 'Ключ API', secret: true, env: 'WAZZUP_API_KEY' },
      {
        key: 'webhookSecret',
        label: 'Секрет подписи вебхука',
        secret: true,
        env: 'WAZZUP_WEBHOOK_SECRET',
        hint: 'HMAC-SHA256 от сырого тела, заголовок x-wazzup-signature',
      },
      {
        key: 'whatsappChannelId',
        label: 'ID канала WhatsApp',
        env: 'WAZZUP_WHATSAPP_CHANNEL_ID',
      },
      {
        key: 'telegramChannelId',
        label: 'ID канала Telegram',
        env: 'WAZZUP_TELEGRAM_CHANNEL_ID',
      },
      { key: 'maxChannelId', label: 'ID канала MAX', env: 'WAZZUP_MAX_CHANNEL_ID' },
      {
        key: 'probePath',
        label: 'Путь проверки номера',
        env: 'WAZZUP_PROBE_PATH',
        hint: 'Сверить с документацией аккаунта — фаза 6',
      },
      {
        key: 'driverMode',
        label: 'Драйвер',
        env: 'WAZZUP_DRIVER_MODE',
        hint: 'wazzup — боевой, stub — тестовый без ключа',
      },
      {
        key: 'stubFailPhone',
        label: 'Телефон для ошибки (только stub)',
        env: 'WAZZUP_STUB_FAIL_PHONE',
        hint: 'Отправка на этот номер возвращает FAILED',
      },
    ],
  },
  {
    provider: 'yandex_disk',
    label: 'Яндекс.Диск',
    note: 'Пока только хранилище: выгрузка файлов не подключена',
    fields: [
      { key: 'token', label: 'OAuth-токен', secret: true, env: 'YANDEX_DISK_TOKEN' },
      { key: 'directory', label: 'Папка', env: 'YANDEX_DISK_DIRECTORY' },
      { key: 'publicBaseUrl', label: 'Публичный базовый URL', env: 'YANDEX_DISK_PUBLIC_URL' },
    ],
  },
  {
    provider: 'google_calendar',
    label: 'Google Календарь',
    note: 'Синхронизация броней сейчас работает в режиме заглушки',
    fields: [
      { key: 'enabled', label: 'Синхронизация включена', type: 'bool', env: 'GOOGLE_CALENDAR_ENABLED' },
      { key: 'calendarId', label: 'ID календаря', env: 'GOOGLE_CALENDAR_ID' },
      {
        key: 'serviceAccountKeyPath',
        label: 'Путь к ключу сервисного аккаунта',
        env: 'GOOGLE_SERVICE_ACCOUNT_KEY_PATH',
      },
      {
        key: 'serviceAccountJson',
        label: 'JSON сервисного аккаунта',
        secret: true,
        type: 'textarea',
        env: 'GOOGLE_SERVICE_ACCOUNT_JSON',
      },
    ],
  },
];

export interface IntegrationFieldView {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'bool';
  hint?: string;
  isSecret: boolean;
  /** Откуда берётся действующее значение */
  source: 'db' | 'env' | 'none';
  /** Для секретов — маска, для остальных — реальное значение */
  value: string;
  /** Длина секретного значения, чтобы понять «тот ли ключ» без раскрытия */
  secretLength: number | null;
}

export interface IntegrationGroupView {
  provider: IntegrationProviderId;
  label: string;
  note?: string;
  fields: IntegrationFieldView[];
}

const MASK = '••••';

export function maskSecret(value: string): string {
  if (!value) return '';
  return value.length <= 4 ? MASK : `${MASK}${value.slice(-4)}`;
}

export function isMaskedValue(value: string): boolean {
  return value.includes(MASK);
}

export function findGroup(provider: string): IntegrationGroupDef {
  const group = INTEGRATIONS.find((g) => g.provider === provider);
  if (!group) {
    throw new BadRequestException(`Неизвестная интеграция: ${provider}`);
  }
  return group;
}
