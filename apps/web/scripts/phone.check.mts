/**
 * Самопроверка телефонных хелперов: node apps/web/scripts/phone.check.mts
 * Расширение .mts оставляет файл вне проверки типов Next — та смотрит только *.ts и *.tsx.
 */
import {
  caretAfterNationalDigits,
  countNationalDigits,
  formatPhone,
  formatPhoneDisplay,
  isPhoneComplete,
  phoneToDigits,
  telHref,
} from '../src/lib/phone.ts';

let failures = 0;

function eq(name: string, got: unknown, want: unknown): void {
  if (got === want) return;
  failures++;
  console.error(`FAIL ${name}: получено ${JSON.stringify(got)}, ожидалось ${JSON.stringify(want)}`);
}

// --- маска ввода ---
eq('пустое поле не превращается в +7', formatPhone(''), '');
eq('одна цифра', formatPhone('9'), '+7 (9');
eq('две цифры', formatPhone('99'), '+7 (99');
eq('три цифры закрывают скобку', formatPhone('999'), '+7 (999)');
eq('четыре цифры', formatPhone('9991'), '+7 (999) 1');
eq('шесть цифр без висячего дефиса', formatPhone('999123'), '+7 (999) 123');
eq('восемь цифр без висячего дефиса', formatPhone('99912345'), '+7 (999) 123-45');
eq('backspace после дефиса убирает цифру', formatPhone('+7 (999) 123-45-'), '+7 (999) 123-45');
eq('десять цифр', formatPhone('9991234567'), '+7 (999) 123-45-67');
eq('полный канон', formatPhone('79991234567'), '+7 (999) 123-45-67');
eq('восьмерка в начале', formatPhone('89991234567'), '+7 (999) 123-45-67');
eq('вставка с плюсом', formatPhone('+79991234567'), '+7 (999) 123-45-67');
eq('вставка с пробелами', formatPhone('7 (999) 123 45 67'), '+7 (999) 123-45-67');
eq('грязная вставка', formatPhone('abc8-999-123-45-67xyz'), '+7 (999) 123-45-67');
eq('идемпотентность prefill', formatPhone(formatPhone('9991234567')), '+7 (999) 123-45-67');
eq('неполный номер не дополняется', formatPhone('+7 (999) 123-45-6'), '+7 (999) 123-45-6');
eq('хвост мусора отсекается', formatPhone('1234567890123456'), '+7 (123) 456-78-90');

// --- канон для отправки ---
eq('пусто', phoneToDigits(''), '');
eq('маска в цифры', phoneToDigits('+7 (999) 123-45-67'), '79991234567');
eq('восьмерка в канон', phoneToDigits('89991234567'), '79991234567');
eq('десять цифр в канон', phoneToDigits('9991234567'), '79991234567');
eq('неполный остаётся неполным', phoneToDigits('+7 (999) 123-45-6'), '7999123456');

// --- заполненность ---
eq('полный номер', isPhoneComplete('+7 (999) 123-45-67'), true);
eq('неполный номер', isPhoneComplete('+7 (999) 123-45-6'), false);
eq('номер из базы', isPhoneComplete('89991234567'), true);

// --- показ того, что лежит в базе ---
eq('показ канона', formatPhoneDisplay('79991234567'), '+7 (999) 123-45-67');
eq('показ восьмерки', formatPhoneDisplay('89991234567'), '+7 (999) 123-45-67');
eq('показ склеенного', formatPhoneDisplay('+7(999)1234567'), '+7 (999) 123-45-67');
eq('показ десяти цифр', formatPhoneDisplay('9991234567'), '+7 (999) 123-45-67');
eq('показ уже красивого', formatPhoneDisplay('+7 (495) 123-45-67'), '+7 (495) 123-45-67');
eq('добавочный как лежит', formatPhoneDisplay('вн. 42'), 'вн. 42');
eq('короткий как лежит', formatPhoneDisplay('123'), '123');
eq('иностранный как лежит', formatPhoneDisplay('+1 415 555 1234'), '+1 415 555 1234');
eq('длинный как лежит', formatPhoneDisplay('799912345678'), '799912345678');
eq('пусто', formatPhoneDisplay(''), '');
eq('null', formatPhoneDisplay(null), '');
eq('пробелы', formatPhoneDisplay('   '), '');

// --- tel: ссылки ---
eq('tel из канона', telHref('74232022696'), 'tel:+74232022696');
eq('tel из маски', telHref('+7 (423) 202-26-96'), 'tel:+74232022696');
eq('tel из восьмерки', telHref('8 800 555 35 35'), 'tel:+78005553535');
eq('tel без телефона', telHref('вн. 42'), 'tel:вн.42');

// --- каретка при правке в середине (считаем национальные цифры) ---
eq('каретка до цифр', caretAfterNationalDigits('+7 (999) 123-45-67', 0), 0);
eq('каретка после 1-й цифры', caretAfterNationalDigits('+7 (999) 123-45-67', 1), 5);
eq('каретка после 5-й цифры', caretAfterNationalDigits('+7 (999) 123-45-67', 5), 11);
eq('каретка после последней цифры', caretAfterNationalDigits('+7 (999) 123-45-67', 10), 18);
eq('каретка за границей', caretAfterNationalDigits('+7 (999) 123-45-67', 99), 18);
eq('цифры из сырого ввода', countNationalDigits('9991234567'), 10);
eq('цифры из маски', countNationalDigits('+7 (999) 123-45-6'), 9);
eq('цифры в одном префиксе', countNationalDigits('+7 ('), 0);
eq('пустая строка', countNationalDigits(''), 0);

if (failures > 0) {
  console.error(`PROBLEMS: ${failures}`);
  process.exitCode = 1;
} else {
  console.log('PASS phone helpers');
}
