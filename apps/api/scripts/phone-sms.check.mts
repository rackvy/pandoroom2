/**
 * Самопроверка подстановки телефона филиала в тексты сообщений:
 * node apps/api/scripts/phone-sms.check.mts
 */
import { DEFAULT_TEMPLATES, formatPhoneForText, renderTemplate } from '../src/notifications/templates.ts';

let failures = 0;

function eq(name: string, got: unknown, want: unknown): void {
  if (got === want) return;
  failures++;
  console.error(`FAIL ${name}: получено ${JSON.stringify(got)}, ожидалось ${JSON.stringify(want)}`);
}

function contains(name: string, text: string, needle: string): void {
  if (text.includes(needle)) return;
  failures++;
  console.error(`FAIL ${name}: в тексте нет ${JSON.stringify(needle)} — ${JSON.stringify(text)}`);
}

// --- lossless-форматтер ---
eq('канон из базы', formatPhoneForText('74232022696'), '+7 (423) 202-26-96');
eq('восьёрка в начале', formatPhoneForText('84232022696'), '+7 (423) 202-26-96');
eq('маска как есть', formatPhoneForText('+7 (423) 202-26-96'), '+7 (423) 202-26-96');
eq('городские десять цифр', formatPhoneForText('4951234567'), '+7 (495) 123-45-67');
eq('добавочный не портим', formatPhoneForText('вн. 42'), 'вн. 42');
eq('короткий не портим', formatPhoneForText('202-26'), '202-26');
eq('иностранный не портим', formatPhoneForText('+1 415 555 0100'), '+1 415 555 0100');
eq('пусто', formatPhoneForText(''), '');
eq('null', formatPhoneForText(null), '');

// --- шаблоны: номер филиала всегда маской ---
const missed = renderTemplate(DEFAULT_TEMPLATES.MISSED_CALL, {
  clientName: 'Иван',
  date: '10 октября',
  branchPhone: '74232022696',
});
contains('SMS пропущенного звонка', missed, '+7 (423) 202-26-96');
eq('слитный номер не уходит в текст', /(?<![\d(-])74232022696/.test(missed), false);

const hashStyle = renderTemplate('Тел: #BRANCH_PHONE#', { '#BRANCH_PHONE#': '74232022696' });
eq('#BRANCH_PHONE# тоже маскируется', hashStyle, 'Тел: +7 (423) 202-26-96');

const legacyBraces = renderTemplate('Тел: {branchPhone}', { branchPhone: '79991234567' });
eq('старые фигурные скобки', legacyBraces, 'Тел: +7 (999) 123-45-67');

const landline = renderTemplate('Тел: #BRANCH_PHONE#', { branchPhone: '74951234567' });
eq('московский номер', landline, 'Тел: +7 (495) 123-45-67');

const shortBranch = renderTemplate('Тел: #BRANCH_PHONE#', { branchPhone: '42' });
eq('добавочный в тексте', shortBranch, 'Тел: 42');

const noPhone = renderTemplate('Заказ готов: {orderCode}', { orderCode: 'A-17' });
eq('без телефона ничего не меняется', noPhone, 'Заказ готов: A-17');

if (failures > 0) {
  console.error(`PROBLEMS: ${failures}`);
  process.exitCode = 1;
} else {
  console.log('PASS phone in messages');
}
