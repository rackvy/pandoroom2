'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import styles from './quests.module.css'
import type { Quest } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import BookingModal from '@/components/BookingModal'
import type { BookingSlotData } from '@/components/BookingModal'

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const difficultyMap: Record<string, number> = {
  easy: 1,
  medium: 3,
  hard: 5,
}

function difficultyNumber(d: string): number {
  return difficultyMap[d] ?? 3
}

function DifficultyDots({ level }: { level: number }) {
  return (
    <span className={styles.qcardDifficulty}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i
          key={i}
          className={`${styles.qcardDot}${i > level ? ` ${styles.qcardDotOff}` : ''}`}
        />
      ))}
    </span>
  )
}

/** Genre → CSS class suffix for tag pill color */
function tagClass(genre: string): string {
  const g = genre.toLowerCase()
  if (g.includes('хоррор') || g.includes('horror')) return styles.qcardTagHorror
  if (g.includes('детектив') || g.includes('detective')) return styles.qcardTagDetective
  if (g.includes('детск') || g.includes('kids') || g.includes('для детей')) return styles.qcardTagKids
  if (g.includes('экш') || g.includes('action')) return styles.qcardTagAction
  if (g.includes('приключ') || g.includes('adventure')) return styles.qcardTagAdventure
  if (g.includes('мист') || g.includes('mystic')) return styles.qcardTagMystic
  if (g === 'vr') return styles.qcardTagVR
  return ''
}

const WEEKDAY_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
const WEEKDAY_FULL = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']

function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 0=Mon ... 6=Sun */
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

interface QuestSchedule {
  questId: string
  questName: string
  durationMinutes: number
  slots: ScheduleSlot[]
}

/* ------------------------------------------------------------------ */
/*  Filter definitions                                                */
/* ------------------------------------------------------------------ */

const difficultyFilters = ['Все квесты', 'Легкий', 'Средний', 'Сложный']
const difficultyFilterMap: Record<string, string | null> = {
  'Все квесты': null,
  'Легкий': 'easy',
  'Средний': 'medium',
  'Сложный': 'hard',
}

const genres = [
  'все жанры',
  'Приключение',
  'Экшен',
  'Мистический',
  'Хоррор',
  'Детектив',
  'VR',
  'Для детей',
]

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface QuestsClientProps {
  quests: Quest[]
}

