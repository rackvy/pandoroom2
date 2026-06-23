import api from '../lib/axios';

export interface NotificationLog {
  id: string;
  bookingId: string;
  channel: string;
  template: string;
  recipient: string;
  status: string;
  errorText: string | null;
  createdAt: string;
}

export const sendNotification = async (data: {
  bookingId: string;
  templateKey: 'MISSED_CALL' | 'PREORDER_REMINDER';
  channel: 'telegram' | 'sms' | 'max';
}): Promise<{ success: boolean; error?: string }> => {
  const response = await api.post('/api/admin/notifications/send', data);
  return response.data;
};

export const getNotificationLogs = async (bookingId: string): Promise<NotificationLog[]> => {
  const response = await api.get(`/api/admin/notifications/logs/${bookingId}`);
  return response.data;
};
