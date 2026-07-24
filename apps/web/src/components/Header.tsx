'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import styles from './Header.module.css'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { client } = useAuth()
  const router = useRouter()

  return (
    <header className={styles.header}>
      {/* Top utility bar */}
      <div className={styles.topBar}>
        <div className={styles.topInner}>
          <nav className={styles.utilityNav} aria-label="Дополнительная навигация">
            <Link href="/about" className={styles.topLink}>О центре</Link>
            <Link href="/news" className={styles.topLink}>Новости и акции</Link>
            <Link href="/blog" className={styles.topLink}>Блог</Link>
            <Link href="/rules" className={styles.topLink}>Правила</Link>
            <Link href="/loyalty" className={styles.topLink}>Программа лояльности</Link>
            <Link href="/contacts" className={styles.topLink}>Контакты</Link>
          </nav>
        </div>
      </div>

      {/* Main bar */}
      <div className={styles.mainBar}>
        <div className={styles.mainInner}>
          <Link href="/" className={styles.logo} aria-label="PANDOROOM">
            <Image
              src="/icons/logo.svg"
              alt="PANDOROOM"
              width={140}
              height={30}
              className={styles.logoImg}
              priority
            />
          </Link>

          <nav className={styles.mainNav} aria-label="Основная навигация">
            <Link href="/quests" className={styles.mainLink}>Квесты</Link>
            <Link href="/holidays" className={styles.mainLink}>Праздники</Link>
            <Link href="#cafe" className={styles.mainLink}>Кафе</Link>
            <Link href="#kids" className={styles.mainLink}>Игровая для детей</Link>
          </nav>

          <button
            className={styles.profile}
            aria-label="Личный кабинет"
            onClick={() => router.push(client ? '/lk' : '/lk/login')}
            title={client ? `Личный кабинет — ${client.name}` : 'Войти в личный кабинет'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
            </svg>
            {client && <span className={styles.profileName}>{client.name.split(' ')[0]}</span>}
          </button>

          <div className={styles.contacts}>
            <div className={styles.address}>
              <span className={styles.addressLabel}>Нижнепортовая, 1 / Посьетская, 27 стр. 2</span>
              <a href="tel:+74232022696" className={styles.phone}>8 423 202 26 96</a>
            </div>
            <div className={styles.address}>
              <span className={styles.addressLabel}>Алеутская 17а</span>
              <a href="tel:+74232054458" className={styles.phone}>8 423 205 44 58</a>
            </div>
          </div>

          <button
            className={styles.burger}
            aria-label="Открыть меню"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span /><span /><span />
          </button>
        </div>

        {/* Mobile menu overlay */}
        {menuOpen && (
          <div className={styles.mobileMenu}>
            <nav className={styles.mobileNav}>
              <Link href="/quests" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Квесты</Link>
              <Link href="/holidays" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Праздники</Link>
              <Link href="#cafe" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Кафе</Link>
              <Link href="#kids" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Игровая для детей</Link>
            </nav>
            <div className={styles.mobileContacts}>
              <div className={styles.mobileAddress}>
                <span className={styles.addressLabel}>Нижнепортовая, 1 / Посьетская, 27 стр. 2</span>
                <a href="tel:+74232022696" className={styles.phone}>8 423 202 26 96</a>
              </div>
              <div className={styles.mobileAddress}>
                <span className={styles.addressLabel}>Алеутская 17а</span>
                <a href="tel:+74232054458" className={styles.phone}>8 423 205 44 58</a>
              </div>
            </div>
            <nav className={styles.mobileUtility}>
              <Link href="/about" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>О центре</Link>
              <Link href="/news" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Новости и акции</Link>
              <Link href="/blog" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Блог</Link>
              <Link href="/rules" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Правила</Link>
              <Link href="/loyalty" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Программа лояльности</Link>
              <Link href="/contacts" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Контакты</Link>
            </nav>
            <Link
              href={client ? '/lk' : '/lk/login'}
              className={styles.mobileLink}
              onClick={() => setMenuOpen(false)}
              style={{ fontWeight: 600 }}
            >
              {client ? `Личный кабинет — ${client.name}` : 'Войти в ЛК'}
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
