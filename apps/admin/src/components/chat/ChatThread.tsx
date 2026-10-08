import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClient, type ClientWithHistory } from '../../api/clients';
import {
  getFeed,
  getClientChannels,
  refreshClientChannels,
  sendToClient,
  type ChatDriverMode,
  type ChatMessage,
  type ClientChannelInfo,
  type MessageChannel,
  type MessageStatus,
  type StatusUpdate,
} from '../../api/chat';
import { useChatOverlay } from '../../contexts/ChatOverlayContext';
import { putChannelsCache } from '../../hooks/useBulkChannels';
import { CHANNEL_NAMES, CHANNEL_SOURCE_NAMES } from '../../utils/channels';
import { formatPhone } from '../../utils/phone';
import styles from './ChatOverlay.module.css';

const PAGE_SIZE = 50;

/**
 * Исход сообщения, отправленного наружу. Клиентскую ленту он не касается:
 * там сообщение появляется сразу, а статус — это уже разговор с провайдером.
 */
const STATUS_LABELS: Record<MessageStatus, string> = {
  PENDING: 'отправляем…',
  SENT: 'отправлено',
  DELIVERED: 'доставлено',
  READ: 'прочитано',
  FAILED: 'не доставлено',
};

/** Броня, с которой ещё можно работать: отменённые и закрытые в ленту не просим. */
const LIVE_STATUSES = new Set(['draft', 'confirmed', 'paid']);

