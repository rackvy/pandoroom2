/**
 * Текст кода и его опознавание. Отдельный модуль без Nest и Prisma: тот же
 * признак проверяет вебхук каналов, а сам текст — node-скрипт
 * `scripts/otp-channels.check.mts`.
 */

/**
 * Стабильная фраза: по ней же узнаём эхо нашего исходящего в вебхуке Wazzup.
 * Меняется текст — меняется и проверка, поэтому её стережёт самопроверка.
 */
export const OTP_MESSAGE_MARKER = 'Код для входа в личный кабинет Pandoroom';

/** Ограничение Wazzup на длину текста сообщения. */
export const WAZZUP_TEXT_LIMIT = 550;

/**
 * Куда готовы отдать код запасным путём. WhatsApp сознательно нет: на проде
 * подключён официальный WABA-канал, а первое сообщение незнакомому номеру он
 * пропускает только утверждённым в Meta шаблоном — свободный текст не пройдёт.
 */
export const AVAILABLE_MESSENGERS = ['telegram', 'max'] as const;

export type MessengerChannel = (typeof AVAILABLE_MESSENGERS)[number];

export function isMessengerChannel(value: string): value is MessengerChannel {
  return (AVAILABLE_MESSENGERS as readonly string[]).includes(value);
}

export function otpChannelLabel(channel: MessengerChannel): string {
  return channel === 'telegram' ? 'Telegram' : 'MAX';
}

export function otpMessage(code: string, ttlMin: number): string {
  return (
    `${OTP_MESSAGE_MARKER}: ${code}\n` +
    `Код действует ${ttlMin} мин. Если вы не запрашивали вход, просто проигнорируйте сообщение.`
  );
}

/**
 * Признак — маркер, а не шесть цифр: гость может прислать код в поддержку,
 * и такое сообщение терять нельзя.
 */
export function isOtpMessage(text: string): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim().toLowerCase();
  return normalized.includes(OTP_MESSAGE_MARKER.toLowerCase());
}
