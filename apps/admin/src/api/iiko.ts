import api from '../lib/axios';

export interface IikoMenuItem {
  id: string;
  iikoId: string;
  name: string;
  category: string;
  department: string | null;
  price: number;
  isActive: boolean;
}

export const getIikoMenu = async (): Promise<IikoMenuItem[]> => {
  const response = await api.get('/api/admin/iiko/menu');
  return response.data;
};

export const syncIikoMenu = async (): Promise<{ synced: number; message: string }> => {
  const response = await api.post('/api/admin/iiko/menu/sync');
  return response.data;
};

export const createIikoOrder = async (
  bookingId: string,
  items: { name: string; qty: number; price: number }[],
): Promise<{ iikoOrderId: string; status: string }> => {
  const response = await api.post('/api/admin/iiko/orders', { bookingId, items });
  return response.data;
};

export const getIikoOrderStatus = async (
  iikoOrderId: string,
): Promise<{ iikoOrderId: string; status: string }> => {
  const response = await api.get(`/api/admin/iiko/orders/${iikoOrderId}`);
  return response.data;
};
