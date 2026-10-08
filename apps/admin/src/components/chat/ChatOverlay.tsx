import { useCallback, useEffect, useRef, useState } from 'react';
import { getClients, type Client } from '../../api/clients';
import { getInbox, type InboxItem } from '../../api/chat';
import { useChatOverlay } from '../../contexts/ChatOverlayContext';
import { formatPhone } from '../../utils/phone';
import ChatThread from './ChatThread';
import styles from './ChatOverlay.module.css';

function previewTime(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function previewAuthor(msg: InboxItem['lastMessage']) {
  if (!msg) return '';
  if (msg.direction === 'INBOUND') return 'Клиент: ';
  if (msg.direction === 'SYSTEM') return '🔔 ';
  return `${msg.authorName || 'Мы'}: `;
}

function bookingCount(n: number) {
  const one = n % 10 === 1 && n % 100 !== 11;
  const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14);
  return `${n} ${one ? 'бронь' : few ? 'брони' : 'броней'}`;
}

/**
 * Плавающий чат команды: кнопка с общим счётчиком непрочитанного и панель,
 * которая живёт в layout и переживает переходы между разделами админки.
 */
export default function ChatOverlay() {
  const { isOpen, isExpanded, clientId, unread, connected, socket, toggleChat, closeChat, setExpanded, selectClient } =
    useChatOverlay();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Client[] | null>(null);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState('');
  const searchBoxRef = useRef<HTMLInputElement | null>(null);

  const loadInbox = useCallback(() => {
    return getInbox()
      .then((rows) => setInbox(rows))
      .catch(() => setListError('Не удалось загрузить диалоги'));
  }, []);

  useEffect(() => {
    if (!isOpen || clientId) return;
    let alive = true;
    setLoadingList(true);
    setListError('');
    loadInbox().finally(() => alive && setLoadingList(false));
    return () => {
      alive = false;
    };
  }, [isOpen, clientId, loadInbox]);

  // Поиск по телефону или имени: те же 3 цифры, что и в списке клиентов.
  useEffect(() => {
    const term = query.trim();
    if (!isOpen || clientId || term.length < 3) {
      setResults(null);
      return;
    }
    const timer = setTimeout(() => {
      getClients(term, 1, 8)
        .then((r) => setResults(r.clients))
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, isOpen, clientId]);

  // Сообщение другому клиенту меняет порядок в списке диалогов.
  useEffect(() => {
    if (!socket || clientId) return;
    const onNew = () => {
      loadInbox();
    };
    socket.on('message:new', onNew);
    return () => {
      socket.off('message:new', onNew);
    };
  }, [socket, clientId, loadInbox]);

  useEffect(() => {
    if (isOpen && !clientId) searchBoxRef.current?.focus();
  }, [isOpen, clientId]);

  const showPicker = !clientId;

  return (
    <>
      {isOpen && (
        <div className={`${styles.panel} ${isExpanded ? styles.panelExpanded : ''}`}>
          <header className={styles.panelHeader}>
            <span className={styles.panelTitle}>
              <span className={styles.dot} data-connected={connected} />
              {clientId ? 'Диалог' : 'Чат с клиентами'}
            </span>
            <div className={styles.panelActions}>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => setExpanded(!isExpanded)}
                title={isExpanded ? 'Свернуть панель' : 'Развернуть на весь экран'}
              >
                {isExpanded ? '🗗' : '🗖'}
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={closeChat}
                title="Закрыть чат"
              >
                ✕
              </button>
            </div>
          </header>

          {showPicker ? (
            <div className={styles.picker}>
              <input
                ref={searchBoxRef}
                className={styles.search}
                placeholder="Телефон, имя или e-mail клиента"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              {results ? (
                <div className={styles.list}>
                  {results.length === 0 ? (
                    <div className={styles.placeholder}>
                      Никого с таким номером нет. Создайте клиента в разделе «Клиенты».
                    </div>
                  ) : (
                    results.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={styles.listItem}
                        onClick={() => selectClient(c.id)}
                      >
                        <span className={styles.itemMain}>
                          <span className={styles.itemName}>{c.name || 'Клиент без имени'}</span>
                          <span className={styles.itemPhone}>{formatPhone(c.phone)}</span>
                        </span>
                        <span className={styles.itemCount}>
                          {c._count?.bookings ? bookingCount(c._count.bookings) : 'без броней'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <div className={styles.list}>
                  {loadingList && inbox.length === 0 ? (
                    <div className={styles.placeholder}>Загружаем диалоги…</div>
                  ) : inbox.length === 0 ? (
                    <div className={styles.placeholder}>
                      Обращений пока нет. Найдите клиента по телефону и напишите первым.
                    </div>
                  ) : (
                    inbox.map((row) => (
                      <button
                        key={row.client.id}
                        type="button"
                        className={styles.listItem}
                        onClick={() => selectClient(row.client.id)}
                      >
                        <span className={styles.itemMain}>
                          <span className={styles.itemName}>{row.client.name || 'Клиент без имени'}</span>
                          <span className={styles.itemPhone}>{formatPhone(row.client.phone)}</span>
                          <span className={styles.itemPreview}>
                            {previewAuthor(row.lastMessage)}
                            {row.lastMessage?.text ?? ''}
                          </span>
                        </span>
                        <span className={styles.itemSide}>
                          {row.lastMessage && (
                            <span className={styles.itemTime}>{previewTime(row.lastMessage.createdAt)}</span>
                          )}
                          {row.unreadCount > 0 && (
                            <span className={styles.itemBadge}>{row.unreadCount}</span>
                          )}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
              {listError && <div className={styles.error}>{listError}</div>}
            </div>
          ) : (
            <ChatThread onBack={() => selectClient(null)} />
          )}
        </div>
      )}

      <button
        type="button"
        className={styles.fab}
        onClick={toggleChat}
        aria-label="Чат с клиентами"
        title={unread > 0 ? `Непрочитанных: ${unread}` : 'Чат с клиентами'}
      >
        💬
        {unread > 0 && <span className={styles.fabBadge}>{unread > 99 ? '99+' : unread}</span>}
      </button>
    </>
  );
}
