'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import styles from './quests.module.css'
import type { Quest } from '@/lib/api'

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

/* Gradient placeholders per quest (deterministic from index) */
const gradients = [
  'linear-gradient(135deg, #1a1028 0%, #0a0a0a 100%)',
  'linear-gradient(135deg, #1a2010 0%, #07080a 100%)',
  'linear-gradient(135deg, #20180a 0%, #08070a 100%)',
  'linear-gradient(135deg, #15101f 0%, #050514 100%)',
  'linear-gradient(135deg, #20102a 0%, #070514 100%)',
  'linear-gradient(135deg, #0f1a20 0%, #060a0a 100%)',
  'linear-gradient(135deg, #201a10 0%, #0a0806 100%)',
]

const WEEKDAY_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getWeekdayIdx(d: Date): number {
  // 0=Mon ... 6=Sun
  return d.getDay() === 0 ? 6 : d.getDay() - 1
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
  'Для детей',
]

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface QuestsClientProps {
  quests: Quest[]
}

export default function QuestsClient({ quests }: QuestsClientProps) {
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
          <h1 className={styles.catalogTitle}>Выберите квест во Владивостоке</h1>

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

            {/* Date Picker */}
            <div ref={datePickerRef} className={styles.datePicker}>
              <div className={styles.datePickerTrack}>
                {dates.map((d) => {
                  const isSelected = formatDateKey(d) === formatDateKey(selectedDate)
                  const dayIdx = getWeekdayIdx(d)
                  return (
                    <button
                      key={formatDateKey(d)}
                      className={`${styles.datePickerDay}${isSelected ? ` ${styles.datePickerDayActive}` : ''}`}
                      onClick={() => setSelectedDate(d)}
                    >
                      <span className={styles.datePickerNum}>{d.getDate()}</span>
                      <span className={styles.datePickerWeekday}>{WEEKDAY_SHORT[dayIdx]}</span>
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
              {filteredQuests.map((q, idx) => {
                const diff = difficultyNumber(q.difficulty)
                const posterUrl = q.previewImage?.url || ''
                const slots = scheduleMap[q.id] || []

                return (
                  <article
                    key={q.id}
                    className={styles.qcard}
                    style={
                      {
                        '--poster': posterUrl
                          ? `url('${posterUrl}') center/cover no-repeat`
                          : gradients[idx % gradients.length],
                      } as React.CSSProperties
                    }
                  >
                    <div className={styles.qcardPoster} />
                    <div className={styles.qcardBody}>
                      <h3 className={styles.qcardTitle}>
                        {q.name}
                        {q.subtitle && (
                          <>
                            <br />
                            <span className={styles.qcardSub}>{q.subtitle}</span>
                          </>
                        )}
                      </h3>
                      <div className={styles.qcardMeta}>
                        <DifficultyDots level={diff} />
                        <span className={styles.qcardInfo}>{q.durationMinutes} мин</span>
                        <span className={styles.qcardInfo}>{q.minPlayers}-{q.maxPlayers} игроков</span>
                        <span className={styles.qcardInfo}>{q.ageRestriction || '12+'}</span>
                      </div>
                      {/* Time Slots */}
                      {slots.length > 0 && (
                        <div className={styles.qcardSlots}>
                          {slots.map((slot) => (
                            <span
                              key={slot.slotId}
                              className={`${styles.qcardSlot}${slot.isBooked ? ` ${styles.qcardSlotBooked}` : ''}`}
                              title={slot.isBooked ? 'Забронировано' : `Свободно — ${slot.finalPrice} ₽`}
                            >
                              {slot.startTime}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/quests/${q.id}`}
                      className={styles.qcardLink}
                      aria-label="Подробнее"
                    />
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
