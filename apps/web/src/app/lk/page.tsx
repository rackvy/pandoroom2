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
  return new Date(timeStr).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DashboardPage() {
  const { client, isLoading: authLoading, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('holidays')
  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

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
      const [profileData, messages, unread] = await Promise.all([
        lkFetch('/profile'),
        lkFetch('/chat').catch(() => []),
        lkFetch('/chat/unread').catch(() => ({ unread: 0 })),
      ])
      setProfile(profileData)
      setChatMessages(messages)
      setUnreadCount(unread.unread)
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
            <div
              className={styles.chatPreview}
              onClick={() => router.push('/lk/chat')}
            >
              <div className={styles.chatIcon}>💬</div>
              <div className={styles.chatInfo}>
                <p className={styles.chatTitle}>Сообщения от Pandoroom</p>
                <p className={styles.chatLastMessage}>
                  {lastMessage ? lastMessage.text : 'Пока нет сообщений'}
                </p>
              </div>
              {unreadCount > 0 && (
                <span className={styles.chatBadge}>{unreadCount}</span>
              )}
            </div>
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
                <span className={styles.profileValue}>{client.name}</span>
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
