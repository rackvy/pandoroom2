import api from '../lib/axios';

// Types
export interface TableZone {
  id: string;
  key: 'CAFE' | 'LOUNGE' | 'KIDS';
  name: string;
  sortOrder: number;
}

export interface Table {
  id: string;
  zoneId: string;
  title: string;
  sortOrder: number;
  capacity?: number;
}

export interface Quest {
  id: string;
  name: string;
  durationMinutes: number;
}

export interface TableReservation {
  id: string;
  bookingId: string;
  tableId: string;
  title: string;
  comment: string | null;
  status: 'draft' | 'confirmed' | 'canceled' | 'done';
  eventDate: string;
  startTime: string;
  endTime: string;
  cleaningBufferMinutes: number;
  blockedUntilTime: string;
}

export interface QuestReservation {
  id: string;
  bookingId: string;
  questId: string;
  title: string;
  animatorName: string | null;
  comment: string | null;
  status: 'draft' | 'confirmed' | 'canceled' | 'done';
  startTime: string;
  endTime: string;
}

export interface TablesScheduleResponse {
  zones: TableZone[];
  tables: Table[];
  reservations: TableReservation[];
}

export interface QuestsScheduleResponse {
  quests: Quest[];
  reservations: QuestReservation[];
}

export interface BookingDetails {
  id: string;
  eventDate: string;
  clientName: string;
  clientPhone: string;
  birthdayPersonName: string | null;
  birthdayPersonAge: number | null;
  guestsKids: number | null;
  guestsAdults: number | null;
  depositRub: number;
  status: string;
  commentClient: string | null;
  commentInternal: string | null;
  tableSlots: any[];
  questSlots: any[];
  extraSlots: any[];
  bookingCakes: any[];
  decorationItems: any[];
  foodItems: any[];
}

// Quick booking interfaces
export interface QuickTableBookingRequest {
  branchId: string;
  tableId: string;
  eventDate: string;
  startTime: string;
  durationMinutes?: number;
  clientName?: string;
  clientPhone?: string;
}

export interface QuickQuestBookingRequest {
  branchId: string;
  questId: string;
  eventDate: string;
  startTime: string;
  durationMinutes?: number;
  clientName?: string;
  clientPhone?: string;
}

export interface QuickBookingResponse {
  booking: {
    id: string;
    status: string;
    eventDate: string;
    clientName: string;
    clientPhone: string;
    depositRub: number;
  };
  reservation: {
    id: string;
    tableId?: string;
    questId?: string;
    startTime: string;
    endTime: string;
    cleaningBufferMinutes?: number;
    blockedUntilTime?: string;
  };
}

export interface BookingFullDetails {
  id: string;
  status: string;
  eventDate: string;
  clientName: string;
  clientPhone: string;
  birthdayPersonName: string | null;
  birthdayPersonAge: number | null;
  guestsKids: number | null;
  guestsAdults: number | null;
  depositRub: number;
  commentClient: string | null;
  commentInternal: string | null;
  managerId: string | null;
  manager: { id: string; fullName: string; email: string } | null;
  branch: { id: string; name: string };
  tableReservations: Array<{
    id: string;
    tableId: string;
    tableTitle: string;
    zoneName: string;
    startTime: string;
    endTime: string;
    status: string;
    title: string;
  }>;
  questReservations: Array<{
    id: string;
    questId: string;
    questName: string;
    startTime: string;
    endTime: string;
    status: string;
    title: string;
    animatorName: string | null;
  }>;
  extraSlots: any[];
  bookingCakes: any[];
  decorationItems: any[];
  foodItems: any[];
}

export interface UpdateBookingBasicRequest {
  clientName?: string;
  clientPhone?: string;
  depositRub?: number;
  status?: string;
  commentClient?: string;
  commentInternal?: string;
  managerId?: string;
}

// API Functions
export async function getTablesSchedule(branchId: string, date: string): Promise<TablesScheduleResponse> {
  const response = await api.get('/api/admin/schedule/tables', {
    params: { branchId, date },
  });
  return response.data;
}

export async function getQuestsSchedule(branchId: string, date: string): Promise<QuestsScheduleResponse> {
  const response = await api.get('/api/admin/schedule/quests', {
    params: { branchId, date },
  });
  return response.data;
}

export async function moveTableReservation(
  id: string,
  data: { tableId?: string; startTime: string; endTime: string }
): Promise<TableReservation> {
  const response = await api.patch(`/api/admin/schedule/table-reservations/${id}/move`, data);
  return response.data;
}

export async function cancelTableReservation(id: string): Promise<void> {
  await api.delete(`/api/admin/schedule/table-reservations/${id}`);
}

export async function moveQuestReservation(
  id: string,
  data: { questId?: string; startTime: string; endTime: string }
): Promise<QuestReservation> {
  const response = await api.patch(`/api/admin/schedule/quest-reservations/${id}/move`, data);
  return response.data;
}

export async function cancelQuestReservation(id: string): Promise<void> {
  await api.delete(`/api/admin/schedule/quest-reservations/${id}`);
}

export async function getBookingDetails(id: string): Promise<BookingDetails> {
  const response = await api.get(`/api/admin/bookings/${id}`);
  return response.data;
}

export async function quickBookTable(data: QuickTableBookingRequest): Promise<QuickBookingResponse> {
  const response = await api.post('/api/admin/schedule/tables/quick-book', data);
  return response.data;
}

export async function quickBookQuest(data: QuickQuestBookingRequest): Promise<QuickBookingResponse> {
  const response = await api.post('/api/admin/schedule/quests/quick-book', data);
  return response.data;
}

export async function getBookingFull(id: string): Promise<BookingFullDetails> {
  const response = await api.get(`/api/admin/bookings/${id}/full`);
  return response.data;
}

export async function updateBookingBasic(id: string, data: UpdateBookingBasicRequest): Promise<BookingDetails> {
  const response = await api.patch(`/api/admin/bookings/${id}/basic`, data);
  return response.data;
}

export interface Branch {
  id: string;
  name: string;
}

export async function getBranches(): Promise<Branch[]> {
  const response = await api.get('/api/admin/catalog/branches');
  return response.data;
}

// ==================== QUEST SCHEDULE GRID ====================

export interface QuestSlot {
  slotId: string;
  startTime: string;
  basePrice: number;
  finalPrice: number;
  hasSpecialPrice: boolean;
  isAvailable: boolean;
  reservation: {
    id: string;
    bookingId: string;
    clientName: string;
    status: string;
  } | null;
}

export interface QuestWithSlots {
  questId: string;
  questName: string;
  durationMinutes: number;
  slots: QuestSlot[];
}

export async function getQuestScheduleGrid(date: string, branchId?: string): Promise<QuestWithSlots[]> {
  const response = await api.get('/api/admin/quest-schedule/grid', {
    params: { date, branchId },
  });
  return response.data;
}
