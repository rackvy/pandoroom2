import Link from 'next/link'
import styles from './holidays-hub.module.css'

export const metadata = {
  title: 'Праздники во Владивостоке | PANDOROOM',
  description: 'Организовываем праздники для детей всех возрастов во Владивостоке. Квесты, кафе, шоу-программы — праздник «под ключ» в семейном центре Pandoroom.',
}

const cards = [
  {
    href: '/holidays/toddlers',
    kicker: 'праздники',
    title: 'для малышей',
    poster: '/images/main/6.png',
  },
  {
    href: '/holidays/kids',
    kicker: 'праздники для детей',
    title: '6 — 10 лет',
    poster: '/images/main/5.png',
  },
  {
    href: '/holidays/teens',
    kicker: 'праздники для детей',
    title: '10 — 15 лет',
    poster: '/images/main/4.png',
  },
]

export default function HolidaysHubPage() {
  return (
    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Площадки для праздников и самый большой{' '}
              <Link href="/quests" className={styles.heroLink}>квеструм</Link>{' '}
              во Владивостоке
            </h1>
            <div className={styles.heroButtons}>
              <Link href="/quests" className={styles.btnPink}>Забронировать квест</Link>
              <a href="#holidays-grid" className={styles.btnGreen}>Отметить праздник</a>
            </div>
            <ul className={styles.heroFeatures}>
              <li className={styles.heroFeature}>
                <span className={styles.heroCheck}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l3.5 3.5L12 3.5" stroke="#b5e61d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>19 разнообразных квестов для любой компании</span>
              </li>
              <li className={styles.heroFeature}>
                <span className={styles.heroCheck}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l3.5 3.5L12 3.5" stroke="#b5e61d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>три зала кафе, площадью более 350 м²</span>
              </li>
              <li className={styles.heroFeature}>
                <span className={styles.heroCheck}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l3.5 3.5L12 3.5" stroke="#b5e61d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>ваш праздник «под ключ»</span>
              </li>
              <li className={styles.heroFeature}>
                <span className={styles.heroCheck}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l3.5 3.5L12 3.5" stroke="#b5e61d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>работаем с 2015 года</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Holiday cards */}
      <section className={styles.sectionHolidays} id="holidays-grid">
        <div className={styles.holidaysInner}>
          <div className={styles.holidaysIntro}>
            <h2 className={styles.holidaysIntroTitle}>
              <span>Устройте незабываемый</span>
              <span className={styles.titleEffect}>праздник для вашего ребенка</span>
              <span>в семейном центре «Пандорум»</span>
            </h2>
          </div>
          <div className={styles.holidaysGrid}>
            {cards.map((card, idx) => (
              <Link
                key={idx}
                href={card.href}
                className={styles.holidayCard}
                style={{ '--poster': `url('${card.poster}')` } as React.CSSProperties}
              >
                <span className={styles.holidayCardKicker}>{card.kicker}</span>
                <h3 className={styles.holidayCardTitle}>{card.title}</h3>
                <span className={styles.holidayCardBtn}>подробнее</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
