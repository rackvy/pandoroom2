'use client'

import { useState, useEffect, useCallback, useRef, type FormEvent, type ChangeEvent } from 'react'
import styles from './BookingModal.module.css'

/* ------------------------------------------------------------------ */
/*  Phone mask: +7 (9XX) XXX-XX-XX                                    */
/* ------------------------------------------------------------------ */

function formatPhone(raw: string): string {
  // Strip everything except digits
  let digits = raw.replace(/\D/g, '')
  // If starts with 8, replace with 7
  if (digits.startsWith('8')) digits = '7' + digits.slice(1)
  // If doesn't start with 7, prepend 7
  if (!digits.startsWith('7')) digits = '7' + digits
  // Limit to 11 digits
  digits = digits.slice(0, 11)

  const d = digits.slice(1) // remove country code
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
}

interface BookingModalProps {
  open: boolean
  slotData: BookingSlotData | null
  onClose: () => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function BookingModal({ open, slotData, onClose }: BookingModalProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setName('')
      setPhone('')
      setConsent(false)
      setError('')
      setSuccess(false)
      setLoading(false)
      // Auto-focus name input
      setTimeout(() => nameRef.current?.focus(), 100)
    }
  }, [open])

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
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.message || 'Ошибка бронирования. Попробуйте позже.')
      }

      setSuccess(true)
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
                {slotData.time} &mdash; {slotData.price.toLocaleString('ru-RU')} &#8381;
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
                {loading ? 'Отправка...' : 'Забронировать'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
