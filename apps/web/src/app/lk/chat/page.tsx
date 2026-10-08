'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/contexts/AuthContext'
import { lkFetch, type ChatFeed, type ChatMessage, type MessageChannel } from '@/lib/lk-api'
import styles from './page.module.css'

const API_ROOT = process.env.NEXT_PUBLIC_API_URL?.replace('/api/public', '') || 'http://localhost:3001'

const PAGE_SIZE = 50

// Сообщения из кабинета подписываем каналом только если это внешний мессенджер:
// INTERNAL для клиента и так его собственный канал, плодить на каждом сообщении
// метку «Кабинет» незачем.
const CHANNEL_LABEL: Record<Exclude<MessageChannel, 'INTERNAL'>, string> = {
  WHATSAPP: 'WhatsApp',
  TELEGRAM: 'Telegram',
  MAX: 'MAX',
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function formatDayLabel(dateStr: string) {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Сегодня'
  if (date.toDateString() === yesterday.toDateString()) return 'Вчера'
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

function formatBookingLabel(dateStr: string) {
  return `Бронь от ${new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`
}

export default function ChatPage() {
  const { client, token, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [connected, setConnected] = useState(false)

  const socketRef = useRef<Socket | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const lastIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!authLoading && !client) {
      router.push('/lk/login')
    }
  }, [authLoading, client, router])

  const markRead = useCallback(() => {
    socketRef.current?.emit('message:read', {})
  }, [])

  useEffect(() => {
    if (!client || !token) return

    const socket = io(`${API_ROOT}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      markRead()
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    // Единая лента: фильтров по брони больше нет, берём всё, что дошло до комнаты клиента.
    socket.on('message:new', (msg: ChatMessage) => {
      setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]))
      if (msg.direction !== 'INBOUND') markRead()
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [client, token, markRead])

  useEffect(() => {
    if (!client) return
    let cancelled = false

    setLoading(true)
    lkFetch<ChatFeed>(`/chat/feed?limit=${PAGE_SIZE}`)
      .then(feed => {
        if (cancelled) return
        setMessages(feed.messages)
        setNextCursor(feed.nextCursor)
        markRead()
      })
      .catch(err => console.error('Не удалось загрузить переписку:', err))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [client, markRead])

  const loadOlder = async () => {
    if (!nextCursor || loadingOlder) return

    const list = listRef.current
    const prevHeight = list?.scrollHeight ?? 0
    const prevTop = list?.scrollTop ?? 0

    setLoadingOlder(true)
    try {
      const feed = await lkFetch<ChatFeed>(`/chat/feed?limit=${PAGE_SIZE}&cursor=${nextCursor}`)
      setMessages(prev => [...feed.messages, ...prev])
      setNextCursor(feed.nextCursor)
      // Лента листается вверх: без возврата на прежнее смещение новые сверху
      // сообщения утянули бы просмотр в начало истории.
      requestAnimationFrame(() => {
        const el = listRef.current
        if (el) el.scrollTop = el.scrollHeight - prevHeight + prevTop
      })
    } catch (err) {
      console.error('Не удалось загрузить прежние сообщения:', err)
    } finally {
      setLoadingOlder(false)
    }
  }

  useEffect(() => {
    // Пока показан любой экран загрузки, ленты в DOM нет и прокручивать некуда.
    // Не забираем у последнего сообщения право на прокрутку в такой момент —
    // иначе скролл вниз не случится уже никогда.
    const list = listRef.current
    if (authLoading || !client || loading || !list) return

    const lastId = messages[messages.length - 1]?.id ?? null
    if (lastId === lastIdRef.current) return
    const first = lastIdRef.current === null
    lastIdRef.current = lastId
    // Прокручиваем именно список: scrollIntoView тянет за собой и окно страницы,
    // и кабинет уезжает в подвал.
    list.scrollTo({ top: list.scrollHeight, behavior: first ? 'auto' : 'smooth' })
  }, [messages, loading, authLoading, client])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || !socketRef.current?.connected) return
    socketRef.current.emit('message:send', { text: trimmed })
    setText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (authLoading || !client) {
    return <div className={styles.loading}>Загрузка...</div>
  }

  // Экран загрузки — только пока показывать нечего: иначе повторная загрузка
  // срывает ленту с экрана вместе с положением прокрутки.
  if (loading && messages.length === 0) {
    return <div className={styles.loading}>Загружаем переписку...</div>
  }

  const groups: { day: string; messages: ChatMessage[] }[] = []
  for (const msg of messages) {
    const day = formatDayLabel(msg.createdAt)
    const group = groups[groups.length - 1]
    if (group && group.day === day) {
      group.messages.push(msg)
    } else {
      groups.push({ day, messages: [msg] })
    }
  }

  return (
    <div className={styles.chatPage}>
      <div className={styles.chatArea}>
        <div className={styles.chatHeader}>
          <button className={styles.backBtn} onClick={() => router.push('/lk')}>
            ←
          </button>
          <div className={styles.chatHeaderInfo}>
            <h1 className={styles.chatTitle}>Чат с Pandoroom</h1>
            <span className={styles.chatSubtitle}>Все сообщения в одном месте</span>
          </div>
          <span
            className={styles.connectionDot}
            style={{ background: connected ? '#4ade80' : '#888' }}
            title={connected ? 'Связь есть' : 'Нет связи'}
          />
        </div>

        <div className={styles.messages} ref={listRef}>
          {nextCursor && (
            <button className={styles.olderBtn} onClick={loadOlder} disabled={loadingOlder}>
              {loadingOlder ? 'Загружаем...' : 'Сообщения раньше'}
            </button>
          )}

          {messages.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>💬</div>
              <p>Пока нет сообщений. Напишите нам — ответим в этом же чате.</p>
            </div>
          ) : (
            groups.map(group => (
              <div key={group.day}>
                <div className={styles.daySeparator}>{group.day}</div>
                {group.messages.map(msg => {
                  const mine = msg.direction === 'INBOUND'
                  const system = msg.direction === 'SYSTEM'
                  const channelLabel =
                    msg.channel === 'INTERNAL' ? null : CHANNEL_LABEL[msg.channel]

                  return (
                    <div
                      key={msg.id}
                      className={`${styles.message} ${
                        mine
                          ? styles.messageMine
                          : system
                            ? styles.messageSystem
                            : styles.messageTeam
                      }`}
                    >
                      {!mine && !system && (
                        <div className={styles.messageSender}>{msg.authorName || 'Pandoroom'}</div>
                      )}
                      {(channelLabel || msg.booking) && (
                        <div className={styles.chips}>
                          {channelLabel && <span className={styles.chip}>{channelLabel}</span>}
                          {msg.booking && (
                            <Link className={styles.chipLink} href="/lk" title="К списку броней">
                              {formatBookingLabel(msg.booking.eventDate)}
                            </Link>
                          )}
                        </div>
                      )}
                      <p className={styles.messageText}>{msg.text}</p>
                      <div className={styles.messageTime}>{formatTime(msg.createdAt)}</div>
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className={styles.inputArea}>
          <textarea
            className={styles.input}
            placeholder={connected ? 'Написать сообщение...' : 'Нет связи с сервером'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!text.trim() || !connected}
          >
            {connected ? 'Отправить' : 'Нет связи'}
          </button>
        </div>
      </div>
    </div>
  )
}
