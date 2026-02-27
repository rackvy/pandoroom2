import Link from 'next/link'
import Image from 'next/image'
import { fetchApi, type News } from '@/lib/api'
import styles from '../page.module.css'
import newsStyles from './news.module.css'

export const metadata = {
  title: 'Новости - Pandoroom',
  description: 'Последние новости и события',
}

async function getNews(): Promise<News[]> {
  try {
    return await fetchApi('/news')
  } catch (error) {
    console.error('Failed to fetch news:', error)
    return []
  }
}

export default async function NewsPage() {
  const news = await getNews()

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>Pandoroom</Link>
        <nav className={styles.nav}>
          <Link href="/quests" className={styles.navLink}>Квесты</Link>
          <Link href="/cafe" className={styles.navLink}>Кафе</Link>
          <Link href="/guide" className={styles.navLink}>Праздник-гид</Link>
          <Link href="/news" className={styles.navLink}>Новости</Link>
          <Link href="/reviews" className={styles.navLink}>Отзывы</Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <h2 className={styles.heroTitle}>Новости</h2>
        <p className={styles.heroSubtitle}>
          Последние новости и события Pandoroom
        </p>
      </section>

      <section className={newsStyles.newsSection}>
        {news.length === 0 ? (
          <div className={newsStyles.emptyState}>
            <p>Пока нет новостей</p>
            <p className={newsStyles.emptySubtext}>Загляните позже</p>
          </div>
        ) : (
          <div className={newsStyles.newsGrid}>
            {news.map((item) => (
              <article key={item.id} className={newsStyles.newsCard}>
                {item.coverImage ? (
                  <div className={newsStyles.imageWrapper}>
                    <Image
                      src={item.coverImage.url}
                      alt={item.coverImage.alt || item.title}
                      fill
                      className={newsStyles.image}
                    />
                  </div>
                ) : (
                  <div className={newsStyles.placeholder}>
                    <span>📰</span>
                  </div>
                )}
                <div className={newsStyles.content}>
                  <time className={newsStyles.date}>
                    {new Date(item.publishedAt || item.createdAt).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </time>
                  <h3>{item.title}</h3>
                  <p className={newsStyles.excerpt}>
                    {item.excerpt || item.content.substring(0, 150)}...
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
