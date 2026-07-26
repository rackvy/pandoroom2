import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { fetchApi, type BlogItem } from '@/lib/api'
import newsStyles from '../../news/news.module.css'

export const dynamic = 'force-dynamic'

async function getBlogItem(id: string): Promise<BlogItem | null> {
  try {
    return await fetchApi(`/blog/${id}`)
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const item = await getBlogItem(params.id)
  if (!item) {
    return { title: 'Статья не найдена - Pandoroom' }
  }
  return {
    title: item.seoTitle || `${item.title} - Pandoroom`,
    description: item.seoDescription || item.excerpt || item.title,
    ...(item.seoKeywords ? { keywords: item.seoKeywords } : {}),
  }
}

export default async function BlogDetailPage({ params }: { params: { id: string } }) {
  const item = await getBlogItem(params.id)

  if (!item) {
    return (
      <main className={newsStyles.detailPage}>
        <div className={newsStyles.detailInner}>
          <Link href="/blog" className={newsStyles.backLink}>
            &larr; Назад к статьям
          </Link>
          <h1 className={newsStyles.detailTitle}>Статья не найдена</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', lineHeight: 1.6 }}>
            Запрашиваемая статья не существует или была удалена.
          </p>
          <Link href="/blog" className={newsStyles.backLink} style={{ marginTop: '24px' }}>
            Вернуться к списку статей
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
        <Link href="/blog" className={newsStyles.backLink}>
          &larr; Назад к статьям
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
          <Link href="/blog" className={newsStyles.backLink}>
            &larr; Все статьи
          </Link>
        </div>
      </div>
    </main>
  )
}
