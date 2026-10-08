import api from '../lib/axios';

export type MessageDirection = 'INBOUND' | 'OUTBOUND' | 'SYSTEM';
export type MessageChannel = 'INTERNAL' | 'WHATSAPP' | 'TELEGRAM' | 'MAX';
export type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface ChatMessage {
  id: string;
  clientId: string;
  /** Контекст-тег «по поводу какой брони», лента при этом одна. */
  bookingId: string | null;
  direction: MessageDirection;
  channel: MessageChannel;
  status: MessageStatus;
  authorName: string | null;
  text: string;
  /** Причина отказа отправки наружу — показываем её в ленте, а не гасим молча. */
  errorText: string | null;
  isRead: boolean;
  createdAt: string;
  booking?: {
    id: string;
    eventDate: string;
    clientName: string;
    status: string;
  } | null;
}

export interface ChatFeed {
  messages: ChatMessage[];
  nextCursor: string | null;
}

export interface ClientRef {
  id: string;
  name: string;
  phone: string;
}

export interface InboxItem {
  client: ClientRef;
  lastMessage: {
    id: string;
    text: string;
    direction: MessageDirection;
    channel: MessageChannel;
    authorName: string | null;
    createdAt: string;
  } | null;
  unreadCount: number;
}

export interface ClientChannelInfo {
  channel: MessageChannel;
  available: boolean;
  source: 'PROBE' | 'WEBHOOK' | 'MANUAL' | 'LEGACY';
  checkedAt: string | null;
  note: string | null;
}

/**
 * Как у команды устроена отправка наружу. `stub` — ключа провайдера нет, и
 * интерфейс обязан это показывать: менеджер не должен думать, что клиенту
 * ушло WhatsApp-сообщение, когда оно осталось в базе.
 */
export interface ChatDriverMode {
  kind: 'wazzup' | 'stub';
  reason: string | null;
}

export interface ChannelsSnapshot {
  clientId: string;
  channels: ClientChannelInfo[];
  driver: ChatDriverMode;
}

export interface StatusUpdate {
  id: string;
  status: MessageStatus;
  errorText: string | null;
}

export const getTotalUnread = async (): Promise<{ unread: number }> => {
  const response = await api.get('/api/admin/chat/unread');
  return response.data;
};

export const getInbox = async (limit = 30): Promise<InboxItem[]> => {
  const response = await api.get('/api/admin/chat/inbox', { params: { limit } });
  return response.data;
};

export const getFeed = async (
  clientId: string,
  options: { limit?: number; cursor?: string | null } = {},
): Promise<ChatFeed> => {
  const params: Record<string, string | number> = { limit: options.limit ?? 50 };
  if (options.cursor) params.cursor = options.cursor;
  const response = await api.get(`/api/admin/chat/feed/${clientId}`, { params });
  return response.data;
};

export const getClientChannels = async (clientId: string): Promise<ChannelsSnapshot> => {
  const response = await api.get(`/api/admin/chat/channels/${clientId}`);
  return response.data;
};

/**
 * Пачка по id для чипов у телефонов: страница таблицы получает один запрос,
 * а не по одному на строку. Сервер отвечает только кэшем — провайдера не дёргаем.
 */
export const getChannelsBulk = async (clientIds: string[]): Promise<ChannelsSnapshot[]> => {
  if (clientIds.length === 0) return [];
  const response = await api.post('/api/admin/chat/channels/bulk', { clientIds });
  return response.data.items;
};

/**
 * Проба номера у провайдера платная, поэтому без `force` сервер отвечает
 * кэшем. `force` — нажатие «Проверить заново»: обходит и месячный кэш, и
 * ручную пометку канала.
 */
export const refreshClientChannels = async (
  clientId: string,
  force = false,
): Promise<ChannelsSnapshot> => {
  // Тело `null` axios превращает в строку "null" — JSON-парсер на сервере
  // падает на ней с 400. Пустой объект проходит валидацию без лишних полей.
  const response = await api.post(
    `/api/admin/chat/channels/${clientId}/refresh`,
    {},
    { params: force ? { force: '1' } : {} },
  );
  return response.data;
};

/**
 * Тег брони и канал добавляем в тело только когда они есть: пайп отклоняет
 * незнакомые поля и пустые значения.
 */
export const sendToClient = async (
  clientId: string,
  text: string,
  options: { bookingId?: string | null; channel?: MessageChannel } = {},
): Promise<ChatMessage> => {
  const body: Record<string, string> = { text };
  if (options.bookingId) body.bookingId = options.bookingId;
  if (options.channel && options.channel !== 'INTERNAL') body.channel = options.channel;
  const response = await api.post(`/api/admin/chat/${clientId}`, body);
  return response.data;
};
