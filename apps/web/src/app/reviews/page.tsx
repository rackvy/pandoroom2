import reviewsStyles from './reviews.module.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Отзывы - Pandoroom',
  description: 'Отзывы наших гостей',
}

async function getReviews() {
  try {
    const { fetchApi } = await import('@/lib/api')
    return await fetchApi('/reviews')
  } catch {
    return []
  }
}

function renderStars(rating: number) {
  return '⭐'.repeat(Math.min(rating || 5, 5))
}

export default async function ReviewsPage() {
  const reviews = await getReviews()

  return (
    <main style={{ minHeight: '60vh' }}>
      <section className={reviewsStyles.pageHero}>
        <h1 className={reviewsStyles.pageTitle}>Отзывы</h1>
        <p className={reviewsStyles.pageSubtitle}>
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
            {reviews.map((review: any) => (
              <article key={review.id} className={reviewsStyles.reviewCard}>
                <div className={reviewsStyles.header}>
                  <div className={reviewsStyles.author}>
                    <div className={reviewsStyles.avatar}>
                      {(review.authorName || review.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className={reviewsStyles.info}>
                      <h4>{review.authorName || review.name || 'Гость'}</h4>
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
                <p className={reviewsStyles.content}>{review.content || review.text || ''}</p>
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
