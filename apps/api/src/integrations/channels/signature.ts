import { createHmac, timingSafeEqual } from 'crypto';

export function signWebhookBody(secret: string, rawBody: Buffer): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

/**
 * Сравнение через timingSafeEqual: обычное `===` на подписях даёт сигнал о
 * том, сколько символов совпало, а сырое тело приходит из сети.
 */
export function verifySignature(secret: string, rawBody: Buffer, header: string): boolean {
  const expected = signWebhookBody(secret, rawBody);
  const given = header.trim().toLowerCase().replace(/^sha256=/, '');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(given, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
