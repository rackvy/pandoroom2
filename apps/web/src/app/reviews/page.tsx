import Link from 'next/link'
import { fetchApi, type Review } from '@/lib/api'
import styles from '../page.module.css'
import reviewsStyles from './reviews.module.css'

export const metadata = {
  title: 'Отзывы - Pandoroom',
  description: 'Отзывы наших гостей',
}

async function getReviews(): Promise<Review[]> {
  try {
    return await fetchApi('/reviews')
  } catch (error) {
    console.error('Failed to fetch reviews:', error)
    return []
  }
}

function renderStars(rating: number) {
  return '⭐'.repeat(rating)
}

export default async function ReviewsPage() {
  const reviews = await getReviews()

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
        <h2 className={styles.heroTitle}>Отзывы</h2>
        <p className={styles.heroSubtitle}>
          Что говорят о нас наши гости
        </p>
      </section>

      <section className={reviewsStyles.reviewsSection}>
        {reviews.length === 0 ? (
          <div className={reviewsStyles.emptyState}>
            <p>Пока нет отзывов</p>
            <p className={reviewsStyles.emptySubtext}>Будьте первым!</p>
          </div>
        ) : (
          <div className={reviewsStyles.reviewsGrid}>
            {reviews.map((review) => (
              <article key={review.id} className={reviewsStyles.reviewCard}>
                <div className={reviewsStyles.header}>
                  <div className={reviewsStyles.author}>
                    <div className={reviewsStyles.avatar}>
                      {review.authorName.charAt(0).toUpperCase()}
                    </div>
                    <div className={reviewsStyles.info}>
                      <h4>{review.authorName}</h4>
                      {review.source && (
                        <span className={reviewsStyles.source}>
                          {review.source.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={reviewsStyles.rating}>
                    {renderStars(review.rating)}
                  </div>
                </div>
                <p className={reviewsStyles.content}>{review.content}</p>
                <time className={reviewsStyles.date}>
                  {new Date(review.createdAt).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </time>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
