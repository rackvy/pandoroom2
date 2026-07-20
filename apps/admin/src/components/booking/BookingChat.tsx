import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '../../lib/axios';
import styles from './BookingChat.module.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

interface ChatMessage {
  id: string;
  clientId: string;
  bookingId: string | null;
  sender: 'client' | 'admin' | 'system';
  text: string;
  isRead: boolean;
  createdAt: string;
  client?: { id: string; name: string; phone: string } | null;
}

interface Props {
  bookingId: string;
  clientId: string | null;
  clientName: string;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Сегодня';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export default function BookingChat({ bookingId, clientId, clientName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Load messages via REST
  useEffect(() => {
    if (!expanded) return;
    loadMessages();
  }, [bookingId, expanded]);

  // WebSocket connection
  useEffect(() => {
    if (!expanded) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socket = io(`${API_BASE}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('message:new', (msg: ChatMessage) => {
      if (msg.bookingId === bookingId) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Mark as read
        if (msg.sender === 'client' && clientId) {
          socket.emit('admin:message:read', { clientId, bookingId });
        }
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [expanded, bookingId, clientId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/admin/chat/booking/${bookingId}`);
      setMessages(res.data.messages || []);
      // Mark client messages as read
      if (clientId) {
        socketRef.current?.emit('admin:message:read', { clientId, bookingId });
      }
    } catch (err) {
      console.error('Failed to load booking chat:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!text.trim() || sending || !socketRef.current || !clientId) return;
    setSending(true);
    socketRef.current.emit('admin:message:send', {
      clientId,
      text: text.trim(),
      bookingId,
    });
    setText('');
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group by date
  const grouped: { date: string; msgs: ChatMessage[] }[] = [];
  let curDate = '';
  for (const msg of messages) {
    const d = formatDate(msg.createdAt);
    if (d !== curDate) {
      curDate = d;
      grouped.push({ date: d, msgs: [msg] });
    } else {
      grouped[grouped.length - 1].msgs.push(msg);
    }
  }

  const unreadCount = messages.filter(m => m.sender === 'client' && !m.isRead).length;

  return (
    <div className={styles.chatSection}>
      <button
        className={styles.chatToggle}
        onClick={() => setExpanded(!expanded)}
      >
        <span className={styles.chatToggleIcon}>💬</span>
        <span>Чат по брони</span>
        {unreadCount > 0 && (
          <span className={styles.chatBadge}>{unreadCount}</span>
        )}
        <span className={styles.chatToggleArrow}>{expanded ? '▼' : '▲'}</span>
      </button>

      {expanded && (
        <div className={styles.chatBody}>
          <div className={styles.chatConnected}>
            <span className={styles.connDot} style={{ background: connected ? '#4ade80' : '#666' }} />
            <span>{connected ? 'Подключено' : 'Нет соединения'}</span>
          </div>

          <div className={styles.messages}>
            {loading ? (
              <div className={styles.empty}>Загрузка...</div>
            ) : messages.length === 0 ? (
              <div className={styles.empty}>Пока нет сообщений</div>
            ) : (
              grouped.map(g => (
                <div key={g.date}>
                  <div className={styles.dateSep}>{g.date}</div>
                  {g.msgs.map(msg => (
                    <div
                      key={msg.id}
                      className={`${styles.msg} ${
                        msg.sender === 'admin'
                          ? styles.msgAdmin
                          : msg.sender === 'system'
                            ? styles.msgSystem
                            : styles.msgClient
                      }`}
                    >
                      {msg.sender === 'client' && (
                        <div className={styles.msgSender}>{clientName || 'Клиент'}</div>
                      )}
                      {msg.sender === 'system' && (
                        <div className={styles.msgSender}>Система</div>
                      )}
                      <p className={styles.msgText}>{msg.text}</p>
                      <div className={styles.msgTime}>{formatTime(msg.createdAt)}</div>
                    </div>
                  ))}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.inputArea}>
            {!clientId ? (
              <div className={styles.noClient}>Клиент не привязан к брони</div>
            ) : (
              <>
                <textarea
                  className={styles.input}
                  placeholder="Написать сообщение..."
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                />
                <button
                  className={styles.sendBtn}
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                >
                  {sending ? '...' : 'Отправить'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