export default function QuestsClient({ quests }: QuestsClientProps) {
  const { client } = useAuth()
  const [activeDifficulty, setActiveDifficulty] = useState('Все квесты')
  const [activeGenre, setActiveGenre] = useState('все жанры')
  const [actorsOnly, setActorsOnly] = useState(false)

  // Date picker
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })

  // Schedule data keyed by questId
  const [scheduleMap, setScheduleMap] = useState<Record<string, ScheduleSlot[]>>({})
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const datePickerRef = useRef<HTMLDivElement>(null)

  // Booking modal
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingData, setBookingData] = useState<BookingSlotData | null>(null)

  // Subscribe modal
  const [subscribeOpen, setSubscribeOpen] = useState(false)
  const [subscribeSlot, setSubscribeSlot] = useState<{ questId: string; questName: string; slotId: string; startTime: string } | null>(null)
  const [subscribePhone, setSubscribePhone] = useState('')
  const [subscribeLoading, setSubscribeLoading] = useState(false)
  const [subscribeSuccess, setSubscribeSuccess] = useState(false)

  // Generate 14 days starting from today
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

  // Fetch schedule when date changes
  useEffect(() => {
    let cancelled = false
    const dateKey = formatDateKey(selectedDate)

    setScheduleLoading(true)

    fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api/public'}/schedule/grid?date=${dateKey}`)
      .then(res => res.ok ? res.json() : [])
      .then((data: QuestSchedule[]) => {
        if (cancelled) return
        const map: Record<string, ScheduleSlot[]> = {}
        for (const qs of data) {
          map[qs.questId] = qs.slots
        }
        setScheduleMap(map)
      })
      .catch(() => {
        if (!cancelled) setScheduleMap({})
      })
      .finally(() => {
        if (!cancelled) setScheduleLoading(false)
      })

    return () => { cancelled = true }
  }, [selectedDate])

  // Auto-scroll date picker to selected date on mount
  useEffect(() => {
    if (datePickerRef.current) {
      const activeEl = datePickerRef.current.querySelector(`.${styles.datePickerDayActive}`)
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }
  }, [])

  // Current time for filtering past slots
  const now = useMemo(() => new Date(), [])
  const viewingToday = isSameDay(selectedDate, now)

  const filteredQuests = useMemo(() => {
    return quests.filter((q) => {
      const diffKey = difficultyFilterMap[activeDifficulty]
      if (diffKey && q.difficulty !== diffKey) return false

      if (activeGenre !== 'все жанры') {
        const genreLower = q.genre.toLowerCase()
        const filterLower = activeGenre.toLowerCase()
        if (!genreLower.includes(filterLower)) return false
      }

      if (actorsOnly && !q.hasActors) return false

      return true
    })
  }, [quests, activeDifficulty, activeGenre, actorsOnly])

  // Slot click handlers
  function handleSlotClick(quest: Quest, slot: ScheduleSlot) {
    if (slot.isBooked) {
      setSubscribeSlot({ questId: quest.id, questName: quest.name, slotId: slot.slotId, startTime: slot.startTime })
      setSubscribePhone(client?.phone || '')
      setSubscribeSuccess(false)
      setSubscribeOpen(true)
    } else {
      const slotData: BookingSlotData = {
        slotId: slot.slotId,
        questId: quest.id,
        questName: quest.name,
        eventDate: formatDateKey(selectedDate),
        time: slot.startTime,
        price: slot.finalPrice,
        maxPlayers: quest.maxPlayers,
        minPlayers: quest.minPlayers,
        extraPlayerPrice: quest.extraPlayerPrice || 0,
        allowAnimator: quest.allowAnimator || false,
        animatorPrice: quest.animatorPrice || 0,
      }
      setBookingData(slotData)
      setBookingOpen(true)
    }
  }

  function handleBookingSuccess(slotId: string) {
    setScheduleMap(prev => {
      const newMap = { ...prev }
      for (const questId in newMap) {
        newMap[questId] = newMap[questId].map(s =>
          s.slotId === slotId ? { ...s, isBooked: true } : s
        )
      }
      return newMap
    })
  }

  async function handleSubscribeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subscribeSlot) return
    const digits = subscribePhone.replace(/\D/g, '')
    if (digits.length < 11) return

    setSubscribeLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/public'
      const res = await fetch(`${apiUrl}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questId: subscribeSlot.questId,
          desiredDate: formatDateKey(selectedDate),
          desiredTime: subscribeSlot.startTime,
          clientName: client?.name || 'Гость',
          clientPhone: digits,
        }),
      })
      if (res.ok) {
        setSubscribeSuccess(true)
      }
    } catch (err) {
      console.error('Waitlist error:', err)
    } finally {
      setSubscribeLoading(false)
    }
  }

  return (
    <main>
      {/* ==================== CATALOG HEADER + FILTERS ==================== */}
      <section className={styles.sectionCatalog}>
        <div className="container">
          <nav className={styles.breadcrumb} aria-label="Навигация">
            <Link href="/" className={styles.breadcrumbLink}>
              Главная
            </Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>Квесты</span>
          </nav>
          <div className={styles.catalogHeader}>
            <h1 className={styles.catalogTitle}>Выберите квест во Владивостоке</h1>
            <Link href="/schedule" className={styles.scheduleBtn}>Расписание</Link>
          </div>

          {/* Filters */}
          <div className={styles.catalogFilters}>
            {/* Difficulty filter chips */}
            <div className={styles.filtersRow}>
              {difficultyFilters.map((label) => (
                <button
                  key={label}
                  className={`${styles.filterChip}${activeDifficulty === label ? ` ${styles.filterChipActive}` : ''}`}
                  onClick={() => setActiveDifficulty(label)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Genre chips + toggle */}
            <div className={styles.filtersRow}>
              <div className={styles.filtersGenres}>
                {genres.map((g) => (
                  <button
                    key={g}
                    className={`${styles.genreChip}${activeGenre === g ? ` ${styles.genreChipActive}` : ''}`}
                    onClick={() => setActiveGenre(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <label className={styles.filterToggle}>
                <input
                  type="checkbox"
                  className={styles.filterToggleInput}
                  checked={actorsOnly}
                  onChange={(e) => setActorsOnly(e.target.checked)}
                />
                <span className={styles.filterToggleLabel}>Квесты с актерами</span>
              </label>
            </div>

            {/* Date Picker — DD / MM + full weekday, weekends in red */}
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
                      <span className={styles.datePickerDay}>
                        {dayNum} <span className={styles.datePickerMonth}>/ {monthNum}</span>
                      </span>
                      <span className={styles.datePickerWeekday}>{WEEKDAY_FULL[dayIdx]}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== QUEST GRID ==================== */}
      <section className={styles.sectionQuestGrid}>
        <div className="container">
          {filteredQuests.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '48px 0' }}>
              Квесты не найдены. Попробуйте изменить фильтры.
            </p>
          ) : (
            <div className={styles.questGrid}>
              {filteredQuests.map((q) => {
                const diff = difficultyNumber(q.difficulty)
                const posterUrl = q.previewImage?.url || ''
                const tCls = tagClass(q.genre)
                let slots = scheduleMap[q.id] || []

                // Sort chronologically
                slots = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime))

                // Filter out past slots when viewing today
                if (viewingToday) {
                  const nowH = now.getHours()
                  const nowM = now.getMinutes()
                  slots = slots.filter((s) => {
                    const [h, m] = s.startTime.split(':').map(Number)
                    return h > nowH || (h === nowH && m > nowM)
                  })
                }

                return (
                  <div key={q.id} className={styles.qcardWrapper}>
                    {/* Card (homepage style with glow) */}
                    <article
                      className={styles.qcard}
                      style={
                        posterUrl
                          ? ({ '--poster': `url('${posterUrl}')` } as React.CSSProperties)
                          : undefined
                      }
                    >
                      {/* Full-bleed poster */}
                      <div className={styles.qcardPoster}>
                        {posterUrl ? (
                          <Image
                            src={posterUrl}
                            alt={q.previewImage?.altText || q.name}
                            fill
                            sizes="(max-width: 768px) 50vw, 25vw"
                            className={styles.qcardPosterImg}
                          />
                        ) : (
                          <div className={styles.qcardPosterImg} />
                        )}
                      </div>

                      {/* Genre tag pill */}
                      {q.genre && (
                        <span className={`${styles.qcardTag}${tCls ? ` ${tCls}` : ''}`}>
                          {q.genre}
                        </span>
                      )}

                      {/* Body — title + meta */}
                      <div className={styles.qcardBody}>
                        <h3 className={styles.qcardTitle}>{q.name}</h3>
                        <div className={styles.qcardMeta}>
                          <DifficultyDots level={diff} />
                          <span className={styles.qcardInfo}>{q.durationMinutes} мин</span>
                          <span className={styles.qcardInfo}>{q.minPlayers}-{q.maxPlayers} игроков</span>
                          <span className={styles.qcardInfo}>{q.ageRestriction || '12+'}</span>
                        </div>
                      </div>

                      {/* Full-card link overlay */}
                      <Link
                        href={`/quests/${q.id}`}
                        className={styles.qcardLink}
                        aria-label="Подробнее"
                      />
                    </article>

                    {/* Time slots — below the card */}
                    {slots.length > 0 ? (
                      <div className={styles.qcardSlots}>
                        {slots.map((slot) => (
                          <button
                            key={slot.slotId}
                            type="button"
                            className={`${styles.qcardSlot}${slot.isBooked ? ` ${styles.qcardSlotBooked}` : ''}`}
                            title={slot.isBooked ? 'Подписаться на уведомление' : `Свободно — ${slot.finalPrice} ₽`}
                            onClick={() => handleSlotClick(q, slot)}
                          >
                            {slot.startTime}
                          </button>
                        ))}
                      </div>
                    ) : (
                      !scheduleLoading && (
                        <p className={styles.qcardNoSlots}>Нет свободных слотов</p>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ==================== BOOKING MODAL ==================== */}
      <BookingModal
        open={bookingOpen}
        slotData={bookingData}
        onClose={() => setBookingOpen(false)}
        onSuccess={handleBookingSuccess}
      />

      {/* ==================== SUBSCRIBE MODAL ==================== */}
      {subscribeOpen && subscribeSlot && (
        <div className={styles.subscribeModal}>
          <div className={styles.subscribeOverlay} onClick={() => setSubscribeOpen(false)} />
          <div className={styles.subscribeDialog}>
            <button className={styles.subscribeClose} onClick={() => setSubscribeOpen(false)}>&times;</button>
            {subscribeSuccess ? (
              <div className={styles.subscribeSuccess}>
                <div className={styles.subscribeSuccessIcon}>&#10003;</div>
                <h3 className={styles.subscribeTitle}>Вы подписаны!</h3>
                <p className={styles.subscribeText}>
                  Мы уведомим вас, когда время <strong>{subscribeSlot.startTime}</strong> на квест{' '}
                  <strong>{subscribeSlot.questName}</strong> освободится.
                </p>
                <button className={styles.subscribeBtn} onClick={() => setSubscribeOpen(false)}>
                  Закрыть
                </button>
              </div>
            ) : (
              <>
                <h3 className={styles.subscribeTitle}>Подписаться на уведомление</h3>
                <p className={styles.subscribeDesc}>
                  Время <strong>{subscribeSlot.startTime}</strong> на квест{' '}
                  <strong>{subscribeSlot.questName}</strong> занято. Оставьте номер телефона — мы
                  отправим уведомление, когда оно освободится.
                </p>
                <form className={styles.subscribeForm} onSubmit={handleSubscribeSubmit}>
                  <input
                    type="tel"
                    className={styles.subscribeInput}
                    placeholder="+7 (___) ___-__-__"
                    value={subscribePhone}
                    onChange={(e) => setSubscribePhone(e.target.value)}
                    required
                    disabled={subscribeLoading}
                    inputMode="numeric"
                  />
                  <button
                    type="submit"
                    className={styles.subscribeBtn}
                    disabled={subscribeLoading || subscribePhone.replace(/\D/g, '').length < 11}
                  >
                    {subscribeLoading ? 'Отправка...' : 'Подписаться'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
