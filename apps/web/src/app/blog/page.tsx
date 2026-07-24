import Image from 'next/image'
import Link from 'next/link'
import { fetchApi, type BlogItem } from '@/lib/api'
import newsStyles from '../news/news.module.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Блог - Pandoroom',
  description: 'Статьи и советы по организации праздников',
}

async function getBlog(): Promise<BlogItem[]> {
  try {
    return await fetchApi('/blog')
  } catch (error) {
    console.error('Failed to fetch blog:', error)
    return []
  }
}

export default async function BlogPage() {
  const posts = await getBlog()

  return (
    <main className={newsStyles.detailPage}>
      <section className={newsStyles.pageHero}>
        <h1 className={newsStyles.pageTitle}>Блог Pandoroom</h1>
        <p className={newsStyles.pageSubtitle}>
          Статьи и советы по организации праздников
        </p>
      </section>

      <section className={newsStyles.newsSection}>
        {posts.length === 0 ? (
          <div className={newsStyles.emptyState}>
            <p>Пока нет статей</p>
            <p className={newsStyles.emptySubtext}>Загляните позже</p>
          </div>
        ) : (
          <div className={newsStyles.newsGrid}>
            {posts.map((item) => (
              <Link key={item.id} href={`/blog/${item.id}`} className={newsStyles.newsCardLink}>
                <article className={newsStyles.newsCard}>
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
                      <span>📝</span>
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
                      {item.excerpt || item.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                    </p>
                    <span className={newsStyles.moreLink}>подробнее</span>
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
