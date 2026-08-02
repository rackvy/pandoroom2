'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { BASE_API_URL } from '@/lib/api'
import styles from './vr-booking.module.css'

/* ------------------------------------------------------------------ */
/*  Types & helpers                                                   */
/* ------------------------------------------------------------------ */

interface Slot {
  time: string
  free: number
  blocked: boolean
  pricePerHour: number
}

interface HallAvailability {
  id: string
  name: string
  maxCapacity: number
  slots: Slot[]
}

function formatDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minToHHMM(min: number): string {
  return `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

const WEEKDAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function buildDateOptions(count: number) {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    const label = i === 0
      ? 'Сегодня'
      : i === 1
        ? 'Завтра'
        : `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()}`
    options.push({ value: formatDateLocal(d), label })
  }
  return options
}

const DURATIONS = [60, 90, 120, 150, 180]

function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!m) return `${h} ч`
  return `${h} ч ${m} мин`
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface VRBookingSectionProps {
  branchId?: string | null
  gameId: string
}

export default function VRBookingSection({ branchId, gameId }: VRBookingSectionProps) {
  const [resolvedBranchId, setResolvedBranchId] = useState<string | null>(branchId || null)
  const [date, setDate] = useState<string>(formatDateLocal(new Date()))
  const [halls, setHalls] = useState<HallAvailability[]>([])
  const [hallId, setHallId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [startTime, setStartTime] = useState<string | null>(null)
  const [duration, setDuration] = useState<number>(60)
  const [guests, setGuests] = useState<number>(1)
  const [buyout, setBuyout] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const [buyoutTotal, setBuyoutTotal] = useState<number | null>(null)

  const dateOptions = useMemo(() => buildDateOptions(7), [])
  const selectedHall = halls.find((h) => h.id === hallId) || null

  /* Resolve branch: from the game, or the first VR-enabled branch */
  useEffect(() => {
    if (branchId) {
      setResolvedBranchId(branchId)
      return
    }
    let cancelled = false
    fetch(`${BASE_API_URL}/branches`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((branches: { id: string; hasVR?: boolean }[]) => {
        if (cancelled) return
        const vrBranch = branches.find((b) => b.hasVR)
        setResolvedBranchId(vrBranch ? vrBranch.id : null)
      })
      .catch(() => { if (!cancelled) setResolvedBranchId(null) })
    return () => { cancelled = true }
  }, [branchId])

  /* Load availability */
  useEffect(() => {
    if (!resolvedBranchId || !date) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    fetch(`${BASE_API_URL}/vr-schedule/availability?branchId=${resolvedBranchId}&date=${date}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('Не удалось загрузить расписание')
        return r.json()
      })
      .then((data: HallAvailability[]) => {
        if (cancelled) return
        setHalls(data)
        setHallId((prev) => (data.some((h) => h.id === prev) ? prev : data[0]?.id || ''))
      })
      .catch((e) => {
        if (!cancelled) {
          setHalls([])
          setLoadError(e.message || 'Не удалось загрузить расписание')
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [resolvedBranchId, date])

  /* Reset selection when date/hall changes */
  useEffect(() => {
    setStartTime(null)
    setSubmitError(null)
    setSubmitted(false)
    setBuyoutTotal(null)
  }, [date, hallId])

  const isPastSlot = useCallback((slotTime: string): boolean => {
    if (!date) return true
    const now = new Date()
    const [y, m, d] = date.split('-').map(Number)
    const total = timeToMinutes(slotTime)
    const slotDate = new Date(y, m - 1, d, Math.floor(total / 60), total % 60)
    return slotDate.getTime() < now.getTime() + 30 * 60 * 1000
  }, [date])

  /* Window analysis: min free seats across the selected start + duration */
  const windowInfo = useMemo(() => {
    if (!selectedHall || !startTime) return null
    const startMin = timeToMinutes(startTime)
    const endMin = startMin + duration
    if (endMin > 24 * 60) return { blocked: false, minFree: 0, overflow: true }
    let minFree = selectedHall.maxCapacity
    let blocked = false
    for (let seg = startMin; seg < endMin; seg += 30) {
      const slot = selectedHall.slots.find((s) => s.time === minToHHMM(seg))
      if (!slot) return null
      if (slot.blocked) { blocked = true; break }
      minFree = Math.min(minFree, slot.free)
    }
    return { blocked, minFree: blocked ? 0 : minFree, overflow: false }
  }, [selectedHall, startTime, duration])

  /* Buyout price quote */
  useEffect(() => {
    if (!buyout || !selectedHall || !startTime || !date) {
      setBuyoutTotal(null)
      return
    }
    const endTime = minToHHMM(timeToMinutes(startTime) + duration)
    let cancelled = false
    fetch(`${BASE_API_URL}/vr-schedule/price?hallId=${selectedHall.id}&date=${date}&startTime=${startTime}&endTime=${endTime}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setBuyoutTotal(data ? data.buyoutTotal : null) })
      .catch(() => { if (!cancelled) setBuyoutTotal(null) })
    return () => { cancelled = true }
  }, [buyout, selectedHall, startTime, duration, date])

  const startSlot = selectedHall?.slots.find((s) => s.time === startTime) || null
  const maxGuests = windowInfo ? Math.max(1, windowInfo.minFree) : 1

  useEffect(() => {
    if (guests > maxGuests) setGuests(maxGuests)
  }, [maxGuests, guests])

  const canSubmit =
    !!selectedHall &&
    !!startTime &&
    !!windowInfo &&
    !windowInfo.blocked &&
    !windowInfo.overflow &&
    (buyout || (guests >= 1 && guests <= windowInfo.minFree)) &&
    name.trim().length > 0 &&
    phone.trim().length >= 6 &&
    !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedHall || !startTime || !canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch(`${BASE_API_URL}/vr-schedule/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hallId: selectedHall.id,
          date,
          startTime,
          endTime: minToHHMM(timeToMinutes(startTime) + duration),
          guestsCount: buyout ? selectedHall.maxCapacity : guests,
          buyout,
          clientName: name.trim(),
          clientPhone: phone.trim(),
          gameId,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const msg = data && (data.message || data.error)
        throw new Error(Array.isArray(msg) ? msg.join(', ') : msg || 'Не удалось отправить заявку')
      }
      setSubmitted(true)
    } catch (err: any) {
      setSubmitError(err.message || 'Не удалось отправить заявку')
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------------------------------------------------------------- */

  if (!resolvedBranchId) {
    return null
  }

  return (
    <section className={styles.section} id="vr-booking">
      <div className="container">
        <h2 className={styles.title}>Забронировать VR</h2>
        <p className={styles.subtitle}>
          Выберите дату, время и количество мест — мы перезвоним для подтверждения.
        </p>

        <div className={styles.disclaimer}>
          <span className={styles.disclaimerIcon}>🎮</span>
          <span>
            Конкретную игру вы выбираете <strong>на месте</strong> — забронировать можно время
            и количество мест, а сценарий определите вместе с инструктором.
          </span>
        </div>

        {submitted ? (
          <div className={styles.success}>
            <div className={styles.successIcon}>✅</div>
            <h3 className={styles.successTitle}>Заявка отправлена!</h3>
            <p className={styles.successText}>
              Мы перезвоним вам в ближайшее время, чтобы подтвердить бронь
              {startTime && selectedHall ? ` на ${startTime} (${formatDuration(duration)})` : ''}.
            </p>
            <button
              className={styles.againBtn}
              onClick={() => { setSubmitted(false); setStartTime(null); setName(''); setPhone(''); setBuyout(false); setGuests(1); }}
            >
              Оформить ещё одну бронь
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Date */}
            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Дата</span>
              <div className={styles.chips}>
                {dateOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.chip}${date === opt.value ? ` ${styles.chipActive}` : ''}`}
                    onClick={() => setDate(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hall (if several) */}
            {halls.length > 1 && (
              <div className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Зал</span>
                <div className={styles.chips}>
                  {halls.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      className={`${styles.chip}${hallId === h.id ? ` ${styles.chipActive}` : ''}`}
                      onClick={() => setHallId(h.id)}
                    >
                      {h.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Slots */}
            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>
                Время {selectedHall && <span className={styles.fieldHint}>(свободно мест: {selectedHall.maxCapacity} всего)</span>}
              </span>
              {loading ? (
                <div className={styles.stateBox}>Загружаем расписание…</div>
              ) : loadError ? (
                <div className={styles.stateBox}>{loadError}</div>
              ) : !selectedHall ? (
                <div className={styles.stateBox}>На эту дату VR-зал не работает. Попробуйте другой день.</div>
              ) : (
                <div className={styles.slots}>
                  {selectedHall.slots.map((slot) => {
                    const past = isPastSlot(slot.time)
                    const disabled = past || slot.blocked || slot.free === 0
                    const active = startTime === slot.time
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={disabled}
                        className={[
                          styles.slot,
                          active ? styles.slotActive : '',
                          disabled ? styles.slotDisabled : '',
                          slot.blocked ? styles.slotBlocked : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => setStartTime(active ? null : slot.time)}
                        title={slot.blocked ? 'Время недоступно' : `Свободно ${slot.free} мест`}
                      >
                        <span className={styles.slotTime}>{slot.time}</span>
                        <span className={styles.slotFree}>
                          {slot.blocked ? 'занято' : slot.free === 0 ? 'нет мест' : `${slot.free} мест`}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Duration */}
            {startTime && (
              <div className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Длительность</span>
                <div className={styles.chips}>
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`${styles.chip}${duration === d ? ` ${styles.chipActive}` : ''}`}
                      onClick={() => setDuration(d)}
                    >
                      {formatDuration(d)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Window status + guests + buyout */}
            {startTime && windowInfo && (
              <>
                {windowInfo.overflow && (
                  <div className={styles.warnBox}>Слишком поздно для такой длительности — выберите время пораньше или покороче.</div>
                )}
                {!windowInfo.overflow && windowInfo.blocked && (
                  <div className={styles.warnBox}>Часть выбранного интервала недоступна. Выберите другое время или длительность.</div>
                )}
                {!windowInfo.overflow && !windowInfo.blocked && windowInfo.minFree === 0 && (
                  <div className={styles.warnBox}>На выбранное время нет свободных мест. Попробуйте другое время.</div>
                )}
                {!windowInfo.overflow && !windowInfo.blocked && windowInfo.minFree > 0 && (
                  <div className={styles.row}>
                    <div className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>Гостей (1–{maxGuests})</span>
                      <div className={styles.guests}>
                        <button type="button" className={styles.guestBtn} onClick={() => setGuests((g) => Math.max(1, g - 1))} disabled={guests <= 1}>−</button>
                        <span className={styles.guestValue}>{buyout ? selectedHall?.maxCapacity : guests}</span>
                        <button type="button" className={styles.guestBtn} onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))} disabled={buyout || guests >= maxGuests}>+</button>
                      </div>
                    </div>

                    <label className={styles.buyout}>
                      <input
                        type="checkbox"
                        checked={buyout}
                        onChange={(e) => setBuyout(e.target.checked)}
                      />
                      <span>
                        Выкупить весь зал
                        {buyout && buyoutTotal != null && (
                          <em className={styles.buyoutPrice}>{buyoutTotal.toLocaleString('ru-RU')} ₽</em>
                        )}
                        {buyout && buyoutTotal == null && <em className={styles.buyoutPrice}>считаем…</em>}
                      </span>
                    </label>
                  </div>
                )}
                {!buyout && startSlot && !windowInfo.overflow && !windowInfo.blocked && (
                  <p className={styles.priceHint}>
                    {startSlot.pricePerHour.toLocaleString('ru-RU')} ₽/час за человека
                  </p>
                )}
              </>
            )}

            {/* Contacts */}
            {startTime && (
              <div className={styles.row}>
                <div className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Ваше имя</span>
                  <input
                    className={styles.input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Как к вам обращаться"
                    required
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Телефон</span>
                  <input
                    className={styles.input}
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 ___ ___-__-__"
                    required
                  />
                </div>
              </div>
            )}

            {submitError && <div className={styles.errorBox}>{submitError}</div>}

            {startTime && (
              <button type="submit" className={styles.submitBtn} disabled={!canSubmit}>
                {submitting ? 'Отправляем…' : buyout ? 'Забронировать весь зал' : 'Забронировать'}
              </button>
            )}
          </form>
        )}
      </div>
    </section>
  )
}
