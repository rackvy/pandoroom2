import api from '../lib/axios';

export interface PaymentStatus {
  paymentStatus: string | null;
  paymentId: string | null;
  paymentUrl: string | null;
  paidAt: string | null;
  depositRub: number;
  paymentMethod: string | null;
}

export const createPaymentLink = async (bookingId: string, amount: number): Promise<{ paymentUrl: string | null; paymentId: string | null; error?: string }> => {
  const response = await api.post('/api/admin/payments/create-link', { bookingId, amount });
  return response.data;
};

export const getPaymentStatus = async (bookingId: string): Promise<PaymentStatus> => {
  const response = await api.get(`/api/admin/payments/${bookingId}/status`);
  return response.data;
};
