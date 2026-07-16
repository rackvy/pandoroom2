'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import styles from './quest-detail.module.css'
import BookingModal from '@/components/BookingModal'
import Lightbox from '@/components/Lightbox'
import type { QuestDetail } from '@/lib/api'

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const difficultyLabels: Record<string, string> = {
  easy: 'Легкий',
  medium: 'Средний',
  hard: 'Сложный',
}

const difficultyMap: Record<string, number> = {
  easy: 1,
  medium: 3,
  hard: 5,
}

function DifficultyDots({ level }: { level: number }) {
  return (
    <span className={styles.difficulty}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i
          key={i}
          className={`${styles.dot}${i > level ? ` ${styles.dotOff}` : ''}`}
        />
      ))}
    </span>
  )
}

const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const WEEKDAY_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getWeekdayIdx(d: Date): number {
  return d.getDay() === 0 ? 6 : d.getDay() - 1
}

function isWeekend(d: Date): boolean {
  const day = d.getDay()
  return day === 0 || day === 6
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ScheduleSlot {
  slotId: string
  startTime: string
  finalPrice: number
  isBooked: boolean
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface QuestDetailClientProps {
  quest: QuestDetail
}

export default function QuestDetailClient({ quest }: QuestDetailClientProps) {
  const [activeTab, setActiveTab] = useState('description')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingSlotInfo, setBookingSlotInfo] = useState('')

  // Date picker
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const datePickerRef = useRef<HTMLDivElement>(null)

  /* Build gallery images array */
  const galleryImages: string[] = quest.galleryPhotos.length > 0
    ? quest.galleryPhotos.map((gp) => gp.image.url)
    : quest.previewImage?.url
      ? [quest.previewImage.url]
      : []

  /* Generate 14 days starting from today */
  const dates = useMemo(() => {
    const result: Date[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 0; i < 14; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      result.push(d)
    }
    return result
  }, [])

  /* Fetch schedule when date changes */
  useEffect(() => {
    let cancelled = false
    const dateKey = formatDateKey(selectedDate)

    setScheduleLoading(true)

    fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api/public'}/schedule/grid?date=${dateKey}`)
      .then(res => res.ok ? res.json() : [])
      .then((data: Array<{ questId: string; slots: ScheduleSlot[] }>) => {
        if (cancelled) return
        const questData = data.find(q => q.questId === quest.id)
        setSlots(questData?.slots || [])
      })
      .catch(() => {
        if (!cancelled) setSlots([])
      })
      .finally(() => {
        if (!cancelled) setScheduleLoading(false)
      })

    return () => { cancelled = true }
  }, [selectedDate, quest.id])

  /* Auto-scroll date picker to selected date on mount */
  useEffect(() => {
    if (datePickerRef.current) {
      const activeEl = datePickerRef.current.querySelector(`.${styles.datePickerDayActive}`)
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }
  }, [])

  /* Current time for filtering past slots */
  const now = useMemo(() => new Date(), [])
  const viewingToday = isSameDay(selectedDate, now)

  const filteredSlots = useMemo(() => {
    let result = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime))
    if (viewingToday) {
      const nowH = now.getHours()
      const nowM = now.getMinutes()
      result = result.filter((s) => {
        const [h, m] = s.startTime.split(':').map(Number)
        return h > nowH || (h === nowH && m > nowM)
      })
    }
    return result
  }, [slots, viewingToday, now])

  /* Tabs definition */
  const tabs = [
    { key: 'description', label: 'Описание' },
    { key: 'rules', label: 'Правила' },
    { key: 'safety', label: 'Безопасность' },
    { key: 'extras', label: 'Доп. услуги' },
  ]

  /* Tab content mapping */
  const tabContent: Record<string, string> = {
    description: quest.description,
    rules: quest.rules,
    safety: quest.safety,
    extras: quest.extraServices,
  }

  /* Hero background */
  const heroBg = quest.backgroundImage?.url
    ? `url('${quest.backgroundImage.url}')`
    : quest.previewImage?.url
      ? `url('${quest.previewImage.url}')`
      : null

  const diff = difficultyMap[quest.difficulty] ?? 3

  /* Tab switching */
  const handleTabClick = (tabKey: string) => {
    setActiveTab(tabKey)
  }

  /* Lightbox */
  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }
  const closeLightbox = () => setLightboxOpen(false)
  const showPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)
  }, [galleryImages.length])
  const showNext = useCallback(() => {
    setLightboxIndex((prev) => (prev + 1) % galleryImages.length)
  }, [galleryImages.length])

  /* Booking */
  const openBooking = (slotTime?: string, price?: number) => {
    if (slotTime) {
      const dateStr = selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
      setBookingSlotInfo(`${quest.name} — ${dateStr}, ${slotTime} — ${price} ₽`)
    } else {
      setBookingSlotInfo('')
    }
    setBookingOpen(true)
  }
  const closeBooking = () => setBookingOpen(false)

  return (
    <main>
      {/* ==================== HERO ==================== */}
      <section className={styles.hero}>
        {/* Background image via Next.js Image */}
        {heroBg && (
          <div className={styles.heroBg}>
            <Image
              src={quest.backgroundImage?.url || quest.previewImage?.url || ''}
              alt={quest.name}
              fill
              sizes="100vw"
              priority
              className={styles.heroBgImg}
            />
          </div>
        )}
        <div className={styles.heroOverlay} />

        <div className={`container ${styles.heroInner}`}>
          {/* Breadcrumb */}
          <nav className={styles.breadcrumb}>
            <Link href="/" className={styles.breadcrumbLink}>Главная</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <Link href="/quests" className={styles.breadcrumbLink}>Квесты</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>{quest.name}</span>
          </nav>

          <div className={styles.heroContent}>
            {quest.previewImage?.url && (
              <div className={styles.heroPoster}>
                <Image
                  src={quest.previewImage.url}
                  alt={quest.name}
                  fill
                  sizes="120px"
                  priority
                  className={styles.heroPosterImg}
                />
              </div>
            )}
            <div className={styles.heroTextBlock}>
              <h1 className={styles.heroTitle}>{quest.name}</h1>
              {quest.subtitle && (
                <p className={styles.heroSubtitle}>{quest.subtitle}</p>
              )}

              {/* Quick specs row */}
              <div className={styles.heroSpecs}>
                <div className={styles.heroSpec}>
                  <span className={styles.heroSpecLabel}>Жанр</span>
                  <span className={styles.heroSpecValue}>{quest.genre}</span>
                </div>
                <div className={styles.heroSpecDivider} />
                <div className={styles.heroSpec}>
                  <span className={styles.heroSpecLabel}>Сложность</span>
                  <span className={styles.heroSpecValue}>
                    <DifficultyDots level={diff} />
                  </span>
                </div>
                <div className={styles.heroSpecDivider} />
                <div className={styles.heroSpec}>
                  <span className={styles.heroSpecLabel}>Время</span>
                  <span className={styles.heroSpecValue}>{quest.durationMinutes} мин</span>
                </div>
                <div className={styles.heroSpecDivider} />
                <div className={styles.heroSpec}>
                  <span className={styles.heroSpecLabel}>Игроки</span>
                  <span className={styles.heroSpecValue}>{quest.minPlayers}-{quest.maxPlayers}</span>
                </div>
                <div className={styles.heroSpecDivider} />
                <div className={styles.heroSpec}>
                  <span className={styles.heroSpecLabel}>Возраст</span>
                  <span className={styles.heroSpecValue}>{quest.ageRestriction || '12+'}</span>
                </div>
                {quest.hasActors && (
                  <>
                    <div className={styles.heroSpecDivider} />
                    <div className={styles.heroSpec}>
                      <span className={styles.heroSpecLabel}>Актёры</span>
                      <span className={styles.heroSpecValue}>Есть</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== GALLERY ==================== */}
      {galleryImages.length > 0 && (
        <section className={styles.gallery}>
          <div className="container">
            <h2 className={styles.sectionTitle}>Фотографии</h2>
            <div className={styles.galleryGrid}>
              {galleryImages.slice(0, 5).map((src, idx) => (
                <button
                  key={idx}
                  className={`${styles.galleryItem}${idx === 0 ? ` ${styles.galleryItemMain}` : ''}`}
                  onClick={() => openLightbox(idx)}
                >
                  <Image
                    src={src}
                    alt={`Фото квеста ${idx + 1}`}
                    fill
                    sizes={idx === 0 ? '(max-width: 768px) 100vw, 60vw' : '(max-width: 768px) 50vw, 20vw'}
                    className={styles.galleryImg}
                  />
                  {idx === 4 && galleryImages.length > 5 && (
                    <div className={styles.galleryMore}>
                      +{galleryImages.length - 5}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==================== TABS + INFO ==================== */}
      <section className={styles.info}>
        <div className="container">
          <h2 className={styles.sectionTitle}>О квесте</h2>

          <div className={styles.tabs}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`${styles.tabBtn}${activeTab === tab.key ? ` ${styles.tabBtnActive}` : ''}`}
                onClick={() => handleTabClick(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={styles.content}>
            <div className={styles.contentMain}>
              {tabs.map((tab) => (
                <div
                  key={tab.key}
                  className={`${styles.tabPanel}${activeTab === tab.key ? ` ${styles.tabPanelActive}` : ''}`}
                >
                  {tabContent[tab.key]
                    ? (
                        <div
                          className={styles.tabHtml}
                          dangerouslySetInnerHTML={{ __html: tabContent[tab.key] }}
                        />
                      )
                    : <p className={styles.noContent}>Информация отсутствует</p>
                  }
                </div>
              ))}
            </div>

            <aside className={styles.sidebar}>
              <div className={styles.sidebarCard}>
                <h3 className={styles.sidebarTitle}>Характеристики</h3>
                <div className={styles.specs}>
                  <div className={styles.spec}>
                    <span className={styles.specLabel}>Сложность</span>
                    <span className={styles.specValue}>
                      <DifficultyDots level={diff} />
                      <span className={styles.specValueText}>{difficultyLabels[quest.difficulty] || quest.difficulty}</span>
                    </span>
                  </div>
                  <div className={styles.spec}>
                    <span className={styles.specLabel}>Актёры</span>
                    <span className={styles.specValue}>{quest.hasActors ? 'С актёрами' : 'Без актёров'}</span>
                  </div>
                  <div className={styles.spec}>
                    <span className={styles.specLabel}>Игроки</span>
                    <span className={styles.specValue}>{quest.minPlayers}-{quest.maxPlayers} человек</span>
                  </div>
                  <div className={styles.spec}>
                    <span className={styles.specLabel}>Возраст</span>
                    <span className={styles.specValue}>{quest.ageRestriction || '12+'}</span>
                  </div>
                  <div className={styles.spec}>
                    <span className={styles.specLabel}>Время игры</span>
                    <span className={styles.specValue}>{quest.durationMinutes} минут</span>
                  </div>
                  <div className={styles.spec}>
                    <span className={styles.specLabel}>Доп. игрок</span>
                    <span className={styles.specValue}>{quest.extraPlayerPrice} ₽</span>
                  </div>
                  <div className={styles.spec}>
                    <span className={styles.specLabel}>Адрес</span>
                    <span className={styles.specValue}>{quest.address}</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ==================== SCHEDULE / BOOKING ==================== */}
      <section className={styles.schedule}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Выберите дату и время</h2>

          {/* Date Picker */}
          <div ref={datePickerRef} className={styles.datePicker}>
            <div className={styles.datePickerTrack}>
              {dates.map((d) => {
                const isSelected = formatDateKey(d) === formatDateKey(selectedDate)
                const dayIdx = getWeekdayIdx(d)
                const dayNum = String(d.getDate()).padStart(2, '0')
                const monthNum = String(d.getMonth() + 1).padStart(2, '0')
                const weekend = isWeekend(d)
                return (
                  <button
                    key={formatDateKey(d)}
                    className={
                      styles.datePickerDay +
                      (isSelected ? ` ${styles.datePickerDayActive}` : '') +
                      (weekend ? ` ${styles.datePickerWeekend}` : '')
                    }
                    onClick={() => setSelectedDate(d)}
                  >
                    <span className={styles.datePickerDate}>
                      {dayNum} <span className={styles.datePickerMonth}>/ {monthNum}</span>
                    </span>
                    <span className={styles.datePickerWeekday}>{WEEKDAY_FULL[dayIdx]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time Slots */}
          <div className={styles.scheduleSlots}>
            {scheduleLoading ? (
              <p className={styles.scheduleEmpty}>Загрузка расписания...</p>
            ) : filteredSlots.length > 0 ? (
              filteredSlots.map((slot) => (
                <button
                  key={slot.slotId}
                  className={`${styles.slotBtn}${slot.isBooked ? ` ${styles.slotBtnBooked}` : ''}`}
                  disabled={slot.isBooked}
                  onClick={() => openBooking(slot.startTime, slot.finalPrice)}
                  title={slot.isBooked ? 'Забронировано' : `Свободно — ${slot.finalPrice} ₽`}
                >
                  <span className={styles.slotTime}>{slot.startTime}</span>
                  {!slot.isBooked && (
                    <span className={styles.slotPrice}>{slot.finalPrice} ₽</span>
                  )}
                  {slot.isBooked && (
                    <span className={styles.slotBooked}>Занято</span>
                  )}
                </button>
              ))
            ) : (
              <p className={styles.scheduleEmpty}>
                Нет доступных слотов на выбранную дату. Попробуйте другой день или{' '}
                <button className={styles.scheduleLink} onClick={() => openBooking()}>
                  оставьте заявку
                </button>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Back link */}
      <div className="container" style={{ paddingBottom: 48 }}>
        <Link href="/quests" className={styles.backLink}>
          &larr; Назад к квестам
        </Link>
      </div>

      {/* ==================== BOOKING MODAL ==================== */}
      <BookingModal
        open={bookingOpen}
        slotInfo={bookingSlotInfo}
        onClose={closeBooking}
      />

      {/* ==================== LIGHTBOX ==================== */}
      {galleryImages.length > 0 && (
        <Lightbox
          open={lightboxOpen}
          images={galleryImages}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onPrev={showPrev}
          onNext={showNext}
        />
      )}
    </main>
  )
}
