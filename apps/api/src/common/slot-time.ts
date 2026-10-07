/**
 * Время слота хранится в колонках типа `time`, поэтому и запись, и сравнение
 * идут через локальные часы — так же, как это делают schedule.service и
 * booking.service. Сервер работает в UTC, поэтому локальное время совпадает с
 * записанным.
 */

export const DEFAULT_PARTY_DURATION_MINUTES = 120;

/** Полуночь — правая (exclusive) граница рабочего окна в минутах от начала суток. */
export const DAY_END_MINUTES = 24 * 60;

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

/**
 * 24:00 допустимо только как правая граница интервала: колонки `time` не хранят
 * полночь следующего дня, а сравнение пересечений работает в минутах.
 */
export function hhmmToMinutes(time: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(time || '').trim());
  if (!match) throw new Error(`Некорректное время: ${time}`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59 || hours > 24 || (hours === 24 && minutes > 0)) {
    throw new Error(`Некорректное время: ${time}`);
  }
  return hours * 60 + minutes;
}

export function minutesToHHMM(totalMinutes: number): string {
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

/** ГГГГ-ММ-ДД → полночь локальных суток — так же колонки `date` пишут другие сервисы. */
export function parseDateOnly(date: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || '').trim());
  if (!match) throw new Error(`Некорректная дата: ${date}`);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Конец окна праздника: позже полуночи занятие не уходит, поэтому граница — 24:00. */
export function partyEndHHMM(startTime: string, durationMinutes: number): string {
  return minutesToHHMM(Math.min(DAY_END_MINUTES, hhmmToMinutes(startTime) + durationMinutes));
}
