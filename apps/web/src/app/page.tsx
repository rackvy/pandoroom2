import Link from 'next/link'
import styles from './page.module.css'

export default function Home() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.logo}>Pandoroom</h1>
        <nav className={styles.nav}>
          <Link href="/quests" className={styles.navLink}>Квесты</Link>
          <Link href="/cafe" className={styles.navLink}>Кафе</Link>
          <Link href="/guide" className={styles.navLink}>Праздник-гид</Link>
          <Link href="/news" className={styles.navLink}>Новости</Link>
          <Link href="/reviews" className={styles.navLink}>Отзывы</Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <h2 className={styles.heroTitle}>Добро пожаловать в Pandoroom</h2>
        <p className={styles.heroSubtitle}>
          Погрузитесь в мир захватывающих квестов и отдохните в нашем уютном кафе
        </p>
      </section>

      <section className={styles.features}>
        <div className={styles.featureCard}>
          <h3>Квесты</h3>
          <p>Уникальные квест-комнаты для компаний от 2 до 8 человек</p>
          <Link href="/quests" className={styles.button}>Выбрать квест</Link>
        </div>
        <div className={styles.featureCard}>
          <h3>Кафе</h3>
          <p>Уютное кафе с авторской кухней и напитками</p>
          <Link href="/cafe" className={styles.button}>Забронировать стол</Link>
        </div>
        <div className={styles.featureCard}>
          <h3>Праздник-гид</h3>
          <p>Организация незабываемых праздников и корпоративов</p>
          <Link href="/guide" className={styles.button}>Подробнее</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>&copy; 2024 Pandoroom. Все права защищены.</p>
      </footer>
    </main>
  )
}
