import api from '../lib/axios';

export interface VRHall {
  id: string;
  branchId: string;
  name: string;
  maxCapacity: number;
  sortOrder: number;
  isActive: boolean;
}

export interface VRReservation {
  id: string;
  hallId: string;
  bookingId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  type: 'full_hall' | 'open_slot';
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
}

export interface VRHallWithSchedule extends VRHall {
  reservations: VRReservation[];
}

export const getVRHalls = async (branchId: string): Promise<VRHall[]> => {
  const response = await api.get('/api/admin/vr-schedule/halls', { params: { branchId } });
  return response.data;
};

export const createVRHall = async (data: { branchId: string; name: string; maxCapacity?: number }): Promise<VRHall> => {
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

export const cancelVRReservation = async (id: string): Promise<void> => {
  await api.patch(`/api/admin/vr-schedule/reservations/${id}/cancel`);
};

export const deleteVRReservation = async (id: string): Promise<void> => {
  await api.delete(`/api/admin/vr-schedule/reservations/${id}`);
};
