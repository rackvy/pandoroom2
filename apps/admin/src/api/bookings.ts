import api from '../lib/axios';

/** Стандартная длительность праздника: столько же закладывает сервер. */
export const DEFAULT_PARTY_DURATION_MINUTES = 120;

export const BOOKING_TYPE_LABELS: Record<string, string> = {
  party: 'Праздник',
  quest: 'Квест',
  vr: 'VR',
  hall: 'Зал',
  other: 'Другое',
};

export const BOOKING_TYPES = Object.keys(BOOKING_TYPE_LABELS);

export const BOOKING_STATUSES: Record<string, string> = {
  draft: 'Черновик',
  confirmed: 'Подтверждено',
  paid: 'Оплачено',
  done: 'Завершено',
  canceled: 'Отменено',
};

/** Начало + длительность в пределах суток: 23:00 + 120 мин даёт 24:00, а не 01:00. */
export function partyEndTime(startTime: string, minutes = DEFAULT_PARTY_DURATION_MINUTES): string {
  const [h, m] = startTime.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '';
  const total = Math.min(h * 60 + m + minutes, 24 * 60 - 1);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export interface CreateBookingRequest {
  branchId: string;
  eventDate: string;
  clientName: string;
  clientPhone: string;
  clientId?: string;
  type?: string;
  startTime?: string;
  tableIds?: string[];
  questIds?: string[];
  birthdayPersonName?: string;
  birthdayPersonAge?: number;
  guestsKids?: number;
  guestsAdults?: number;
  commentClient?: string;
  commentInternal?: string;
  depositRub?: number;
}

export interface FreeTableZone {
  id: string;
  name: string;
  recommendedMaxAge: number | null;
  tables: Array<{
    id: string;
    title: string;
    capacity: number | null;
    imageUrl: string | null;
  }>;
}

export interface FreeQuest {
  questId: string;
  questName: string;
  durationMinutes: number;
  minPlayers: number | null;
  maxPlayers: number | null;
  slotTimes: string[];
}

export interface BookingListRow {
  id: string;
  type: string;
  status: string;
  eventDate: string;
  iikoOrderId: string | null;
  clientName: string;
  clientPhone: string;
  clientId: string | null;
  birthdayPersonName: string | null;
  depositRub: number;
  tableReservations: Array<{
    id: string;
    startTime: string;
    endTime: string;
    table: { id: string; title: string; zone: { name: string } | null } | null;
  }>;
  questReservations: Array<{
    id: string;
    startTime: string;
    endTime: string;
    quest: { id: string; name: string } | null;
  }>;
  vrReservations: Array<{
    id: string;
    startTime: string;
    endTime: string;
    hall: { id: string; name: string } | null;
  }>;
  tableSlots: Array<{ id: string; title: string; startTime: string; endTime: string }>;
  questSlots: Array<{ id: string; title: string; startTime: string }>;
  bookingCakes: Array<{ id: string; priceRub: number }>;
  decorationItems: Array<{ id: string; priceRub: number; qty: number }>;
  foodItems: Array<{ id: string; priceRub: number; qty: number }>;
  extraSlots: Array<{ id: string; priceRub: number }>;
}

export async function getBookings(params: {
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: string;
}): Promise<BookingListRow[]> {
  const response = await api.get('/api/admin/bookings', { params });
  return response.data;
}

export async function createBooking(data: CreateBookingRequest): Promise<{ id: string }> {
  const response = await api.post('/api/admin/bookings', data);
  return response.data;
}

/** Перевод заявки в занятость: столы и квесты из состава брони становятся бронями расписания. */
export async function confirmBooking(id: string): Promise<{ status: string }> {
  const response = await api.post(`/api/admin/bookings/${id}/confirm`);
  return response.data;
}

export async function addTableReservationToBooking(
  bookingId: string,
  data: { tableId: string; startTime: string; endTime?: string; comment?: string },
): Promise<{ id: string }> {
  const response = await api.post(`/api/admin/bookings/${bookingId}/table-reservations`, data);
  return response.data;
}

export async function getFreeTables(params: {
  branchId: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<FreeTableZone[]> {
  const response = await api.get('/api/admin/schedule/availability/tables', { params });
  return response.data;
}

export async function getFreeQuests(params: {
  branchId: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<FreeQuest[]> {
  const response = await api.get('/api/admin/schedule/availability/quests', { params });
  return response.data;
}

/** Сообщение об ошибке вложённого Nest-ответа: сервер пишет текст на русском. */
export function bookingApiError(err: unknown, fallback: string): string {
  const data: any = (err as any)?.response?.data;
  const message = data?.message;
  if (Array.isArray(message)) return message.join('; ');
  if (typeof message === 'string') return message;
  return fallback;
}
