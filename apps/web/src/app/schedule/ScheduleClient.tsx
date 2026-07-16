'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import styles from './schedule.module.css'
import BookingModal from '@/components/BookingModal'
import type { Quest } from '@/lib/api'

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const WEEKDAY_FULL = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']
const MONTH_NAMES = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

const difficultyLabels: Record<string, string> = {
  easy: 'Легкий',
  medium: 'Средний',
  hard: 'Сложный',
}

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

/** Genre → CSS class suffix for tag pill color */
function tagClass(genre: string): string {
  const g = genre.toLowerCase()
  if (g.includes('хоррор') || g.includes('horror')) return styles.tagHorror
  if (g.includes('детектив') || g.includes('detective')) return styles.tagDetective
  if (g.includes('детск') || g.includes('kids') || g.includes('для детей')) return styles.tagKids
  if (g.includes('экш') || g.includes('action')) return styles.tagAction
  if (g.includes('приключ') || g.includes('adventure')) return styles.tagAdventure
  if (g.includes('мист') || g.includes('mystic')) return styles.tagMystic
  if (g === 'vr') return styles.tagVR
  return ''
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
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface ScheduleClientProps {
  quests: Quest[]
}

export default function ScheduleClient({ quests }: ScheduleClientProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })

  const [scheduleMap, setScheduleMap] = useState<Record<string, { slots: ScheduleSlot[]; durationMinutes: number }>>({})
  const [loading, setLoading] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingSlotInfo, setBookingSlotInfo] = useState('')

  const datePickerRef = useRef<HTMLDivElement>(null)

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

  // Build quest lookup
  const questById = useMemo(() => {
    const map: Record<string, Quest> = {}
    for (const q of quests) map[q.id] = q
    return map
  }, [quests])

  // Fetch schedule when date changes
  useEffect(() => {
    let cancelled = false
    const dateKey = formatDateKey(selectedDate)
    setLoading(true)

    fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api/public'}/schedule/grid?date=${dateKey}`)
      .then(res => res.ok ? res.json() : [])
      .then((data: QuestSchedule[]) => {
        if (cancelled) return
        const map: Record<string, { slots: ScheduleSlot[]; durationMinutes: number }> = {}
        for (const qs of data) {
          map[qs.questId] = { slots: qs.slots, durationMinutes: qs.durationMinutes }
        }
        setScheduleMap(map)
      })
      .catch(() => {
        if (!cancelled) setScheduleMap({})
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
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

  // Collect all unique time slots across all quests for column alignment
  const allTimeSlots = useMemo(() => {
    const timeSet = new Set<string>()
    Object.values(scheduleMap).forEach(({ slots }) => {
      slots.forEach(s => timeSet.add(s.startTime))
    })
    return Array.from(timeSet).sort()
  }, [scheduleMap])

  // Filter quests that have schedule slots for this date
  const questsForDate = useMemo(() => {
    return quests.filter(q => scheduleMap[q.id]?.slots.length > 0)
  }, [quests, scheduleMap])

  const openBooking = (questName: string, slotTime: string, price: number) => {
    const dayNum = selectedDate.getDate()
    const monthName = MONTH_NAMES[selectedDate.getMonth()]
    setBookingSlotInfo(`${questName} — ${dayNum} ${monthName}, ${slotTime} — ${price} ₽`)
    setBookingOpen(true)
  }

  return (
    <main>
      {/* ==================== HEADER ==================== */}
      <section className={styles.sectionHeader}>
        <div className="container">
          <nav className={styles.breadcrumb} aria-label="Навигация">
            <Link href="/" className={styles.breadcrumbLink}>Главная</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <Link href="/quests" className={styles.breadcrumbLink}>Квесты</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>Расписание</span>
          </nav>
          <h1 className={styles.pageTitle}>Расписание квестов</h1>
          <p className={styles.pageSubtitle}>
            Выберите удобный день и время для игры
          </p>
        </div>
      </section>

      {/* ==================== DATE PICKER ==================== */}
      <section className={styles.sectionDates}>
        <div className="container">
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
                    <span className={styles.datePickerNum}>
                      {dayNum} <span className={styles.datePickerMonth}>/ {monthNum}</span>
                    </span>
                    <span className={styles.datePickerWeekday}>{WEEKDAY_FULL[dayIdx]}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SCHEDULE TABLE ==================== */}
      <section className={styles.sectionSchedule}>
        <div className="container">
          {loading ? (
            <p className={styles.emptyMsg}>Загрузка расписания...</p>
          ) : questsForDate.length === 0 ? (
            <p className={styles.emptyMsg}>
              На эту дату расписание пока не заполнено. Попробуйте выбрать другой день.
            </p>
          ) : (
            <div className={styles.scheduleTable}>
              {/* Time column header */}
              <div className={styles.scheduleHeader}>
                <div className={styles.questCol}>Квест</div>
                <div className={styles.slotsCol}>
                  {allTimeSlots.map(time => (
                    <span key={time} className={styles.timeHeader}>{time}</span>
                  ))}
                </div>
              </div>

              {/* Quest rows */}
              {questsForDate.map((q) => {
                const entry = scheduleMap[q.id]
                if (!entry) return null
                const { slots } = entry
                const slotMap = new Map(slots.map(s => [s.startTime, s]))
                const posterUrl = q.previewImage?.url || ''
                const tCls = tagClass(q.genre)

                return (
                  <div key={q.id} className={styles.scheduleRow}>
                    {/* Quest info column */}
                    <div className={styles.questCol}>
                      <Link href={`/quests/${q.id}`} className={styles.questLink}>
                        {posterUrl && (
                          <div className={styles.questPoster}>
                            <Image
                              src={posterUrl}
                              alt={q.name}
                              fill
                              sizes="60px"
                              className={styles.questPosterImg}
                            />
                          </div>
                        )}
                        <div className={styles.questInfo}>
                          <h3 className={styles.questName}>{q.name}</h3>
                          <div className={styles.questMeta}>
                            {q.genre && (
                              <span className={`${styles.questTag}${tCls ? ` ${tCls}` : ''}`}>
                                {q.genre}
                              </span>
                            )}
                            <span className={styles.questMetaText}>{q.durationMinutes} мин</span>
                            <span className={styles.questMetaText}>{q.minPlayers}-{q.maxPlayers} игроков</span>
                            <span className={styles.questMetaText}>{q.ageRestriction || '12+'}</span>
                          </div>
                        </div>
                      </Link>
                    </div>

                    {/* Time slots column */}
                    <div className={styles.slotsCol}>
                      {allTimeSlots.map((time) => {
                        const slot = slotMap.get(time)

                        if (!slot) {
                          return <div key={time} className={styles.slotEmpty} />
                        }

                        // Filter past slots when viewing today
                        if (viewingToday) {
                          const [h, m] = slot.startTime.split(':').map(Number)
                          const nowH = now.getHours()
                          const nowM = now.getMinutes()
                          if (h < nowH || (h === nowH && m <= nowM)) {
                            return (
                              <div key={time} className={styles.slotPassed}>
                                <span className={styles.slotTime}>{time}</span>
                              </div>
                            )
                          }
                        }

                        if (slot.isBooked) {
                          return (
                            <div key={time} className={styles.slotBooked}>
                              <span className={styles.slotTime}>{time}</span>
                              <span className={styles.slotStatus}>Занято</span>
                            </div>
                          )
                        }

                        return (
                          <button
                            key={time}
                            className={styles.slotFree}
                            onClick={() => openBooking(q.name, slot.startTime, slot.finalPrice)}
                          >
                            <span className={styles.slotTime}>{time}</span>
                            <span className={styles.slotPrice}>{slot.finalPrice} ₽</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Booking modal */}
      <BookingModal
        open={bookingOpen}
        slotInfo={bookingSlotInfo}
        onClose={() => setBookingOpen(false)}
      />
    </main>
  )
}
