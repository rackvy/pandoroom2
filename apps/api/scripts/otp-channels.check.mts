/**
 * Самопроверка текста кода и списка запасных каналов: без сети и без ключей.
 * node apps/api/scripts/otp-channels.check.mts
 */
import {
  AVAILABLE_MESSENGERS,
  isOtpMessage,
  otpChannelLabel,
  otpMessage,
  OTP_MESSAGE_MARKER,
  WAZZUP_TEXT_LIMIT,
} from '../src/client-auth/otp-message.ts';

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

// --- эхо нашего кода узнаётся по маркеру ---
const message = otpMessage('123456', 5);
eq('код в тексте', message.includes('123456'), true);
eq('маркер в тексте', message.includes(OTP_MESSAGE_MARKER), true);
ok('текст влезает в лимит Wazzup', message.length <= WAZZUP_TEXT_LIMIT);

ok('своё сообщение — это код', isOtpMessage(message));
ok('регистр не важен', isOtpMessage(message.toUpperCase()));

// Провайдер может переверстать переносы — маркер должен пережить
ok('переносы строк не мешают', isOtpMessage(message.replace(/ /g, '\n  ')));
ok('двойные пробелы не мешают', isOtpMessage(`  ${message.replace(/ /g, '   ')}  `));

// --- чужое сообщение кодом не считается ---
ok('обычный текст — не код', !isOtpMessage('Здравствуйте, можно перенести бронь?'));
ok('просто шесть цифр — не код', !isOtpMessage('123456'));
ok('код в чужой фразе не по маркеру', !isOtpMessage('Ваш код 123456'));

// --- каналы ---
eq('подпись Telegram', otpChannelLabel('telegram'), 'Telegram');
eq('подпись MAX', otpChannelLabel('max'), 'MAX');
eq('список способов', AVAILABLE_MESSENGERS.join(','), 'telegram,max');
ok('WhatsApp не предлагается', !(AVAILABLE_MESSENGERS as readonly string[]).includes('whatsapp'));

if (failures === 0) {
  console.log('OK: текст кода и запасные каналы');
} else {
  console.error(`${failures} проверок провалилось`);
  process.exitCode = 1;
}
