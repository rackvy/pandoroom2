import api from '../lib/axios';

export interface Conversation {
  client: {
    id: string;
    name: string;
    phone: string;
  };
  lastMessage: {
    id: string;
    sender: string;
    text: string;
    createdAt: string;
  } | null;
  unreadCount: number;
}

export interface ChatMessageAdmin {
  id: string;
  clientId: string;
  bookingId: string | null;
  sender: 'client' | 'admin' | 'system';
  text: string;
  isRead: boolean;
  createdAt: string;
  booking?: {
    id: string;
    eventDate: string;
    clientName: string;
    status: string;
  } | null;
}

export interface ChatDetail {
  client: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  };
  messages: ChatMessageAdmin[];
}

export const getConversations = async (): Promise<Conversation[]> => {
  const response = await api.get('/api/admin/chat/conversations');
  return response.data;
};

export const getChatMessages = async (clientId: string): Promise<ChatDetail> => {
  const response = await api.get(`/api/admin/chat/${clientId}`);
  return response.data;
};

export const sendChatMessage = async (clientId: string, text: string, bookingId?: string): Promise<ChatMessageAdmin> => {
  const response = await api.post(`/api/admin/chat/${clientId}`, { text, bookingId });
  return response.data;
};

export const sendSystemMessage = async (clientId: string, text: string, bookingId?: string): Promise<ChatMessageAdmin> => {
  const response = await api.post(`/api/admin/chat/${clientId}/system`, { text, bookingId });
  return response.data;
};

export const getTotalUnread = async (): Promise<{ unread: number }> => {
  const response = await api.get('/api/admin/chat/unread');
  return response.data;
};
