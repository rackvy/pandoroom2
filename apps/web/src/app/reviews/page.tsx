import reviewsStyles from './reviews.module.css'

export const metadata = {
  title: 'Отзывы - Pandoroom',
  description: 'Отзывы наших гостей',
}

const mockReviews = [
  { id: '1', authorName: 'Анна М.', rating: 5, content: 'Потрясающий квест! Актёры играли просто великолепно, мы полностью погрузились в атмосферу.', createdAt: '2024-03-15', source: { name: 'Яндекс Карты' } },
  { id: '2', authorName: 'Павел Г.', rating: 5, content: 'Организация на высшем уровне. Дети в восторге от праздника, всё продумано до мелочей.', createdAt: '2024-03-12', source: { name: 'Яндекс Карты' } },
  { id: '3', authorName: 'Светлана К.', rating: 5, content: 'Отличное место для детского праздника. Чисто, уютно, персонал очень внимательный.', createdAt: '2024-03-10', source: { name: 'Google' } },
  { id: '4', authorName: 'Кирилл В.', rating: 5, content: 'Были на квесте — это нечто! Декорации, загадки, актёры — всё на 5 баллов.', createdAt: '2024-03-08', source: { name: 'Яндекс Карты' } },
]

async function getReviews() {
  try {
    const { fetchApi } = await import('@/lib/api')
    return await fetchApi('/reviews')
  } catch {
    return mockReviews
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
