import api from '../lib/axios';

export const syncBookingToCalendar = async (bookingId: string): Promise<{ googleEventId: string; url: string | null }> => {
  const response = await api.post(`/api/admin/google-calendar/sync/${bookingId}`);
  return response.data;
};

export const syncAllBookingsByDate = async (date: string): Promise<{ synced: number }> => {
  const response = await api.post('/api/admin/google-calendar/sync-all', null, { params: { date } });
  return response.data;
};
