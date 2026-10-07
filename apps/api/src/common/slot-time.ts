/**
 * Время слота хранится в колонках типа `time`, поэтому и запись, и сравнение
 * идут через локальные часы — так же, как это делают schedule.service и
 * booking.service. Сервер работает в UTC, поэтому локальное время совпадает с
 * записанным.
 */

export const DEFAULT_PARTY_DURATION_MINUTES = 120;

export function stringToSlotDate(time: string): Date {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(time || '').trim());
  if (!match) throw new Error(`Некорректное время: ${time}`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error(`Некорректное время: ${time}`);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function slotDateToMinutes(slot: Date): number {
  return slot.getHours() * 60 + slot.getMinutes();
}

export function addMinutesToSlotDate(slot: Date, minutes: number): Date {
  return new Date(slot.getTime() + minutes * 60000);
}

export function slotDateToHHMM(slot: Date): string {
  return `${String(slot.getHours()).padStart(2, '0')}:${String(slot.getMinutes()).padStart(2, '0')}`;
}
