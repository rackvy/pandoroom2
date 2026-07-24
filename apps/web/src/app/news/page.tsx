import Image from 'next/image'
import Link from 'next/link'
import { fetchApi, type NewsItem } from '@/lib/api'
import newsStyles from './news.module.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Новости - Pandoroom',
  description: 'Последние новости и события',
}

async function getNews(): Promise<NewsItem[]> {
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
    <main style={{ minHeight: '60vh' }}>
      <section className={newsStyles.pageHero}>
        <h1 className={newsStyles.pageTitle}>Новости</h1>
        <p className={newsStyles.pageSubtitle}>
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
              <Link key={item.id} href={`/news/${item.id}`} className={newsStyles.newsCardLink}>
                <article
                  className={`${newsStyles.newsCard}${item.cardBg ? ` ${newsStyles.newsCardDark}` : ''}`}
                  style={item.cardBg ? { background: item.cardBg } : undefined}
                >
                  {item.image ? (
                    <div className={newsStyles.imageWrapper}>
                      <Image
                        src={item.image.url}
                        alt={item.title}
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
                      {new Date(item.date).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </time>
                    <h3>{item.title}</h3>
                    <p className={newsStyles.excerpt}>
                      {item.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                    </p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
