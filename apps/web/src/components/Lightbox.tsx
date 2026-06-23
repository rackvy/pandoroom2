'use client'

import { useEffect, useCallback } from 'react'
import styles from './Lightbox.module.css'

interface LightboxProps {
  open: boolean
  images: string[]
  currentIndex: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

export default function Lightbox({
  open,
  images,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: LightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    },
    [onClose, onPrev, onNext],
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

  if (!open || images.length === 0) return null

  return (
    <div className={styles.lightbox}>
      <div className={styles.overlay} onClick={onClose} />
      <button className={styles.close} aria-label="Закрыть" onClick={onClose}>
        &times;
      </button>
      <button className={styles.prev} aria-label="Назад" onClick={onPrev}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <img
        className={styles.img}
        src={images[currentIndex]}
        alt={`Фото квеста ${currentIndex + 1}`}
      />
      <button className={styles.next} aria-label="Вперед" onClick={onNext}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}
