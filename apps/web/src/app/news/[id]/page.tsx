import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { fetchApi, type NewsItem } from '@/lib/api'
import newsStyles from '../news.module.css'

export const dynamic = 'force-dynamic'

async function getNewsItem(id: string): Promise<NewsItem | null> {
  try {
    return await fetchApi(`/news/${id}`)
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const item = await getNewsItem(params.id)
  if (!item) {
    return { title: 'Новость не найдена - Pandoroom' }
  }
  return {
    title: item.seoTitle || `${item.title} - Pandoroom`,
    description: item.seoDescription || item.title,
    ...(item.seoKeywords ? { keywords: item.seoKeywords } : {}),
  }
}

export default async function NewsDetailPage({ params }: { params: { id: string } }) {
  const item = await getNewsItem(params.id)

  if (!item) {
    return (
      <main className={newsStyles.detailPage}>
        <div className={newsStyles.detailInner}>
          <Link href="/news" className={newsStyles.backLink}>
            &larr; Назад к новостям
          </Link>
          <h1 className={newsStyles.detailTitle}>Новость не найдена</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', lineHeight: 1.6 }}>
            Запрашиваемая новость не существует или была удалена.
          </p>
          <Link href="/news" className={newsStyles.backLink} style={{ marginTop: '24px' }}>
            Вернуться к списку новостей
          </Link>
        </div>
      </main>
    )
  }

  const formattedDate = new Date(item.date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <main className={newsStyles.detailPage}>
      <div className={newsStyles.detailInner}>
        <Link href="/news" className={newsStyles.backLink}>
          &larr; Назад к новостям
        </Link>

        <article>
          {item.image && (
            <div className={newsStyles.detailImage}>
              <Image
                src={item.image.url}
                alt={item.title}
                fill
                style={{ objectFit: 'cover' }}
              />
            </div>
          )}

          <time className={newsStyles.detailDate}>{formattedDate}</time>

          <h1 className={newsStyles.detailTitle}>{item.title}</h1>

          <div
            className={newsStyles.detailContent}
            dangerouslySetInnerHTML={{ __html: item.content }}
          />

          {item.schemaJson && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: item.schemaJson }}
            />
          )}
        </article>

        <div className={newsStyles.detailFooter}>
          <Link href="/news" className={newsStyles.backLink}>
            &larr; Все новости
          </Link>
        </div>
      </div>
    </main>
  )
}
