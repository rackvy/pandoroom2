/**
 * Самопроверка разбора ответов Zvonok: без ключей и без сети.
 * node apps/api/scripts/zvonok.check.mts
 */
import { classify, decodeEntities, extractError } from '../src/zvonok/zvonok-error.ts';

let failures = 0;

function eq(name: string, got: unknown, want: unknown): void {
  if (got === want) return;
  failures++;
  console.error(`FAIL ${name}: получено ${JSON.stringify(got)}, ожидалось ${JSON.stringify(want)}`);
}

function ok(name: string, condition: boolean): void {
  if (condition) return;
  failures++;
  console.error(`FAIL ${name}`);
}

// --- конверт {status:'error', data} — то, из-за чего раньше терялся текст ---
const phoneOnly = extractError(
  { status: 'error', data: "Form isn't valid: * phone\n  * No valid phone" },
  '',
  400,
);
eq('номер: тип', phoneOnly?.kind, 'bad-phone');
eq('номер: текст', phoneOnly?.message, "Form isn't valid: * phone\n  * No valid phone");

const wrongCampaign = extractError(
  {
    status: 'error',
    data: "Form isn't valid: * phone\n  * No valid phone\n* campaign_id\n  * Invalid campaign type",
  },
  '',
  400,
);
eq('кампания важнее номера', wrongCampaign?.kind, 'campaign-config');
ok('кампания: текст сохранён', (wrongCampaign?.message || '').includes('Invalid campaign type'));

const missingCampaign = extractError(
  { status: 'error', data: 'Form isn&#x27;t valid: * campaign_id\n  * Campaign doesn&#x27;t exist' },
  '',
  400,
);
eq('кампании нет: тип', missingCampaign?.kind, 'campaign-config');
ok('HTML-сущности раскодированы', !(missingCampaign?.message || '').includes('&#x27;'));
eq('апостроф раскодирован', decodeEntities('doesn&#x27;t'), "doesn't");

// --- авторизация и лимиты ---
const badKey = extractError({ status: 'error', data: 'User not found' }, '', 401);
eq('неверный ключ', badKey?.kind, 'auth');

const throttled = extractError({ raw: '<html><body>429 Too Many Requests</body></html>' }, '', 429);
eq('429 по статусу', throttled?.kind, 'rate-limit');

const emptyBody = extractError(null, '', 400);
eq('пустое тело: тип', emptyBody?.kind, 'unknown');
eq('пустое тело: текст', emptyBody?.message, 'HTTP 400');

const noData = extractError({ status: 'error' }, '', 400);
eq('конверт без data: текст', noData?.message, 'HTTP 400');

const configError = extractError({ status: 'error', data: 'Pincode length must be equal to 4' }, '', 400);
eq('длина кода — это конфиг кампании', configError?.kind, 'campaign-config');

// --- успешные ответы не считаем ошибкой ---
eq(
  'успех tellcode',
  extractError({ status: 'ok', data: { pincode: '1234', call_id: 42 } }, '', 200),
  null,
);
eq('баланс', extractError({ balance: '1100.000000' }, '', 200), null);
eq('пустой ответ 200', extractError(null, '', 200), null);

// --- классификатор напрямую ---
eq('классификатор: номер', classify('no valid phone', 400), 'bad-phone');
eq('классификатор: 429', classify('', 429), 'rate-limit');
eq('классификатор: незнакомое', classify('something else', 502), 'unknown');

if (failures === 0) {
  console.log('OK: разбор ответов Zvonok');
} else {
  console.error(`${failures} проверок провалилось`);
  process.exitCode = 1;
}
