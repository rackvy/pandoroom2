'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import styles from './quest-detail.module.css'
import BookingModal from '@/components/BookingModal'
import Lightbox from '@/components/Lightbox'
import type { QuestDetail } from '@/lib/api'

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const difficultyLabels: Record<string, string> = {
  easy: 'лёгкая',
  medium: 'средняя',
  hard: 'высокая',
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

  /* Build gallery images array */
  const galleryImages: string[] = quest.galleryPhotos.length > 0
    ? quest.galleryPhotos.map((gp) => gp.image.url)
    : quest.previewImage?.url
      ? [quest.previewImage.url]
      : []

  /* Tabs definition */
  const tabs = [
    { key: 'description', label: 'Описание квеста' },
    { key: 'rules', label: 'Правила' },
    { key: 'safety', label: 'Безопасность' },
    { key: 'extras', label: 'Дополнительные услуги' },
  ]

  /* Tab content mapping */
  const tabContent: Record<string, string> = {
    description: quest.description,
    rules: quest.rules,
    safety: quest.safety,
    extras: quest.extraServices,
  }

  /* Specs for sidebar */
  const specs = [
    { label: 'Сложность', value: difficultyLabels[quest.difficulty] || quest.difficulty },
    { label: 'С актёрами', value: quest.hasActors ? 'да' : 'нет' },
    { label: 'Игроки', value: `${quest.minPlayers}-${quest.maxPlayers} игроков` },
    { label: 'Возраст', value: quest.ageRestriction || '12+' },
    { label: 'Время игры', value: `${quest.durationMinutes} минут` },
    { label: 'Жанр', value: quest.genre },
    { label: 'Адрес', value: quest.address },
  ]

  /* Hero tags */
  const heroTags = [
    quest.genre,
    quest.hasActors ? 'С актёрами' : 'Без актёров',
    quest.ageRestriction || '12+',
  ]

  /* Hero background */
  const heroBg = quest.backgroundImage?.url
    ? `url('${quest.backgroundImage.url}') center/cover no-repeat`
    : quest.previewImage?.url
      ? `url('${quest.previewImage.url}') center/cover no-repeat`
      : 'linear-gradient(135deg, #1a1028 0%, #0a0a0a 100%)'

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
  const openBooking = () => {
    setBookingSlotInfo('')
    setBookingOpen(true)
  }
  const closeBooking = () => setBookingOpen(false)

  return (
    <main>
      {/* ==================== HERO ==================== */}
      <section
        className={styles.hero}
        style={{ backgroundImage: heroBg }}
      >
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroHeading}>
            <div className={styles.heroLogoPlaceholder}>
              <span>P</span>
            </div>
            <div className={styles.heroText}>
              <h1 className={styles.heroTitle}>{quest.name}</h1>
              <div className={styles.heroTags}>
                {heroTags.map((tag) => (
                  <span key={tag} className={styles.heroTag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== GALLERY ==================== */}
      {galleryImages.length > 0 && (
        <section className={styles.gallery}>
          <div className="container">
            <div className={styles.galleryThumbs}>
              {galleryImages.map((src, idx) => (
                <button
                  key={idx}
                  className={styles.galleryThumb}
                  onClick={() => openLightbox(idx)}
                >
                  <img src={src} alt={`Фото квеста ${idx + 1}`} />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==================== TABS + INFO ==================== */}
      <section className={styles.info}>
        <div className="container">
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
                    ? tabContent[tab.key].split('\n').filter(Boolean).map((p, i) => (
                        <p key={i}>{p}</p>
                      ))
                    : <p>Информация отсутствует</p>
                  }
                </div>
              ))}
            </div>

            <aside className={styles.sidebar}>
              <div className={styles.specs}>
                {specs.map((spec) => (
                  <div key={spec.label} className={styles.spec}>
                    <span className={styles.specLabel}>{spec.label}</span>
                    <span className={styles.specValue}>
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ==================== SCHEDULE / BOOKING ==================== */}
      <section className={styles.schedule}>
        <div className="container">
          <h2 className={styles.scheduleTitle}>Выберите дату и время</h2>
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '24px 0' }}>
            Расписание доступно при бронировании.
          </p>
          <div style={{ textAlign: 'center', paddingBottom: 24 }}>
            <button
              className={styles.slot}
              onClick={openBooking}
              style={{ padding: '12px 32px', fontSize: 16 }}
            >
              Забронировать
            </button>
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
