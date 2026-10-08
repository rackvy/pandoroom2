/**
 * Один формат номера на админку: сюда переехали копии из ClientsPage,
 * ClientDetailPage и VRSchedulePage.
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    const prefix = digits.startsWith('7') ? '+7' : '8';
    return `${prefix} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  }
  return raw;
}
