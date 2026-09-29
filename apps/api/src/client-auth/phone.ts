export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `7${digits}`;
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
  return digits;
}

export function isValidPhone(digits: string): boolean {
  return digits.length === 11 && digits.startsWith('7');
}

/** Формат номера для Zvonok: +79999999999 */
export function toMsisdn(digits: string): string {
  return `+${digits}`;
}
