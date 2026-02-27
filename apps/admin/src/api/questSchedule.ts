import api from '../lib/axios';

export interface QuestScheduleSlot {
  id: string;
  questId: string;
  dayOfWeek: number;
  startTime: string;
  basePrice: number;
  isActive: boolean;
  sortOrder: number;
  specialPrices: {
    id: string;
    specialDate: string;
    specialPrice: number;
    isAvailable: boolean;
  }[];
}

export interface CreateSlotData {
  questId: string;
  dayOfWeek: number;
  startTime: string;
  basePrice: number;
  isActive?: boolean;
}

export interface UpdateSlotData {
  startTime?: string;
  basePrice?: number;
  isActive?: boolean;
}

export interface CreateSpecialPriceData {
  slotId: string;
  specialDate: string;
  specialPrice: number;
  isAvailable?: boolean;
}

export interface UpdateSpecialPriceData {
  specialPrice?: number;
  isAvailable?: boolean;
}

export interface PublicScheduleSlot {
  id: string;
  startTime: string;
  basePrice: number;
  finalPrice: number;
  isAvailable: boolean;
  hasSpecialPrice: boolean;
}

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export { DAY_NAMES };

export async function getQuestScheduleSlots(questId: string): Promise<QuestScheduleSlot[]> {
  const response = await api.get(`/api/admin/quest-schedule/slots?questId=${questId}`);
  return response.data;
}

export async function createQuestScheduleSlot(data: CreateSlotData): Promise<QuestScheduleSlot> {
  const response = await api.post('/api/admin/quest-schedule/slots', data);
  return response.data;
}

export async function updateQuestScheduleSlot(id: string, data: UpdateSlotData): Promise<QuestScheduleSlot> {
  const response = await api.patch(`/api/admin/quest-schedule/slots/${id}`, data);
  return response.data;
}

export async function deleteQuestScheduleSlot(id: string): Promise<void> {
  await api.delete(`/api/admin/quest-schedule/slots/${id}`);
}

export async function createSpecialPrice(data: CreateSpecialPriceData): Promise<any> {
  const response = await api.post('/api/admin/quest-schedule/special-prices', data);
  return response.data;
}

export async function updateSpecialPrice(id: string, data: UpdateSpecialPriceData): Promise<any> {
  const response = await api.patch(`/api/admin/quest-schedule/special-prices/${id}`, data);
  return response.data;
}

export async function deleteSpecialPrice(id: string): Promise<void> {
  await api.delete(`/api/admin/quest-schedule/special-prices/${id}`);
}

export async function getPublicQuestSchedule(questId: string, date?: string): Promise<PublicScheduleSlot[]> {
  const url = date 
    ? `/api/admin/quest-schedule/public/quest/${questId}?date=${date}`
    : `/api/admin/quest-schedule/public/quest/${questId}`;
  const response = await api.get(url);
  return response.data;
}
