'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/contexts/AuthContext'
import { lkFetch, type ChatMessage } from '@/lib/lk-api'
import styles from './page.module.css'

const API_ROOT = process.env.NEXT_PUBLIC_API_URL?.replace('/api/public', '') || 'http://localhost:3001'

interface BookingChatInfo {
  booking: {
    id: string
    eventDate: string
    clientName: string
    status: string
  }
  lastMessage: ChatMessage | null
  unreadCount: number
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  if (isToday) return 'Сегодня'
  if (isYesterday) return 'Вчера'
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

function formatBookingDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  })
}

function formatLastMessageTime(dateStr: string) {
  const date = new Date(dateStr)
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()
  if (isToday) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Вчера'
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Загрузка...</div>}>
      <ChatPageContent />
    </Suspense>
  )
}

function ChatPageContent() {
  const { client, token, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingIdParam = searchParams.get('bookingId')

  const [bookings, setBookings] = useState<BookingChatInfo[]>([])
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [connected, setConnected] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!authLoading && !client) {
      router.push('/lk/login')
    }
  }, [authLoading, client, router])

  // Load bookings with chat info
  useEffect(() => {
    if (!client) return
    loadBookings()
  }, [client])

  // Set selected booking from URL param
  useEffect(() => {
    if (bookingIdParam && bookings.length > 0) {
      const exists = bookings.some(b => b.booking.id === bookingIdParam)
      if (exists) {
        setSelectedBookingId(bookingIdParam)
        setShowSidebar(false)
      }
    }
  }, [bookingIdParam, bookings])

  // Load messages when selected booking changes (or null for general chat)
  useEffect(() => {
    if (bookingIdParam) return // handled by the other useEffect
    loadMessages(selectedBookingId)
  }, [selectedBookingId])

  // WebSocket connection
  useEffect(() => {
    if (!client || !token) return

    const socket = io(`${API_ROOT}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      // Mark messages as read for current booking
      if (selectedBookingId) {
        socket.emit('message:read', { bookingId: selectedBookingId })
      }
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('message:new', (msg: ChatMessage) => {
      // If message belongs to current booking, add it
      if (msg.bookingId === selectedBookingId || (!selectedBookingId && !msg.bookingId)) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        // Mark as read if it's from admin/system
        if (msg.sender !== 'client') {
          socket.emit('message:read', msg.bookingId ? { bookingId: msg.bookingId } : undefined)
        }
      }
      // Update booking list (unread counts, last message)
      updateBookingInList(msg)
    })

    socket.on('unread:update', (data: { unread: number }) => {
      // Update total unread if needed
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [client, token, selectedBookingId])

  const updateBookingInList = (msg: ChatMessage) => {
    if (!msg.bookingId) return
    setBookings(prev => {
      const idx = prev.findIndex(b => b.booking.id === msg.bookingId)
      if (idx === -1) {
        // New booking conversation — we'd need to fetch booking info
        // For now, just update if it exists
        return prev
      }
      const updated = [...prev]
      updated[idx] = {
        ...updated[idx],
        lastMessage: msg,
        unreadCount: msg.sender !== 'client' ? updated[idx].unreadCount + 1 : updated[idx].unreadCount,
      }
      // Move to top
      const [item] = updated.splice(idx, 1)
      return [item, ...updated]
    })
  }

  const loadBookings = async () => {
    try {
      setLoadingBookings(true)
      const data = await lkFetch('/chat/bookings')
      setBookings(data)
      // If URL has bookingId, it will be handled by the other useEffect
      // Otherwise stay on general chat (selectedBookingId = null)
    } catch (err) {
      console.error('Failed to load bookings:', err)
    } finally {
      setLoadingBookings(false)
    }
  }

  const loadMessages = async (bookingId: string | null) => {
    try {
      setLoadingMessages(true)
      const url = bookingId ? `/chat?bookingId=${bookingId}` : '/chat'
      const data = await lkFetch(url)
      setMessages(data)
      // Mark as read via socket
      if (socketRef.current?.connected) {
        socketRef.current.emit('message:read', bookingId ? { bookingId } : undefined)
      }
    } catch (err) {
      console.error('Failed to load messages:', err)
    } finally {
      setLoadingMessages(false)
    }
  }

  const selectBooking = (bookingId: string) => {
    setSelectedBookingId(bookingId)
    setShowSidebar(false)
    // Update URL
    router.push(`/lk/chat?bookingId=${bookingId}`, { scroll: false })
    // Clear unread for this booking in the list
    setBookings(prev => prev.map(b =>
      b.booking.id === bookingId ? { ...b, unreadCount: 0 } : b
    ))
  }

  const selectGeneral = () => {
    setSelectedBookingId(null)
    setShowSidebar(false)
    router.push('/lk/chat', { scroll: false })
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!text.trim() || sending || !socketRef.current) return
    setSending(true)
    socketRef.current.emit('message:send', {
      text: text.trim(),
      ...(selectedBookingId ? { bookingId: selectedBookingId } : {}),
    })
    setText('')
    setSending(false)
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

  const selectedBooking = bookings.find(b => b.booking.id === selectedBookingId)

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = []
  let currentDate = ''
  for (const msg of messages) {
    const date = formatDate(msg.createdAt)
    if (date !== currentDate) {
      currentDate = date
      groupedMessages.push({ date, messages: [msg] })
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg)
    }
  }

  return (
    <div className={styles.chatPage}>
      <div className={styles.chatLayout}>
        {/* Sidebar — bookings list */}
        <div className={`${styles.sidebar} ${showSidebar ? styles.sidebarVisible : styles.sidebarHidden}`}>
          <div className={styles.sidebarHeader}>
            <button className={styles.backBtn} onClick={() => router.push('/lk')}>
              ←
            </button>
            <h2 className={styles.sidebarTitle}>Чат</h2>
            <span className={styles.connectionDot} style={{ background: connected ? '#4ade80' : '#888' }} />
          </div>

          {loadingBookings ? (
            <div className={styles.sidebarEmpty}>Загрузка...</div>
          ) : (
            <div className={styles.bookingList}>
              {/* General chat */}
              <button
                className={`${styles.bookingItem} ${selectedBookingId === null ? styles.bookingItemActive : ''}`}
                onClick={selectGeneral}
              >
                <div className={styles.bookingItemTop}>
                  <span className={styles.bookingItemName}>💬 Общий чат</span>
                </div>
                <div className={styles.bookingItemBottom}>
                  <span className={styles.bookingItemPreview}>Написать общий вопрос</span>
                </div>
              </button>

              {/* Per-booking chats */}
              {bookings.length === 0 ? (
                <div className={styles.sidebarEmpty}>
                  <p>У вас пока нет бронирований</p>
                </div>
              ) : bookings.map(item => (
                <button
                  key={item.booking.id}
                  className={`${styles.bookingItem} ${selectedBookingId === item.booking.id ? styles.bookingItemActive : ''}`}
                  onClick={() => selectBooking(item.booking.id)}
                >
                  <div className={styles.bookingItemTop}>
                    <span className={styles.bookingItemName}>
                      {item.booking.clientName || 'Бронирование'}
                    </span>
                    {item.lastMessage && (
                      <span className={styles.bookingItemTime}>
                        {formatLastMessageTime(item.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className={styles.bookingItemBottom}>
                    <span className={styles.bookingItemDate}>
                      {formatBookingDate(item.booking.eventDate)}
                    </span>
                    {item.lastMessage ? (
                      <span className={styles.bookingItemPreview}>
                        {item.lastMessage.sender === 'client' ? 'Вы: ' : item.lastMessage.sender === 'system' ? '🔔 ' : ''}
                        {item.lastMessage.text}
                      </span>
                    ) : (
                      <span className={styles.bookingItemPreview}>Нет сообщений</span>
                    )}
                  </div>
                  {item.unreadCount > 0 && (
                    <span className={styles.unreadBadge}>{item.unreadCount}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat area */}
        <div className={`${styles.chatArea} ${!showSidebar ? styles.chatAreaVisible : ''}`}>
          {/* Chat header */}
          <div className={styles.chatHeader}>
            <button
              className={styles.mobileBackBtn}
              onClick={() => setShowSidebar(true)}
            >
              ←
            </button>
            {selectedBookingId === null ? (
              <div className={styles.chatHeaderInfo}>
                <h1 className={styles.chatTitle}>Общий чат</h1>
                <span className={styles.chatSubtitle}>Pandoroom</span>
              </div>
            ) : selectedBooking ? (
              <div className={styles.chatHeaderInfo}>
                <h1 className={styles.chatTitle}>
                  {selectedBooking.booking.clientName}
                </h1>
                <span className={styles.chatSubtitle}>
                  {formatBookingDate(selectedBooking.booking.eventDate)}
                </span>
              </div>
            ) : (
              <h1 className={styles.chatTitle}>Выберите чат</h1>
            )}
          </div>

          {/* Messages */}
          <div className={styles.messages}>
            {loadingMessages ? (
              <div className={styles.empty}>
                <p>Загрузка сообщений...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>💬</div>
                <p>Пока нет сообщений. Напишите нам!</p>
              </div>
            ) : (
              groupedMessages.map(group => (
                <div key={group.date}>
                  <div className={styles.messageDateSeparator}>
                    <p className={styles.messageText}>{group.date}</p>
                  </div>
                  {group.messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`${styles.message} ${
                        msg.sender === 'client'
                          ? styles.messageClient
                          : msg.sender === 'system'
                            ? styles.messageSystem
                            : styles.messageAdmin
                      }`}
                    >
                      {msg.sender === 'admin' && (
                        <div className={styles.messageSender}>Pandoroom</div>
                      )}
                      <p className={styles.messageText}>{msg.text}</p>
                      <div className={styles.messageTime}>{formatTime(msg.createdAt)}</div>
                    </div>
                  ))}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className={styles.inputArea}>
            <textarea
                className={styles.input}
                placeholder="Написать сообщение..."
                value={text}
                onChange={(e) => setText(e.target.value)}
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
            </div>
        </div>
      </div>
    </div>
  )
}
