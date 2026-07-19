'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { lkFetch, type ChatMessage } from '@/lib/lk-api'
import styles from './page.module.css'

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

export default function ChatPage() {
  const { client, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!authLoading && !client) {
      router.push('/lk/login')
    }
  }, [authLoading, client, router])

  useEffect(() => {
    if (!client) return
    loadMessages()
    // Poll for new messages every 10 seconds
    const interval = setInterval(loadMessages, 10000)
    return () => clearInterval(interval)
  }, [client])

  const loadMessages = async () => {
    try {
      const data = await lkFetch('/chat')
      setMessages(data)
      setLoading(false)
    } catch (err) {
      console.error('Failed to load messages:', err)
      setLoading(false)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const msg = await lkFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({ text: text.trim() }),
      })
      setMessages(prev => [...prev, msg])
      setText('')
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSending(false)
    }
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
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.chatHeader}>
          <button className={styles.backBtn} onClick={() => router.push('/lk')}>
            ←
          </button>
          <h1 className={styles.chatTitle}>Чат с Pandoroom</h1>
        </div>

        {/* Messages */}
        <div className={styles.messages}>
          {loading ? (
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
                <div className={styles.messageSystem} style={{ alignSelf: 'center', margin: '8px 0' }}>
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
                    {msg.booking && (
                      <div className={styles.messageBooking}>
                        Бронь: {msg.booking.clientName} — {new Date(msg.booking.eventDate).toLocaleDateString('ru-RU')}
                      </div>
                    )}
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
  )
}
