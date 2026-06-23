'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import styles from './quest-detail.module.css'
import BookingModal from '@/components/BookingModal'
import Lightbox from '@/components/Lightbox'

/* ------------------------------------------------------------------ */
/*  Mock data — "Чумной доктор" quest detail from the HTML mockup     */
/* ------------------------------------------------------------------ */

const questData = {
  title: 'Чумной доктор',
  heroGradient: 'linear-gradient(135deg, #1a2010 0%, #0a0a0a 100%)',
  tags: ['мистический', 'С актёрами', '18+'],
  gallery: [
    '/placeholders/gallery-1.svg',
    '/placeholders/gallery-2.svg',
    '/placeholders/gallery-3.svg',
  ],
  tabs: [
    { key: 'description', label: 'Описание квеста' },
    { key: 'rules', label: 'Правила' },
    { key: 'safety', label: 'Безопасность' },
    { key: 'extras', label: 'Дополнительные услуги' },
  ],
  panels: {
    description: [
      '«Чумной доктор» — мистический квест-перформанс.',
      'Вам предстоит отправиться в ноябрь 1348 года, где страшная эпидемия чумы захлестнула город и унесла сотни жизней. Все здания закрыты, на пустых улицах и площадях тишина. Только юркие крысиные лапки и полоса с большими клювами-масками.',
      'Дома, в которых есть заражённые, помечают кресты. Однако, в них были обнаружены и те, кто, несмотря на тесный контакт с больными, не подаёт ни малейших признаков заражения. В числе этих «счастливчиков» оказались и вы.',
      'По приказу градоначальника вас доставили к врачу для выяснения причин устойчивости к заболеванию.',
      'И, кажется, ради решения этой загадки, он готов пожертвовать вашими жизнями.',
    ],
    rules: [
      'Правила прохождения квеста «Чумной доктор»:',
    ],
    rulesList: [
      'Приходите за 10 минут до начала игры',
      'Возьмите с собой удобную обувь',
      'Запрещено проносить еду и напитки',
      'Следуйте инструкциям оператора',
      'Не применяйте физическую силу к реквизиту и актёрам',
    ],
    safety: [
      'Безопасность участников — наш главный приоритет:',
    ],
    safetyList: [
      'Все помещения оборудованы аварийным освещением',
      'Оператор наблюдает за вами через камеры в реальном времени',
      'В любой момент вы можете попросить остановить игру',
      'Все декорации проходят проверку на безопасность',
    ],
    extras: [
      'Дополнительные услуги:',
    ],
    extrasList: [
      'Фото- и видеосъёмка прохождения — 1 500 ₽',
      'Дополнительный игрок (5-й и 6-й) — 800 ₽/чел.',
      'Праздничное оформление зала — от 3 000 ₽',
      'Бронирование кафе после квеста — бесплатно',
    ],
  },
  specs: [
    { label: 'Сложность', value: 'высокая' },
    { label: 'С актёрами', value: 'нет' },
    { label: 'Игроки', value: '2-4 игроков' },
    { label: 'Доп.игроки', value: 'до 2' },
    { label: 'Возраст', value: '16+' },
    { label: 'Время игры', value: '60 минут' },
    { label: 'Жанр', value: 'Мистический' },
    { label: 'Адрес', value: 'Алеутская 17А' },
    { label: 'Цена', value: 'от 4 500 руб.', accent: true },
  ],
  schedule: [
    {
      day: '26',
      month: '/ 09',
      weekday: 'понедельник',
      slots: [
        { time: '12:30', booked: false },
        { time: '13:00', booked: false },
        { time: '14:50', booked: false },
        { time: '16:10', booked: false },
        { time: '17:30', booked: false },
        { time: '18:50', booked: false },
        { time: '20:00', booked: false },
        { time: '21:30', booked: false },
      ],
    },
    {
      day: '27',
      month: '/ 09',
      weekday: 'вторник',
      slots: [
        { time: '10:50', booked: true },
        { time: '12:10', booked: false },
        { time: '13:30', booked: false },
        { time: '14:50', booked: false },
        { time: '16:10', booked: false },
        { time: '17:30', booked: true },
        { time: '18:50', booked: false },
        { time: '20:00', booked: false },
        { time: '21:30', booked: false },
      ],
    },
    {
      day: '28',
      month: '/ 09',
      weekday: 'среда',
      slots: [
        { time: '09:30', booked: true },
        { time: '10:50', booked: false },
        { time: '12:10', booked: false },
        { time: '13:30', booked: true },
        { time: '14:50', booked: false },
        { time: '16:10', booked: true },
        { time: '17:30', booked: false },
        { time: '18:50', booked: false },
        { time: '20:00', booked: false },
        { time: '21:30', booked: false },
      ],
    },
    {
      day: '29',
      month: '/ 09',
      weekday: 'четверг',
      slots: [
        { time: '09:30', booked: true },
        { time: '10:50', booked: false },
        { time: '12:10', booked: false },
        { time: '13:30', booked: true },
        { time: '14:50', booked: true },
        { time: '16:10', booked: false },
        { time: '17:30', booked: false },
        { time: '18:50', booked: false },
        { time: '20:00', booked: false },
        { time: '21:30', booked: false },
      ],
    },
    {
      day: '30',
      month: '/ 09',
      weekday: 'пятница',
      slots: [
        { time: '10:50', booked: false },
        { time: '12:10', booked: false },
        { time: '13:30', booked: false },
        { time: '14:50', booked: false },
        { time: '16:10', booked: false },
        { time: '17:30', booked: false },
        { time: '18:50', booked: false },
        { time: '20:00', booked: false },
        { time: '21:30', booked: true },
      ],
    },
    {
      day: '01',
      month: '/ 10',
      weekday: 'суббота',
      slots: [
        { time: '10:50', booked: true },
        { time: '12:10', booked: true },
        { time: '13:30', booked: false },
        { time: '14:50', booked: false },
        { time: '16:10', booked: false },
        { time: '17:30', booked: false },
        { time: '18:50', booked: false },
        { time: '20:00', booked: true },
        { time: '21:30', booked: true },
      ],
    },
  ],
}

