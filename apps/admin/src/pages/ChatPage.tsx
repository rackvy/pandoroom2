import { useState, useEffect, useRef } from 'react';
import { getConversations, getChatMessages, sendChatMessage, getTotalUnread, type Conversation, type ChatMessageAdmin } from '../api/chat';
import styles from './ChatPage.module.css';

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageAdmin[]>([]);
  const [clientInfo, setClientInfo] = useState<{ name: string; phone: string } | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
    loadUnread();
    const interval = setInterval(() => {
      loadConversations();
      loadUnread();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedClient) {
      loadMessages(selectedClient);
      const interval = setInterval(() => loadMessages(selectedClient), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedClient]);

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

  const loadMessages = async (clientId: string) => {
    try {
      const data = await getChatMessages(clientId);
      setMessages(data.messages);
      setClientInfo(data.client);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !selectedClient || sending) return;
    setSending(true);
    try {
      const msg = await sendChatMessage(selectedClient, text.trim());
      setMessages(prev => [...prev, msg]);
      setText('');
      loadConversations();
      loadUnread();
    } catch (err) {
      console.error('Failed to send:', err);
    } finally {
      setSending(false);
    }
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
        <h1>Чат с клиентами {totalUnread > 0 && <span className={styles.badge}>{totalUnread}</span>}</h1>
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
                onClick={() => setSelectedClient(conv.client.id)}
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
                  disabled={!text.trim() || sending}
                >
                  {sending ? '...' : 'Отправить'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
