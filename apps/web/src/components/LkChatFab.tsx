'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/contexts/AuthContext'
import { lkFetch } from '@/lib/lk-api'
import styles from './LkChatFab.module.css'

const API_ROOT = process.env.NEXT_PUBLIC_API_URL?.replace('/api/public', '') || 'http://localhost:3001'

/**
 * Плавающая кнопка чата: счётчик непрочитанного виден на любой странице кабинета.
 * Считает по событиям сокета, поэтому гаснет в тот же момент, когда клиент
 * открывает переписку в другой вкладке или отвечает менеджер.
 */
export default function LkChatFab() {
  const { client, token } = useAuth()
  const clientId = client?.id ?? null
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!clientId) {
      setUnread(0)
      return
    }
    let cancelled = false
    lkFetch<{ unread: number }>('/chat/unread')
      .then(data => {
        if (!cancelled) setUnread(data.unread)
      })
      .catch(err => console.error('Не удалось получить счётчик чата:', err))
    return () => {
      cancelled = true
    }
  }, [clientId])

  useEffect(() => {
    if (!clientId || !token) return

    const socket = io(`${API_ROOT}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket
    socket.on('unread:update', (data: { unread: number }) => setUnread(data.unread))

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [clientId, token])

  // В самом чате кнопка только перекрыла бы поле ввода, а на входе в кабинет
  // писать некому — авторизации ещё нет.
  if (!clientId || pathname === '/lk/chat' || pathname === '/lk/login') return null

  return (
    <Link href="/lk/chat" className={styles.fab} aria-label="Открыть чат с Pandoroom">
      <span className={styles.icon}>💬</span>
      {unread > 0 && <span className={styles.badge}>{unread > 99 ? '99+' : unread}</span>}
    </Link>
  )
}