/* ------------------------------------------------------------------ */
/*  Placeholder gallery images (data URIs with dark gradient fills)   */
/* ------------------------------------------------------------------ */

function makePlaceholder(label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1a1a2e"/><stop offset="100%" stop-color="#0a0a0a"/></linearGradient></defs><rect width="640" height="400" fill="url(#g)"/><text x="320" y="210" text-anchor="middle" fill="#444" font-size="24" font-family="sans-serif">${label}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const galleryImages = [
  makePlaceholder('Фото 1'),
  makePlaceholder('Фото 2'),
  makePlaceholder('Фото 3'),
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatSlotTime(time: string): { h: string; m: string } {
  const [h, m] = time.split(':')
  return { h, m }
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                    */
/* ------------------------------------------------------------------ */

export default function QuestDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState('description')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingSlotInfo, setBookingSlotInfo] = useState('')

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
  }, [])

  const showNext = useCallback(() => {
    setLightboxIndex((prev) => (prev + 1) % galleryImages.length)
  }, [])

  /* Booking */
  const openBooking = (day: string, month: string, time: string) => {
    setBookingSlotInfo(`${day} ${month} в ${time}`)
    setBookingOpen(true)
  }

  const closeBooking = () => setBookingOpen(false)

  const { title, tags, tabs, panels, specs, schedule } = questData

  return (
    <main>
      {/* ==================== HERO ==================== */}
      <section
        className={styles.hero}
        style={{ backgroundImage: questData.heroGradient }}
      >
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroHeading}>
            <div className={styles.heroLogoPlaceholder}>
              <span>P</span>
            </div>
            <div className={styles.heroText}>
              <h1 className={styles.heroTitle}>{title}</h1>
              <div className={styles.heroTags}>
                {tags.map((tag) => (
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
              {/* Description */}
              <div
                className={`${styles.tabPanel}${activeTab === 'description' ? ` ${styles.tabPanelActive}` : ''}`}
              >
                {panels.description.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              {/* Rules */}
              <div
                className={`${styles.tabPanel}${activeTab === 'rules' ? ` ${styles.tabPanelActive}` : ''}`}
              >
                {panels.rules.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                <ul>
                  {panels.rulesList.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Safety */}
              <div
                className={`${styles.tabPanel}${activeTab === 'safety' ? ` ${styles.tabPanelActive}` : ''}`}
              >
                {panels.safety.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                <ul>
                  {panels.safetyList.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Extras */}
              <div
                className={`${styles.tabPanel}${activeTab === 'extras' ? ` ${styles.tabPanelActive}` : ''}`}
              >
                {panels.extras.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                <ul>
                  {panels.extrasList.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <aside className={styles.sidebar}>
              <div className={styles.specs}>
                {specs.map((spec) => (
                  <div key={spec.label} className={styles.spec}>
                    <span className={styles.specLabel}>{spec.label}</span>
                    <span
                      className={`${styles.specValue}${spec.accent ? ` ${styles.specValueAccent}` : ''}`}
                    >
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
          <div className={styles.scheduleGrid}>
            {schedule.map((row) => (
              <div key={row.day + row.month} className={styles.scheduleRow}>
                <div className={styles.scheduleDate}>
                  <span className={styles.scheduleDay}>{row.day}</span>
                  <span className={styles.scheduleMonth}>{row.month}</span>
                  <br />
                  <span className={styles.scheduleWeekday}>{row.weekday}</span>
                </div>
                <div className={styles.scheduleSlots}>
                  {row.slots.map((slot) => {
                    const { h, m } = formatSlotTime(slot.time)
                    if (slot.booked) {
                      return (
                        <button
                          key={slot.time}
                          className={`${styles.slot} ${styles.slotBooked}`}
                          disabled
                        >
                          {h}
                          <sub>{m}</sub>
                        </button>
                      )
                    }
                    return (
                      <button
                        key={slot.time}
                        className={styles.slot}
                        onClick={() => openBooking(row.day, row.month, slot.time)}
                      >
                        {h}
                        <sub>{m}</sub>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
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
      <Lightbox
        open={lightboxOpen}
        images={galleryImages}
        currentIndex={lightboxIndex}
        onClose={closeLightbox}
        onPrev={showPrev}
        onNext={showNext}
      />
    </main>
  )
}
