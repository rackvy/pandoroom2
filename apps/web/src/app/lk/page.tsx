'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { lkFetch, type ClientProfile, type ChatMessage } from '@/lib/lk-api'
import styles from './page.module.css'

type Tab = 'holidays' | 'quests' | 'chat' | 'photos' | 'bonuses' | 'passport' | 'profile'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: 'Черновик', className: styles.statusDraft },
  confirmed: { label: 'Подтверждено', className: styles.statusConfirmed },
  done: { label: 'Завершено', className: styles.statusDone },
  cancelled: { label: 'Отменено', className: styles.statusCancelled },
  paid: { label: 'Оплачено', className: styles.statusConfirmed },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(timeStr: string) {
  // Parse HH:MM or HH:MM:SS directly to avoid timezone issues
  const parts = timeStr.split(':')
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
}

export default function DashboardPage() {
  const { client, isLoading: authLoading, logout, updateClient } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('holidays')
  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [bookingChats, setBookingChats] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    if (!authLoading && !client) {
      router.push('/lk/login')
    }
  }, [authLoading, client, router])

  useEffect(() => {
    if (!client) return
    loadData()
  }, [client])

  const loadData = async () => {
    try {
      setLoading(true)
      const [profileData, messages, unread, bookingChatsData] = await Promise.all([
        lkFetch('/profile'),
        lkFetch('/chat').catch(() => []),
        lkFetch('/chat/unread').catch(() => ({ unread: 0 })),
        lkFetch('/chat/bookings').catch(() => []),
      ])
      setProfile(profileData)
      setChatMessages(messages)
      setUnreadCount(unread.unread)
      setBookingChats(bookingChatsData)
    } catch (err) {
      console.error('Failed to load ЛК data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !client) {
    return <div className={styles.loading}>Загрузка...</div>
  }

  if (loading) {
    return <div className={styles.loading}>Загружаем ваш кабинет...</div>
  }

  const bookings = profile?.bookings || []
  const questReservations = profile?.questReservations || []
  const lastMessage = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null

  const startEditName = () => {
    setEditName(client.name)
    setIsEditingName(true)
  }

  const cancelEditName = () => {
    setIsEditingName(false)
    setEditName('')
  }

  const saveName = async () => {
    const trimmed = editName.trim()
    if (!trimmed || trimmed === client.name) {
      cancelEditName()
      return
    }
    setSavingName(true)
    try {
      const updated = await lkFetch('/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: trimmed }) })
      updateClient({ name: updated.name })
      setIsEditingName(false)
    } catch (err) {
      console.error('Failed to update name:', err)
    } finally {
      setSavingName(false)
    }
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.container}>
        {/* Greeting */}
        <div className={styles.header}>
          <h1 className={styles.greeting}>
            Приветствуем, <span className={styles.greetingName}>{client.name}</span>
          </h1>
          <p className={styles.subtitle}>Ваш личный кабинет Pandoroom</p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {[
            { key: 'holidays' as Tab, label: 'Мои праздники' },
            { key: 'quests' as Tab, label: 'Квесты' },
            { key: 'chat' as Tab, label: 'Чат' },
            { key: 'photos' as Tab, label: 'Фотоотчеты' },
            { key: 'bonuses' as Tab, label: 'Скидки и бонусы' },
            { key: 'passport' as Tab, label: 'Паспорт игрока' },
            { key: 'profile' as Tab, label: 'Профиль' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Мои праздники */}
        {activeTab === 'holidays' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Мои праздники</h2>
            {bookings.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🎉</div>
                <p className={styles.emptyText}>У вас пока нет забронированных праздников</p>
              </div>
            ) : (
              <div className={styles.cardGrid}>
                {bookings.map(booking => {
                  const status = STATUS_LABELS[booking.status] || STATUS_LABELS.draft
                  return (
                    <div key={booking.id} className={styles.card}>
                      <h3 className={styles.cardTitle}>
                        {booking.questReservations.length > 0
                          ? booking.questReservations.map(qr => qr.quest.name).join(', ')
                          : 'Праздник'}
                      </h3>
                      <p className={styles.cardMeta}>
                        {formatDate(booking.eventDate)} &middot; {booking.branch.name}
                      </p>
                      {booking.questReservations.length > 0 && (
                        <p className={styles.cardMeta}>
                          {formatTime(booking.questReservations[0].startTime)} — {formatTime(booking.questReservations[0].endTime)}
                        </p>
                      )}
                      <span className={`${styles.cardStatus} ${status.className}`}>
                        {status.label}
                      </span>
                      <button
                        className={styles.cardChatBtn}
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/lk/chat?bookingId=${booking.id}`)
                        }}
                      >
                        💬 Чат
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Квесты */}
        {activeTab === 'quests' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Забронированные квесты</h2>
            {questReservations.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🎮</div>
                <p className={styles.emptyText}>У вас пока нет забронированных квестов</p>
              </div>
            ) : (
              <div className={styles.cardGrid}>
                {questReservations.map(qr => {
                  const status = STATUS_LABELS[qr.status] || STATUS_LABELS.draft
                  return (
                    <div key={qr.id} className={styles.card}>
                      <div className={styles.cardImage}>
                        {qr.quest.previewImage ? (
                          <img src={qr.quest.previewImage.url} alt={qr.quest.name} />
                        ) : (
                          '🎭'
                        )}
                      </div>
                      <h3 className={styles.cardTitle}>{qr.quest.name}</h3>
                      <p className={styles.cardMeta}>
                        {formatDate(qr.eventDate)} &middot; {formatTime(qr.startTime)} — {formatTime(qr.endTime)}
                      </p>
                      <p className={styles.cardMeta}>{qr.branch.name}</p>
                      <span className={`${styles.cardStatus} ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Чат */}
        {activeTab === 'chat' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Чат</h2>

            {/* General chat */}
            <div
              className={styles.chatPreview}
              onClick={() => router.push('/lk/chat')}
            >
              <div className={styles.chatIcon}>💬</div>
              <div className={styles.chatInfo}>
                <p className={styles.chatTitle}>Общий чат с Pandoroom</p>
                <p className={styles.chatLastMessage}>
                  {lastMessage ? lastMessage.text : 'Написать общий вопрос'}
                </p>
              </div>
              {unreadCount > 0 && (
                <span className={styles.chatBadge}>{unreadCount}</span>
              )}
            </div>

            {/* Per-booking chats */}
            {bookingChats.length > 0 && (
              <div className={styles.bookingChatsList}>
                <h3 className={styles.bookingChatsTitle}>Чаты по бронированиям</h3>
                {bookingChats.map((item: any) => (
                  <div
                    key={item.booking.id}
                    className={styles.bookingChatItem}
                    onClick={() => router.push(`/lk/chat?bookingId=${item.booking.id}`)}
                  >
                    <div className={styles.bookingChatInfo}>
                      <p className={styles.bookingChatName}>
                        {item.booking.clientName}
                      </p>
                      <p className={styles.bookingChatDate}>
                        {new Date(item.booking.eventDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </p>
                      {item.lastMessage && (
                        <p className={styles.bookingChatPreview}>
                          {item.lastMessage.sender === 'client' ? 'Вы: ' : item.lastMessage.sender === 'system' ? '🔔 ' : ''}
                          {item.lastMessage.text}
                        </p>
                      )}
                    </div>
                    {item.unreadCount > 0 && (
                      <span className={styles.chatBadge}>{item.unreadCount}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Фото */}
        {activeTab === 'photos' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Фотоотчеты</h2>
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>📸</div>
              <p className={styles.emptyText}>Фото с ваших мероприятий появятся здесь</p>
            </div>
          </div>
        )}

        {/* Tab: Бонусы */}
        {activeTab === 'bonuses' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Скидки и бонусы</h2>
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>🎁</div>
              <p className={styles.emptyText}>Специальные предложения для вас появятся здесь</p>
            </div>
          </div>
        )}

        {/* Tab: Паспорт */}
        {activeTab === 'passport' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Паспорт игрока</h2>
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>🏆</div>
              <p className={styles.emptyText}>Программа лояльности скоро будет доступна</p>
            </div>
          </div>
        )}

        {/* Tab: Профиль */}
        {activeTab === 'profile' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Профиль</h2>
            <div className={styles.profileCard}>
              <div className={styles.profileRow}>
                <span className={styles.profileLabel}>Имя</span>
                {isEditingName ? (
                  <div className={styles.editNameGroup}>
                    <input
                      className={styles.editNameInput}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveName()
                        if (e.key === 'Escape') cancelEditName()
                      }}
                    />
                    <button className={styles.editNameBtn} onClick={saveName} disabled={savingName}>
                      {savingName ? '...' : 'Сохранить'}
                    </button>
                    <button className={styles.editNameCancel} onClick={cancelEditName}>
                      Отмена
                    </button>
                  </div>
                ) : (
                  <div className={styles.profileValueGroup}>
                    <span className={styles.profileValue}>{client.name}</span>
                    <button className={styles.editBtn} onClick={startEditName} title="Изменить имя">
                      ✎
                    </button>
                  </div>
                )}
              </div>
              <div className={styles.profileRow}>
                <span className={styles.profileLabel}>Телефон</span>
                <span className={styles.profileValue}>{client.phone}</span>
              </div>
              {client.email && (
                <div className={styles.profileRow}>
                  <span className={styles.profileLabel}>Email</span>
                  <span className={styles.profileValue}>{client.email}</span>
                </div>
              )}
              {client.birthday && (
                <div className={styles.profileRow}>
                  <span className={styles.profileLabel}>День рождения</span>
                  <span className={styles.profileValue}>{formatDate(client.birthday)}</span>
                </div>
              )}
              <button className={styles.logoutBtn} onClick={() => { logout(); router.push('/') }}>
                Выйти
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
