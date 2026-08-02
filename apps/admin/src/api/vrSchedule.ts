import api from '../lib/axios';

export interface VRPriceRule {
  id: string;
  hallId: string;
  name: string | null;
  days: number[];
  fromMinutes: number;
  toMinutes: number;
  pricePerHour: number;
  sortOrder: number;
}

export interface VRHall {
  id: string;
  branchId: string;
  name: string;
  maxCapacity: number;
  basePricePerHour: number;
  sortOrder: number;
  isActive: boolean;
  priceRules?: VRPriceRule[];
}

export interface VRReservation {
  id: string;
  hallId: string;
  bookingId: string | null;
  clientId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  type: 'full_hall' | 'open_slot' | 'blocked';
  title: string | null;
  description: string | null;
  gameId: string | null;
  clientName: string | null;
  clientPhone: string | null;
  guestsCount: number;
  maxGuests: number | null;
  status: string;
  game?: { id: string; name: string } | null;
  hall?: { id: string; name: string };
  client?: { id: string; name: string; phone: string } | null;
}

export interface VRHallWithSchedule extends VRHall {
  reservations: VRReservation[];
}

export interface VRPriceQuote {
  hallId: string;
  maxCapacity: number;
  segments: { time: string; pricePerHour: number }[];
  buyoutTotal: number;
}

export const getVRHalls = async (branchId: string): Promise<VRHall[]> => {
  const response = await api.get('/api/admin/vr-schedule/halls', { params: { branchId } });
  return response.data;
};

export const createVRHall = async (data: { branchId: string; name: string; maxCapacity?: number; basePricePerHour?: number }): Promise<VRHall> => {
  const response = await api.post('/api/admin/vr-schedule/halls', data);
  return response.data;
};

export const updateVRHall = async (id: string, data: Partial<VRHall>): Promise<VRHall> => {
  const response = await api.patch(`/api/admin/vr-schedule/halls/${id}`, data);
  return response.data;
};

export const deleteVRHall = async (id: string): Promise<void> => {
  await api.delete(`/api/admin/vr-schedule/halls/${id}`);
};

export const createVRPriceRule = async (hallId: string, data: { name?: string; days: number[]; fromMinutes: number; toMinutes: number; pricePerHour: number; sortOrder?: number }): Promise<VRPriceRule> => {
  const response = await api.post(`/api/admin/vr-schedule/halls/${hallId}/price-rules`, data);
  return response.data;
};

export const updateVRPriceRule = async (ruleId: string, data: Partial<{ name: string | null; days: number[]; fromMinutes: number; toMinutes: number; pricePerHour: number; sortOrder: number }>): Promise<VRPriceRule> => {
  const response = await api.patch(`/api/admin/vr-schedule/price-rules/${ruleId}`, data);
  return response.data;
};

export const deleteVRPriceRule = async (ruleId: string): Promise<void> => {
  await api.delete(`/api/admin/vr-schedule/price-rules/${ruleId}`);
};

export const getVRPrice = async (params: { hallId: string; date: string; startTime: string; endTime: string }): Promise<VRPriceQuote> => {
  const response = await api.get('/api/admin/vr-schedule/price', { params });
  return response.data;
};

export const getVRSchedule = async (branchId: string, date: string): Promise<VRHallWithSchedule[]> => {
  const response = await api.get('/api/admin/vr-schedule/schedule', { params: { branchId, date } });
  return response.data;
};

export const createVRReservation = async (data: any): Promise<VRReservation> => {
  const response = await api.post('/api/admin/vr-schedule/reservations', data);
  return response.data;
};

export const moveVRReservation = async (id: string, data: any): Promise<VRReservation> => {
  const response = await api.patch(`/api/admin/vr-schedule/reservations/${id}/move`, data);
  return response.data;
};

export const confirmVRReservation = async (id: string): Promise<VRReservation> => {
  const response = await api.patch(`/api/admin/vr-schedule/reservations/${id}/confirm`);
  return response.data;
};

export const cancelVRReservation = async (id: string): Promise<void> => {
  await api.patch(`/api/admin/vr-schedule/reservations/${id}/cancel`);
};

export const deleteVRReservation = async (id: string): Promise<void> => {
  await api.delete(`/api/admin/vr-schedule/reservations/${id}`);
};
