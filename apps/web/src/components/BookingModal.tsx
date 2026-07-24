'use client'

import { useState, useEffect, useCallback, useRef, type FormEvent, type ChangeEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import styles from './BookingModal.module.css'

/* ------------------------------------------------------------------ */
/*  Phone mask: +7 (9XX) XXX-XX-XX                                    */
/* ------------------------------------------------------------------ */

function formatPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('8')) digits = '7' + digits.slice(1)
  if (!digits.startsWith('7')) digits = '7' + digits
  digits = digits.slice(0, 11)

  const d = digits.slice(1)
  let out = '+7'
  if (d.length > 0) out += ' (' + d.slice(0, 3)
  if (d.length >= 3) out += ') ' + d.slice(3, 6)
  if (d.length >= 6) out += '-' + d.slice(6, 8)
  if (d.length >= 8) out += '-' + d.slice(8, 10)
  return out
}

function phoneToDigits(formatted: string): string {
  return formatted.replace(/\D/g, '')
}

function isPhoneComplete(formatted: string): boolean {
  return phoneToDigits(formatted).length === 11
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface BookingSlotData {
  slotId: string
  questId: string
  questName: string
  eventDate: string // YYYY-MM-DD
  time: string      // HH:MM
  price: number
  // Quest metadata for extras
  minPlayers: number
  maxPlayers: number
  maxExtraPlayers: number
  extraPlayerPrice: number
  allowAnimator: boolean
  animatorPrice: number
}

interface BookingModalProps {
  open: boolean
  slotData: BookingSlotData | null
  onClose: () => void
  onSuccess?: (slotId: string) => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function BookingModal({ open, slotData, onClose, onSuccess }: BookingModalProps) {
  const { client } = useAuth()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  // Extras state
  const [extraPlayers, setExtraPlayers] = useState(0)
  const [addAnimator, setAddAnimator] = useState(false)

  // Reset / auto-fill form when modal opens
  useEffect(() => {
    if (open) {
      setName(client?.name || '')
      setPhone(client?.phone ? formatPhone(client.phone) : '')
      setConsent(false)
      setError('')
      setSuccess(false)
      setLoading(false)
      setExtraPlayers(0)
      setAddAnimator(false)
      setTimeout(() => nameRef.current?.focus(), 100)
    }
  }, [open, client])

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose()
    },
    [onClose, loading],
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  // Phone mask handler
  function handlePhoneChange(e: ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhone(e.target.value))
    setError('')
  }

  // Calculate total price
  const basePrice = slotData?.price ?? 0
  const extraPlayersTotal = slotData ? extraPlayers * slotData.extraPlayerPrice : 0
  const animatorTotal = (slotData?.allowAnimator && addAnimator) ? slotData.animatorPrice : 0
  const totalPrice = basePrice + extraPlayersTotal + animatorTotal

  // Max extra players from quest settings
  const maxExtra = slotData ? slotData.maxExtraPlayers : 0

  // Submit booking
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!slotData) return

    if (!name.trim()) {
      setError('Введите ваше имя')
      return
    }
    if (!isPhoneComplete(phone)) {
      setError('Введите номер телефона полностью')
      return
    }
    if (!consent) {
      setError('Необходимо согласие на обработку данных')
      return
    }

    setLoading(true)
    setError('')

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/public'
      const res = await fetch(`${apiUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: slotData.slotId,
          questId: slotData.questId,
          eventDate: slotData.eventDate,
          name: name.trim(),
          phone: phoneToDigits(phone),
          extraPlayers: extraPlayers > 0 ? extraPlayers : undefined,
          addAnimator: addAnimator || undefined,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.message || 'Ошибка бронирования. Попробуйте позже.')
      }

      setSuccess(true)
      onSuccess?.(slotData.slotId)
    } catch (err: any) {
      setError(err.message || 'Ошибка сети. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  if (!open || !slotData) return null

  return (
    <div className={styles.bookingModal}>
      <div className={styles.overlay} onClick={loading ? undefined : onClose} />
      <div className={styles.dialog}>
        {!loading && (
          <button
            className={styles.close}
            aria-label="Закрыть"
            onClick={onClose}
          >
            &times;
          </button>
        )}

        {success ? (
          <div className={styles.successWrap}>
            <div className={styles.successIcon}>&#10003;</div>
            <h3 className={styles.successTitle}>Заявка отправлена!</h3>
            <p className={styles.successText}>
              Мы свяжемся с вами по номеру <strong>{phone}</strong> для подтверждения брони.
            </p>
            <button className={styles.submitBtn} onClick={onClose}>
              Закрыть
            </button>
          </div>
        ) : (
          <>
            <h3 className={styles.title}>Забронировать квест</h3>
            <div className={styles.slotInfo}>
              <span className={styles.slotQuest}>{slotData.questName}</span>
              <span className={styles.slotDetails}>
                {slotData.time} &mdash; {basePrice.toLocaleString('ru-RU')} &#8381;
              </span>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <input
                ref={nameRef}
                type="text"
                className={styles.input}
                name="name"
                placeholder="Ваше имя"
                value={name}
                onChange={(e) => { setName(e.target.value); setError('') }}
                required
                disabled={loading}
              />
              <input
                type="tel"
                className={styles.input}
                name="phone"
                placeholder="+7 (___) ___-__-__"
                value={phone}
                onChange={handlePhoneChange}
                required
                disabled={loading}
                inputMode="numeric"
              />

              {/* ==================== EXTRAS ==================== */}
              {maxExtra > 0 && slotData.extraPlayerPrice > 0 && (
                <div className={styles.extrasBlock}>
                  <div className={styles.extraRow}>
                    <div className={styles.extraInfo}>
                      <span className={styles.extraLabel}>Доп. игроки</span>
                      <span className={styles.extraHint}>
                        +{slotData.extraPlayerPrice.toLocaleString('ru-RU')} &#8381; / чел.
                      </span>
                    </div>
                    <div className={styles.counter}>
                      <button
                        type="button"
                        className={styles.counterBtn}
                        onClick={() => setExtraPlayers(p => Math.max(0, p - 1))}
                        disabled={loading || extraPlayers <= 0}
                      >
                        &minus;
                      </button>
                      <span className={styles.counterValue}>{extraPlayers}</span>
                      <button
                        type="button"
                        className={styles.counterBtn}
                        onClick={() => setExtraPlayers(p => Math.min(maxExtra, p + 1))}
                        disabled={loading || extraPlayers >= maxExtra}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {extraPlayers > 0 && (
                    <span className={styles.extraSubtotal}>
                      +{extraPlayersTotal.toLocaleString('ru-RU')} &#8381;
                    </span>
                  )}
                </div>
              )}

              {slotData.allowAnimator && slotData.animatorPrice > 0 && (
                <div className={styles.extrasBlock}>
                  <label className={styles.animatorToggle}>
                    <input
                      type="checkbox"
                      checked={addAnimator}
                      onChange={(e) => setAddAnimator(e.target.checked)}
                      disabled={loading}
                    />
                    <div className={styles.animatorInfo}>
                      <span className={styles.extraLabel}>Аниматор</span>
                      <span className={styles.extraHint}>
                        +{slotData.animatorPrice.toLocaleString('ru-RU')} &#8381;
                      </span>
                    </div>
                  </label>
                </div>
              )}

              {/* ==================== TOTAL ==================== */}
              {(extraPlayers > 0 || addAnimator) && (
                <div className={styles.totalBlock}>
                  <span className={styles.totalLabel}>Итого</span>
                  <span className={styles.totalPrice}>
                    {totalPrice.toLocaleString('ru-RU')} &#8381;
                  </span>
                </div>
              )}

              {error && <p className={styles.error}>{error}</p>}

              <label className={styles.consent}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => { setConsent(e.target.checked); setError('') }}
                  disabled={loading}
                />
                <span>Я даю согласие на обработку персональных данных</span>
              </label>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={loading || !consent}
              >
                {loading ? 'Отправка...' : `Забронировать — ${totalPrice.toLocaleString('ru-RU')} ₽`}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
