import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { getClientByPhone } from '../api/clients';
import { getTotalUnread, type MessageChannel } from '../api/chat';
import { useAuth } from './AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface OpenChatOptions {
  clientId?: string | null;
  /** Если клиента в панели ещё нет, номер подставляется в поиск. */
  phone?: string | null;
  channel?: MessageChannel;
  /** Броня, из которой открыли чат: подставляется тегом в следующее сообщение. */
  bookingId?: string | null;
}

interface ChatOverlayValue {
  isOpen: boolean;
  isExpanded: boolean;
  clientId: string | null;
  channel: MessageChannel;
  bookingTag: string | null;
  unread: number;
  connected: boolean;
  socket: Socket | null;
  openChat: (options?: OpenChatOptions) => void;
  closeChat: () => void;
  toggleChat: () => void;
  setExpanded: (expanded: boolean) => void;
  selectClient: (clientId: string | null, bookingTag?: string | null) => void;
  setChannel: (channel: MessageChannel) => void;
  markRead: (clientId: string) => void;
}

const ChatOverlayContext = createContext<ChatOverlayValue | undefined>(undefined);

/**
 * Чат живёт вне `<main>`, поэтому состояние выбранного клиента и канала не
 * сбрасывается при смене роута — менеджер открывает переписку из карточки брони,
 * уходит в реестр и возвращается, не теряя ленту.
 *
 * Соединение одно на всё приложение: оно носит и счётчик непрочитанного, и
 * новые сообщения открытой ленты. Прежний опрос раз в 15 секунд не нужен —
 * `unread:update` приходит сам.
 */
export function ChatOverlayProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [channel, setChannel] = useState<MessageChannel>('INTERNAL');
  const [bookingTag, setBookingTag] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const client = io(`${API_BASE}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = client;
    setSocket(client);

    const refreshUnread = () => {
      getTotalUnread().then((d) => setUnread(d.unread)).catch(() => {});
    };

    client.on('connect', () => {
      setConnected(true);
      // Пока соединения не было, события могли пройти мимо — счётчик сверяем.
      refreshUnread();
    });
    client.on('disconnect', () => setConnected(false));
    client.on('unread:update', (data: { unread: number }) => setUnread(data.unread));

    refreshUnread();

    return () => {
      client.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    };
  }, [isAuthenticated]);

  const markRead = useCallback((targetId: string) => {
    socketRef.current?.emit('admin:message:read', { clientId: targetId });
  }, []);

  const selectClient = useCallback((nextId: string | null, nextTag: string | null = null) => {
    setClientId(nextId);
    setBookingTag(nextTag);
    if (nextId) markRead(nextId);
  }, [markRead]);

  const openChat = useCallback(
    (options: OpenChatOptions = {}) => {
      setIsOpen(true);
      if (options.channel) setChannel(options.channel);

      if (options.clientId) {
        selectClient(options.clientId, options.bookingId ?? null);
        return;
      }
      setBookingTag(options.bookingId ?? null);

      if (options.phone) {
        getClientByPhone(options.phone)
          .then((found) => {
            if (found) selectClient(found.id, options.bookingId ?? null);
          })
          .catch(() => {});
      }
    },
    [selectClient],
  );

  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen((prev) => !prev), []);

  const value = useMemo<ChatOverlayValue>(
    () => ({
      isOpen,
      isExpanded,
      clientId,
      channel,
      bookingTag,
      unread,
      connected,
      socket,
      openChat,
      closeChat,
      toggleChat,
      setExpanded: setIsExpanded,
      selectClient,
      setChannel,
      markRead,
    }),
    [
      isOpen,
      isExpanded,
      clientId,
      channel,
      bookingTag,
      unread,
      connected,
      socket,
      openChat,
      closeChat,
      toggleChat,
      selectClient,
      markRead,
    ],
  );

  return <ChatOverlayContext.Provider value={value}>{children}</ChatOverlayContext.Provider>;
}

export function useChatOverlay() {
  const context = useContext(ChatOverlayContext);
  if (!context) {
    throw new Error('useChatOverlay must be used within ChatOverlayProvider');
  }
  return context;
}
