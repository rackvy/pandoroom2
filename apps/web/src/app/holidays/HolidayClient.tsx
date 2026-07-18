'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './holiday.module.css'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface HolidayPageData {
  ageGroup: string
  heroTitle: string
  features: string[]
  infoTitle: string
  infoText: string
  infoCallout: string
  services: { icon: string; name: string }[]
  offers: { title: string; tag?: string }[]
  howTitle: string
  reviews: { name: string; date: string; text: string }[]
  faqs: { question: string; answer: string }[]
}

/* ------------------------------------------------------------------ */
/*  SVG helpers                                                       */
/* ------------------------------------------------------------------ */

function CheckSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 7l3.5 3.5L12 3.5" stroke="#b5e61d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlaySvg() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <polygon points="8,5 19,12 8,19" />
    </svg>
  )
}

function ChevronSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 7.5l5 5 5-5" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function HolidayClient({ data }: { data: HolidayPageData }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <main>
      {/* ==================== HERO ==================== */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>{data.heroTitle}</h1>
            <div className={styles.heroButtons}>
              <Link href="/schedule" className={styles.btnPink}>
                Забронировать дату
              </Link>
              <Link href="/holidays" className={styles.btnGreen}>
                Калькулятор дня рождения
              </Link>
            </div>
            <ul className={styles.heroFeatures}>
              {data.features.map((f, i) => (
                <li key={i} className={styles.heroFeature}>
                  <span className={styles.heroCheck}><CheckSvg /></span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Right side collage placeholder */}
          <div className={styles.heroCollage}>
            <div className={styles.heroCollageItem} />
            <div className={styles.heroCollageItem} />
            <div className={styles.heroCollageItem} />
          </div>
        </div>
      </section>

      {/* ==================== INFO ==================== */}
      <section className={styles.infoSection}>
        <div className={styles.infoInner}>
          <h2 className={styles.infoTitle}>{data.infoTitle}</h2>
          <p className={styles.infoText}>{data.infoText}</p>
          <div className={styles.infoCallout}>
            <p className={styles.infoCalloutText}>{data.infoCallout}</p>
          </div>
        </div>
      </section>

      {/* ==================== SERVICES ==================== */}
      <section className={styles.servicesSection}>
        <div className={styles.servicesInner}>
          <div className={styles.servicesRow}>
            {data.services.map((svc, i) => (
              <div key={i} className={styles.serviceItem}>
                <div className={styles.serviceItemIcon}>{svc.icon}</div>
                <span className={styles.serviceItemLabel}>{svc.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== OFFERS ==================== */}
      <section className={styles.offerSection}>
        <div className={styles.offerInner}>
          <h2 className={styles.offerTitle}>Мы рады предложить для вашего праздника</h2>
          <div className={styles.offerGrid}>
            {data.offers.map((offer, i) => (
              <div key={i} className={styles.offerCard}>
                {offer.tag && <span className={styles.offerCardAge}>{offer.tag}</span>}
                <div className={styles.offerCardBody}>
                  <h3 className={styles.offerCardTitle}>{offer.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HOW ==================== */}
      <section className={styles.howSection}>
        <div className={styles.howInner}>
          <h2 className={styles.howTitle}>{data.howTitle}</h2>
          <div className={styles.howLayout}>
            <div className={styles.howVideo}>
              <div className={styles.howPlayBtn}>
                <PlaySvg />
              </div>
            </div>
            <div className={styles.howThumbs}>
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={styles.howThumb} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== REVIEWS ==================== */}
      <section className={styles.reviewsSection}>
        <div className={styles.reviewsInner}>
          <h2 className={styles.reviewsTitle}>Отзывы гостей</h2>
          <div className={styles.reviewsCarousel}>
            {data.reviews.map((review, i) => (
              <article key={i} className={styles.reviewCard}>
                <div className={styles.reviewCardMedia}>
                  <div className={styles.reviewPlayBtn}>
                    <PlaySvg />
                  </div>
                </div>
                <div className={styles.reviewCardBody}>
                  <div className={styles.reviewCardHeader}>
                    <span className={styles.reviewCardName}>{review.name}</span>
                    <span className={styles.reviewCardDate}>{review.date}</span>
                  </div>
                  <p className={styles.reviewCardText}>{review.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FAQ ==================== */}
      <section className={styles.faqSection}>
        <div className={styles.faqInner}>
          <h2 className={styles.faqTitle}>Часто задаваемые вопросы</h2>
          <div className={styles.faqList}>
            {data.faqs.map((faq, i) => {
              const isOpen = openFaq === i
              return (
                <div key={i} className={styles.faqItem} data-open={isOpen ? 'true' : undefined}>
                  <button
                    className={styles.faqQuestion}
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.question}</span>
                    <span className={styles.faqChevron}><ChevronSvg /></span>
                  </button>
                  {isOpen && (
                    <div className={styles.faqAnswer}>
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
