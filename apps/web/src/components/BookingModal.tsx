'use client'

import { useEffect, useCallback, type FormEvent } from 'react'
import styles from './BookingModal.module.css'

interface BookingModalProps {
  open: boolean
  slotInfo: string
  onClose: () => void
}

export default function BookingModal({ open, slotInfo, onClose }: BookingModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
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

  if (!open) return null

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const name = data.get('name') as string
    const phone = data.get('phone') as string
    alert(
      `Спасибо, ${name}! Мы свяжемся с вами по номеру ${phone} для подтверждения брони.`,
    )
    form.reset()
    onClose()
  }

  return (
    <div className={styles.bookingModal}>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.dialog}>
        <button
          className={styles.close}
          aria-label="Закрыть"
          onClick={onClose}
        >
          &times;
        </button>
        <h3 className={styles.title}>Забронировать квест</h3>
        <p className={styles.slotInfo}>{slotInfo}</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            type="text"
            className={styles.input}
            name="name"
            placeholder="Ваше имя"
            required
          />
          <input
            type="tel"
            className={styles.input}
            name="phone"
            placeholder="Телефон"
            required
          />
          <label className={styles.consent}>
            <input type="checkbox" required />
            <span>Я даю согласие на обработку персональных данных</span>
          </label>
          <button type="submit" className={styles.submitBtn}>
            Забронировать
          </button>
        </form>
      </div>
    </div>
  )
}