function formatDay(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function dayLabel(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Сегодня';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Диалог с одним клиентом: карточка (каналы и брони) сверху, единая лента
 * по всем каналам ниже. Лента листается вверх курсором, а не грузится целиком.
 */
export default function ChatThread({ onBack }: { onBack: () => void }) {
  const {
    clientId,
    bookingTag,
    channel,
    setChannel,
    socket,
    markRead,
    selectClient,
  } = useChatOverlay();
  const navigate = useNavigate();

  const [card, setCard] = useState<ClientWithHistory | null>(null);
  const [channels, setChannels] = useState<ClientChannelInfo[]>([]);
  const [driver, setDriver] = useState<ChatDriverMode | null>(null);
  const [probing, setProbing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  const listRef = useRef<HTMLDivElement | null>(null);
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    let alive = true;

    // Лента другого клиента не должна мелькать в кадре, пока грузится эта.
    setMessages([]);
    setNextCursor(null);
    setCard(null);
    setError('');
    setHint('');
    setLoading(true);
    lastIdRef.current = null;

    Promise.all([
      getFeed(clientId, { limit: PAGE_SIZE }),
      getClient(clientId).catch(() => null),
      getClientChannels(clientId).catch(() => null),
    ])
      .then(([feed, clientCard, snapshot]) => {
        if (!alive) return;
        setMessages(feed.messages);
        setNextCursor(feed.nextCursor);
        setCard(clientCard);
        setChannels(snapshot?.channels ?? []);
        setDriver(snapshot?.driver ?? null);
        markRead(clientId);
        // Чипы у телефона в карточке под оверлеем берутся из пачечного кэша:
        // без этой записи они показали бы старый ответ провайдера.
        if (snapshot) putChannelsCache(clientId, snapshot.channels);

        // Канал выбран общий: у другого клиента его может и не быть, и тогда
        // писать надо во внутренний чат, а не в пустоту.
        if (channel !== 'INTERNAL' && !snapshot?.channels.some((c) => c.channel === channel)) {
          setChannel('INTERNAL');
        }
      })
      .catch((err: any) => {
        if (alive) setError(err?.response?.data?.message || 'Не удалось загрузить переписку');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, markRead]);

  // Живые сообщения: в открытый диалог кладём в ленту, гасим непрочитанное.
  useEffect(() => {
    if (!socket || !clientId) return;

    const onNew = (msg: ChatMessage) => {
      if (msg.clientId !== clientId) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      markRead(clientId);
    };

    socket.on('message:new', onNew);
    return () => {
      socket.off('message:new', onNew);
    };
  }, [socket, clientId, markRead]);

  // Провайдер досылает статус уже отправленного сообщения — лента должна
  // перекрасить его, а не ждать перезагрузки страницы.
  useEffect(() => {
    if (!socket) return;

    const onStatus = (update: StatusUpdate) => {
      setMessages((prev) =>
        prev.some((m) => m.id === update.id)
          ? prev.map((m) =>
              m.id === update.id ? { ...m, status: update.status, errorText: update.errorText } : m,
            )
          : prev,
      );
    };

    socket.on('message:status', onStatus);
    return () => {
      socket.off('message:status', onStatus);
    };
  }, [socket]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || loading) return;
    const lastId = messages[messages.length - 1]?.id ?? null;
    if (lastId === lastIdRef.current) return;
    const first = lastIdRef.current === null;
    lastIdRef.current = lastId;
    // Прокручиваем сам список: scrollIntoView тянет за собой окно страницы.
    list.scrollTo({ top: list.scrollHeight, behavior: first ? 'auto' : 'smooth' });
  }, [messages, loading]);

  if (!clientId) return null;

  const activeBookings = (card?.bookings ?? []).filter(
    (b) =>
      LIVE_STATUSES.has(b.status) &&
      new Date(b.eventDate).getTime() >= new Date().setHours(0, 0, 0, 0),
  );

  const bookingLabel = (id: string | null) => {
    if (!id) return '';
    const found = card?.bookings.find((b) => b.id === id);
    return found ? formatDay(found.eventDate) : '';
  };

  const loadOlder = async () => {
    if (!nextCursor || loadingMore) return;
    const list = listRef.current;
    const prevHeight = list?.scrollHeight ?? 0;
    const prevTop = list?.scrollTop ?? 0;

    setLoadingMore(true);
    try {
      const feed = await getFeed(clientId, { limit: PAGE_SIZE, cursor: nextCursor });
      setMessages((prev) => [
        ...feed.messages.filter((m) => !prev.some((p) => p.id === m.id)),
        ...prev,
      ]);
      setNextCursor(feed.nextCursor);
      // Старые сообщения встают сверху — окно прокрутки должно остаться на месте.
      requestAnimationFrame(() => {
        if (list) list.scrollTop = list.scrollHeight - prevHeight + prevTop;
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Не удалось загрузить историю');
    } finally {
      setLoadingMore(false);
    }
  };

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError('');
    try {
      const created = await sendToClient(clientId, trimmed, {
        bookingId: bookingTag,
        channel,
      });
      setMessages((prev) => (prev.some((m) => m.id === created.id) ? prev : [...prev, created]));
      setText('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  /**
   * Выбор канала переписки. Подтверждённый номер просто становится активным;
   * неподтверждённый тоже выбираем — менеджер видит, что проверка не подтвердила
   * канал, и решает сам, но молча уводить его в заведомо пустой канал нельзя.
   */
  const pickChannel = (next: MessageChannel, info?: ClientChannelInfo) => {
    setChannel(next);
    if (next === 'INTERNAL') {
      setHint('');
      return;
    }
    if (info?.available) {
      setHint(
        `Ответ уйдёт в ${CHANNEL_NAMES[next]} и заодно ляжет в ленту личного кабинета. Клиент видит все каналы, а его ответ из кабинета придёт команде как внутреннее сообщение.`,
      );
      return;
    }
    setHint(
      `${CHANNEL_NAMES[next]}: номер не подтверждён${
        info?.note ? ` — ${info.note.toLowerCase()}` : ''
      }. Сообщение всё равно уйдёт провайдеру, а в ленте будет видно, дошло оно или нет.`,
    );
  };

  /** Явная перепроверка номеров: платный вызов, поэтому только по кнопке. */
  const reprobe = async () => {
    setProbing(true);
    setError('');
    try {
      const snapshot = await refreshClientChannels(clientId, true);
      setChannels(snapshot.channels);
      setDriver(snapshot.driver);
      putChannelsCache(clientId, snapshot.channels);
      const ready = snapshot.channels.filter((c) => c.channel !== 'INTERNAL' && c.available);
      setHint(
        ready.length
          ? `Провайдер подтвердил: ${ready.map((c) => CHANNEL_NAMES[c.channel]).join(', ')}. Ответ живёт месяц, следующие открытия берутся из кэша.`
          : 'Ни один мессенджер не подтвердился. Можно писать во внутренний чат — клиент увидит сообщение в личном кабинете.',
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Не удалось проверить номера у провайдера');
    } finally {
      setProbing(false);
    }
  };

  const grouped: { day: string; rows: ChatMessage[] }[] = [];
  for (const msg of messages) {
    const label = dayLabel(msg.createdAt);
    const bucket = grouped[grouped.length - 1];
    if (bucket && bucket.day === label) bucket.rows.push(msg);
    else grouped.push({ day: label, rows: [msg] });
  }

  return (
    <>
      <div className={styles.clientBar}>
        <button className={styles.backBtn} onClick={onBack} title="К списку диалогов">
          ←
        </button>
        <div className={styles.clientIdent}>
          <div className={styles.clientName}>{card?.name || 'Клиент без имени'}</div>
          <div className={styles.clientPhone}>{formatPhone(card?.phone)}</div>
        </div>
      </div>

      <div className={styles.channels}>
        <span className={styles.channelsTitle}>Каналы</span>
        <button
          type="button"
          className={channel === 'INTERNAL' ? styles.channelActive : styles.channelReady}
          onClick={() => pickChannel('INTERNAL')}
          title="Переписка в личном кабинете клиента"
        >
          {CHANNEL_NAMES.INTERNAL}
        </button>
        {channels
          .filter((c) => c.channel !== 'INTERNAL')
          .map((c) => (
            <button
              key={c.channel}
              type="button"
              className={
                channel === c.channel
                  ? styles.channelActive
                  : c.available
                    ? styles.channelReady
                    : styles.channelOff
              }
              onClick={() => pickChannel(c.channel, c)}
              title={
                c.available
                  ? `Номер подтверждён (${CHANNEL_SOURCE_NAMES[c.source] ?? c.source.toLowerCase()}${
                      c.checkedAt ? `, ${formatDay(c.checkedAt)}` : ''
                    })`
                  : c.note || 'Данных о регистрации в мессенджере нет'
              }
            >
              {CHANNEL_NAMES[c.channel]}
              <span className={styles.channelMark}>{c.available ? '✓' : '·'}</span>
            </button>
          ))}
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={reprobe}
          disabled={probing}
          title="Запрос к провайдеру: есть ли номер в WhatsApp, Telegram и MAX"
        >
          {probing ? 'Проверяем…' : 'Проверить номера'}
        </button>
        {driver?.kind === 'stub' && (
          <span
            className={styles.driverTag}
            title={driver.reason || 'Ключа провайдера нет — отправка наружу работает заглушкой'}
          >
            тестовый драйвер
          </span>
        )}
      </div>

      {hint && (
        <div className={styles.hint}>
          {hint}
          <button type="button" className={styles.hintClose} onClick={() => setHint('')}>
            ✕
          </button>
        </div>
      )}

      {activeBookings.length > 0 && (
        <div className={styles.bookings}>
          <span className={styles.bookingsTitle}>Активные брони</span>
          {activeBookings.map((b) => (
            <div key={b.id} className={styles.bookingRow}>
              <button
                type="button"
                className={styles.bookingLink}
                onClick={() => navigate(`/registry/${b.id}`)}
                title="Открыть бронь"
              >
                {formatDay(b.eventDate)}
                {b.branch ? ` · ${b.branch.name}` : ''}
              </button>
              <button
                type="button"
                className={bookingTag === b.id ? styles.tagOn : styles.tagBtn}
                onClick={() => selectClient(clientId, bookingTag === b.id ? null : b.id)}
                title="Помечать этим сообщением, по какой броне пишете"
              >
                {bookingTag === b.id ? 'тег: бронь ✓' : 'тег: бронь'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.feed} ref={listRef}>
        {nextCursor && (
          <button className={styles.olderBtn} onClick={loadOlder} disabled={loadingMore}>
            {loadingMore ? 'Загружаем…' : 'Сообщения раньше'}
          </button>
        )}
        {loading ? (
          <div className={styles.placeholder}>Загрузка переписки…</div>
        ) : messages.length === 0 ? (
          <div className={styles.placeholder}>
            Сообщений пока нет. Напишите первым — ответ появится у клиента в личном кабинете.
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.day}>
              <div className={styles.daySep}>{group.day}</div>
              {group.rows.map((msg) => (
                <div
                  key={msg.id}
                  className={
                    msg.direction === 'INBOUND'
                      ? styles.msgIn
                      : msg.direction === 'SYSTEM'
                        ? styles.msgSystem
                        : styles.msgOut
                  }
                >
                  {msg.direction !== 'INBOUND' && (
                    <div className={styles.msgAuthor}>
                      {msg.direction === 'SYSTEM' ? 'Система' : msg.authorName || 'Pandoroom'}
                    </div>
                  )}
                  <div className={styles.msgBody}>
                    <p className={styles.msgText}>{msg.text}</p>
                    {msg.status === 'FAILED' && msg.errorText && (
                      <p className={styles.msgError}>{msg.errorText}</p>
                    )}
                    <div className={styles.msgMeta}>
                      <span>{formatTime(msg.createdAt)}</span>
                      {msg.channel !== 'INTERNAL' && (
                        <span className={styles.msgChannel}>{CHANNEL_NAMES[msg.channel]}</span>
                      )}
                      {msg.channel !== 'INTERNAL' && msg.direction === 'OUTBOUND' && (
                        <span
                          className={
                            msg.status === 'FAILED' ? styles.msgFailed : styles.msgStatus
                          }
                          title={
                            msg.status === 'FAILED'
                              ? msg.errorText || 'Провайдер не принял сообщение'
                              : undefined
                          }
                        >
                          {STATUS_LABELS[msg.status]}
                        </span>
                      )}
                      {msg.booking && (
                        <button
                          type="button"
                          className={styles.msgBooking}
                          onClick={() => navigate(`/registry/${msg.booking!.id}`)}
                        >
                          бронь {formatDay(msg.booking.eventDate)}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.composer}>
        <div className={styles.composerTop}>
          <span className={styles.sendChannel}>
            Отправка: {CHANNEL_NAMES[channel]}
            {channel !== 'INTERNAL' && driver?.kind === 'stub' && ' · тестовый драйвер'}
          </span>
          {bookingTag && (
            <button
              type="button"
              className={styles.detachTag}
              onClick={() => selectClient(clientId, null)}
            >
              по брони {bookingLabel(bookingTag)} ✕
            </button>
          )}
        </div>
        <div className={styles.composerRow}>
          <textarea
            className={styles.input}
            placeholder={
              channel === 'INTERNAL' ? 'Написать сообщение…' : `Написать в ${CHANNEL_NAMES[channel]}…`
            }
            value={text}
            rows={2}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button className={styles.sendBtn} onClick={send} disabled={!text.trim() || sending}>
            {sending ? '…' : 'Отправить'}
          </button>
        </div>
      </div>
    </>
  );
}
