/**
 * Подключение боевого Wazzup: показывает каналы аккаунта, регистрирует адрес
 * вебхуков и пробует отправить сообщение. Ключ аккаунта берётся из настроек в
 * БД (или из WAZZUP_API_KEY) и в вывод не попадает.
 *
 * Прогон с сервера, где стоит БД:
 *   node --env-file=.env scripts/wazzup-connect.mts check
 *   node --env-file=.env scripts/wazzup-connect.mts webhooks --public https://pandoroom-back.e-rma.ru
 *   node --env-file=.env scripts/wazzup-connect.mts send --channel <channelId> --to 79000000001 --text 'проверка'
 *
 * Команда webhooks собирает адрес с ключом доступа (?key=...) — по нему наш
 * приёмник узнаёт провайдера: подписи у вебхуков Wazzup нет.
 */
import { PrismaClient } from '@prisma/client';

const DEFAULT_BASE = 'https://api.wazzup24.com';

type Flags = Record<string, string | boolean>;

function parseArgs(argv: string[]): { command: string; flags: Flags } {
  const [command = 'check', ...rest] = argv;
  const flags: Flags = {};
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith('--')) continue;
    const name = token.slice(2);
    const next = rest[i + 1];
    if (next && !next.startsWith('--')) {
      flags[name] = next;
      i += 1;
    } else {
      flags[name] = true;
    }
  }
  return { command, flags };
}

async function settings(): Promise<{ base: string; apiKey: string; webhookKey: string }> {
  const prisma = new PrismaClient();
  const rows = await prisma.integrationSetting.findMany({ where: { provider: 'wazzup' } });
  await prisma.$disconnect();

  const byKey = new Map(rows.map((row) => [row.key, row.value.trim()]));
  const pick = (key: string, env: string) => byKey.get(key) || process.env[env] || '';

  return {
    base: (pick('apiBaseUrl', 'WAZZUP_API_URL') || DEFAULT_BASE).replace(/\/+$/, ''),
    apiKey: pick('apiKey', 'WAZZUP_API_KEY'),
    webhookKey: pick('webhookSecret', 'WAZZUP_WEBHOOK_SECRET'),
  };
}

function mask(value: string): string {
  if (value.length <= 4) return '•'.repeat(value.length);
  return `••••${value.slice(-4)} (длина ${value.length})`;
}

async function call(
  base: string,
  apiKey: string,
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  payload?: unknown,
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

function show(result: { status: number; body: unknown }): void {
  console.log(`HTTP ${result.status}`);
  console.log(JSON.stringify(result.body, null, 2));
}

const { command, flags } = parseArgs(process.argv.slice(2));
const { base, apiKey, webhookKey } = await settings();

if (!apiKey) {
  console.error(
    'Ключ API не найден: заполните поле «Ключ API» в настройках интеграций Wazzup или WAZZUP_API_KEY',
  );
  process.exit(1);
}

console.log(`Аккаунт: ${base}, ключ ${mask(apiKey)}\n`);

if (command === 'check') {
  const channels = await call(base, apiKey, 'GET', '/v3/channels');
  console.log('Каналы (ID канала вставлять в настройки интеграций):');
  show(channels);
  const webhooks = await call(base, apiKey, 'GET', '/v3/webhooks');
  console.log('\nТекущий адрес вебхуков:');
  show(webhooks);
} else if (command === 'webhooks') {
  const publicUrl = typeof flags.public === 'string' ? flags.public.replace(/\/+$/, '') : '';
  if (!publicUrl) {
    console.error('Нужен публичный адрес API: --public https://pandoroom-back.e-rma.ru');
    process.exit(1);
  }
  if (!webhookKey) {
    console.error('Не задан «Ключ доступа вебхука» — собирать адрес не из чего');
    process.exit(1);
  }
  const uri = `${publicUrl}/api/webhooks/wazzup?key=${encodeURIComponent(webhookKey)}`;
  console.log(`Регистрируем: ${uri.replace(encodeURIComponent(webhookKey), '••••')}`);

  const result = await call(base, apiKey, 'PATCH', '/v3/webhooks', {
    webhooksUri: uri,
    subscriptions: { messagesAndStatuses: true, channelsUpdates: true },
  });
  show(result);
  console.log(
    '\nWazzup тут же шлёт проверочный {"test":true} и ждёт 200 — если HTTP 200, приём работает.',
  );
} else if (command === 'send') {
  const channelId = typeof flags.channel === 'string' ? flags.channel : '';
  const to = typeof flags.to === 'string' ? flags.to : '';
  const text = typeof flags.text === 'string' ? flags.text : 'Проверка подключения Wazzup';
  if (!channelId || !/^\d{10,15}$/.test(to.replace(/\D/g, ''))) {
    console.error('Нужны --channel <channelId> и --to <номер цифрами, например 79000000001>');
    process.exit(1);
  }
  const digits = to.replace(/\D/g, '');
  // WhatsApp адресуется номером как chatId; Telegram и MAX принимают phone.
  const chatType = typeof flags.chatType === 'string' ? flags.chatType : 'whatsapp';
  const payload =
    chatType === 'whatsapp' || chatType === 'viber'
      ? { channelId, chatType, chatId: digits, text }
      : { channelId, chatType, phone: digits, text };

  const result = await call(base, apiKey, 'POST', '/v3/message', payload);
  show(result);
  console.log('\nОтвет должен прийти вебхуком — сообщение встаёт в ленту, канал отмечается доступным.');
} else {
  console.error(`Неизвестная команда: ${command}. Доступны check, webhooks, send.`);
  process.exit(1);
}
