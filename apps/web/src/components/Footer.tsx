import Link from 'next/link'
import Image from 'next/image'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Menu grid */}
        <div className={styles.menu}>
          {/* Quest links */}
          <div className={`${styles.group} ${styles.groupDouble}`}>
            <h4 className={styles.groupTitle}>Квесты во Владивостоке</h4>
            <div className={styles.groupCols}>
              <ul className={styles.list}>
                <li><Link href="/quests">Все квесты</Link></li>
                <li><Link href="/quests">Квесты с актерами</Link></li>
                <li><Link href="/quests">Квесты без актеров</Link></li>
                <li><Link href="/quests">Детские квесты</Link></li>
                <li><Link href="/quests">Квесты-приключения</Link></li>
              </ul>
              <ul className={styles.list}>
                <li><Link href="/quests">Квесты-экшены</Link></li>
                <li><Link href="/quests">Мистические квесты</Link></li>
                <li><Link href="/quests">Квесты-хорроры</Link></li>
                <li><Link href="/quests">Квесты-детективы</Link></li>
              </ul>
            </div>
          </div>

          {/* Holiday links */}
          <div className={styles.group}>
            <h4 className={styles.groupTitle}>Праздники во Владивостоке</h4>
            <ul className={styles.list}>
              <li><Link href="/holidays">Праздник для малышей</Link></li>
              <li><Link href="/holidays">Праздник для детей 6-10 лет</Link></li>
              <li><Link href="/holidays">Праздник для детей 10-15 лет</Link></li>
            </ul>
            <ul className={`${styles.list} ${styles.listSpaced}`}>
              <li><Link href="/holidays">Индивидуальный расчет праздника</Link></li>
            </ul>
          </div>

          {/* About center links */}
          <div className={`${styles.group} ${styles.groupDouble}`}>
            <h4 className={styles.groupTitle}>Семейный центр Пандорум</h4>
            <div className={styles.groupCols}>
              <ul className={styles.list}>
                <li><Link href="/about">О центре</Link></li>
                <li><Link href="#cafe">Кафе</Link></li>
                <li><Link href="#kids">Игровая</Link></li>
                <li><Link href="/menu">Меню</Link></li>
                <li><Link href="/rules">Правила</Link></li>
              </ul>
              <ul className={styles.list}>
                <li><Link href="/loyalty">Программа лояльности</Link></li>
                <li><Link href="/news">Акции и новости</Link></li>
                <li><Link href="/contacts">Контакты</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Main block: brand + contacts */}
        <div className={styles.main}>
          <div className={styles.brand}>
            <Link href="/" className={styles.logo} aria-label="PANDOROOM">
              <Image
                src="/icons/logo.svg"
                alt="PANDOROOM"
                width={130}
                height={28}
                className={styles.logoImg}
              />
            </Link>
            <p className={styles.about}>
              Семейное кафе и квесты Pandoroom (Пандорум) — это огромный центр отдыха для семьи, компаний друзей и детей. В наших филиалах Вас ждет: три зала фирменного кафе, огромный мир квестов для всех возрастов, а также, получившая популярность, батальная игра для детей и взрослых — Лазертаг.
            </p>
          </div>

          <div className={styles.contacts}>
            <div className={styles.addressBlock}>
              <span className={styles.addressLabel}>Нижнепортовая, 1 / Посьетская, 27 стр. 2</span>
              <a href="tel:+74232022696" className={styles.phone}>8 423 202 26 96</a>
            </div>
            <div className={styles.addressBlock}>
              <span className={styles.addressLabel}>Алеутская 17а</span>
              <a href="tel:+74232054458" className={styles.phone}>8 423 205 44 58</a>
            </div>
          </div>
        </div>

        {/* Bottom row: legal + socials */}
        <div className={styles.bottom}>
          <div className={styles.legal}>
            <span>2015 — 2024</span>
            <span className={styles.legalSep}>|</span>
            <span>ООО «Пандорум»</span>
            <span className={styles.legalSep}>|</span>
            <Link href="/privacy" className={styles.legalLink}>Политика конфиденциальности</Link>
          </div>

          <div className={styles.follow}>
            <span className={styles.followText}>следите за нами в соц.сетях</span>
            <span className={styles.followDash}>—</span>
            <div className={styles.socials} aria-label="Социальные сети">
              <a href="#" aria-label="Instagram">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4.5" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a href="#" aria-label="Telegram">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.94 4.32 18.6 19.78c-.25 1.12-.92 1.4-1.86.87l-5.13-3.78-2.47 2.38c-.27.27-.5.5-1.03.5l.37-5.22 9.5-8.59c.41-.37-.09-.57-.64-.21L6.6 12.99l-5.06-1.58c-1.1-.34-1.12-1.1.23-1.63L20.65 2.7c.92-.34 1.72.21 1.29 1.62Z" />
                </svg>
              </a>
              <a href="#" aria-label="VK">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.79 17.4h1.18s.36-.04.54-.24c.17-.18.16-.52.16-.52s-.02-1.6.72-1.84c.73-.23 1.67 1.55 2.66 2.23.75.52 1.32.41 1.32.41l2.65-.04s1.39-.09.73-1.18c-.05-.09-.39-.81-2-2.31-1.69-1.57-1.46-1.31.57-4.02 1.24-1.65 1.74-2.66 1.58-3.09-.15-.41-1.06-.3-1.06-.3l-2.99.02s-.22-.03-.39.07c-.16.1-.27.34-.27.34s-.49 1.31-1.14 2.42c-1.38 2.34-1.93 2.46-2.16 2.32-.52-.34-.39-1.34-.39-2.06 0-2.23.34-3.16-.65-3.4-.33-.08-.57-.13-1.41-.14-1.07-.01-1.97 0-2.49.25-.34.17-.61.55-.45.57.2.03.65.12.89.45.31.42.3 1.36.3 1.36s.18 2.6-.42 2.92c-.41.22-.97-.23-2.2-2.36-.63-1.09-1.11-2.3-1.11-2.3s-.09-.23-.25-.34c-.19-.14-.46-.18-.46-.18l-2.84.02s-.43.01-.59.2c-.14.16-.01.5-.01.5s2.22 5.21 4.74 7.83c2.31 2.41 4.94 2.25 4.94 2.25Z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Credits */}
        <div className={styles.credits}>
          <div className={styles.credit}>
            <span className={styles.creditLabel}>Разработка сайта —</span>
            <a href="https://shelikhov.me" target="_blank" rel="noopener" className={styles.creditLogo}>
              <Image
                src="/images/footer/shelikhov.svg"
                alt="Shelikhov.me"
                width={120}
                height={28}
                className={styles.creditImg}
              />
            </a>
          </div>
          <div className={styles.credit}>
            <span className={styles.creditLabel}>Дизайн сайта —</span>
            <a href="#" className={styles.creditLogo}>
              <Image
                src="/images/footer/korableff.svg"
                alt="Korableff"
                width={100}
                height={28}
                className={styles.creditImg}
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
