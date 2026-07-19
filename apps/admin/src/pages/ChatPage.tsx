import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getConversations, getChatMessages, getTotalUnread, type Conversation, type ChatMessageAdmin } from '../api/chat';
import styles from './ChatPage.module.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Extended message shape from WebSocket (includes client info for admin broadcasts)
interface WSMessage extends ChatMessageAdmin {
  client?: { id: string; name: string; phone: string } | null;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageAdmin[]>([]);
  const [clientInfo, setClientInfo] = useState<{ name: string; phone: string } | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const selectedClientRef = useRef<string | null>(null);

  // Keep ref in sync with state for use in socket callbacks
  useEffect(() => {
    selectedClientRef.current = selectedClient;
  }, [selectedClient]);

  // Initial load via REST
  useEffect(() => {
    loadConversations();
    loadUnread();
  }, []);

  // WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socket = io(`${API_BASE}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Real-time new messages
    socket.on('message:new', (msg: WSMessage) => {
      // If this message is for the currently open conversation
      if (selectedClientRef.current && msg.clientId === selectedClientRef.current) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Mark client messages as read immediately
        if (msg.sender === 'client') {
          socket.emit('admin:message:read', { clientId: msg.clientId });
        }
      }
      // Always refresh conversation list on new message
      loadConversations();
    });

    // Real-time unread count updates
    socket.on('unread:update', (data: { unread: number }) => {
      setTotalUnread(data.unread);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUnread = async () => {
    try {
      const data = await getTotalUnread();
      setTotalUnread(data.unread);
    } catch {}
  };

  const handleSelectClient = async (clientId: string) => {
    setSelectedClient(clientId);
    setMessages([]);
    try {
      const data = await getChatMessages(clientId);
      setMessages(data.messages);
      setClientInfo(data.client);
      // Mark client messages as read via WebSocket
      if (socketRef.current) {
        socketRef.current.emit('admin:message:read', { clientId });
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSend = () => {
    if (!text.trim() || !selectedClient || !socketRef.current) return;
    socketRef.current.emit('admin:message:send', {
      clientId: selectedClient,
      text: text.trim(),
    });
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return <div className={styles.container}><p>Загрузка...</p></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>
          Чат с клиентами
          <span
            className={styles.connectionDot}
            style={{ background: connected ? '#4ade80' : '#ccc' }}
            title={connected ? 'Подключено' : 'Отключено'}
          />
          {totalUnread > 0 && <span className={styles.badge}>{totalUnread}</span>}
        </h1>
      </div>

      <div className={styles.layout}>
        {/* Conversation list */}
        <div className={styles.sidebar}>
          {conversations.length === 0 ? (
            <div className={styles.empty}>Нет диалогов</div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.client.id}
                className={`${styles.convItem} ${selectedClient === conv.client.id ? styles.convActive : ''}`}
                onClick={() => handleSelectClient(conv.client.id)}
              >
                <div className={styles.convInfo}>
                  <div className={styles.convName}>{conv.client.name}</div>
                  <div className={styles.convPhone}>{conv.client.phone}</div>
                  {conv.lastMessage && (
                    <div className={styles.convPreview}>
                      {conv.lastMessage.sender === 'client' && <span className={styles.previewLabel}>Клиент: </span>}
                      {conv.lastMessage.text.substring(0, 50)}{conv.lastMessage.text.length > 50 ? '...' : ''}
                    </div>
                  )}
                </div>
                {conv.unreadCount > 0 && (
                  <span className={styles.convBadge}>{conv.unreadCount}</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Chat area */}
        <div className={styles.chatArea}>
          {!selectedClient ? (
            <div className={styles.noChat}>
              <p>Выберите диалог слева</p>
            </div>
          ) : (
            <>
              {clientInfo && (
                <div className={styles.chatHeader}>
                  <strong>{clientInfo.name}</strong>
                  <span className={styles.chatPhone}>{clientInfo.phone}</span>
                </div>
              )}

              <div className={styles.messages}>
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`${styles.message} ${
                      msg.sender === 'client' ? styles.msgClient :
                      msg.sender === 'system' ? styles.msgSystem : styles.msgAdmin
                    }`}
                  >
                    <div className={styles.msgSender}>
                      {msg.sender === 'client' ? clientInfo?.name : msg.sender === 'system' ? 'Система' : 'Вы'}
                    </div>
                    <div className={styles.msgText}>{msg.text}</div>
                    {msg.booking && (
                      <div className={styles.msgBooking}>
                        Бронь: {msg.booking.clientName} — {new Date(msg.booking.eventDate).toLocaleDateString('ru-RU')}
                      </div>
                    )}
                    <div className={styles.msgTime}>{formatDate(msg.createdAt)} {formatTime(msg.createdAt)}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className={styles.inputArea}>
                <textarea
                  className={styles.input}
                  placeholder="Ответить клиенту..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                />
                <button
                  className={styles.sendBtn}
                  onClick={handleSend}
                  disabled={!text.trim() || !connected}
                >
                  {connected ? 'Отправить' : 'Нет связи'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
