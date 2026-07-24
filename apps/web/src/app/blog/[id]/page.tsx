import Link from 'next/link'
import Image from 'next/image'
import { fetchApi, type BlogItem } from '@/lib/api'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Статья - Pandoroom',
  description: 'Статья блога Pandoroom',
}

async function getBlogItem(id: string): Promise<BlogItem | null> {
  try {
    return await fetchApi(`/blog/${id}`)
  } catch {
    return null
  }
}

export default async function BlogDetailPage({ params }: { params: { id: string } }) {
  const item = await getBlogItem(params.id)

  if (!item) {
    return (
      <main style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '140px 24px 80px',
        minHeight: '60vh',
        color: '#fff',
      }}>
        <Link href="/blog" style={{
          color: '#A0BF39',
          marginBottom: '24px',
          display: 'inline-block',
          textDecoration: 'none',
          fontSize: '15px',
        }}>
          &larr; Назад к статьям
        </Link>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px' }}>
          Статья не найдена
        </h1>
        <p style={{ color: '#999', fontSize: '16px', lineHeight: 1.6 }}>
          Запрашиваемая статья не существует или была удалена.
        </p>
        <Link href="/blog" style={{
          color: '#A0BF39',
          display: 'inline-block',
          marginTop: '24px',
          textDecoration: 'none',
          fontSize: '15px',
        }}>
          Вернуться к списку статей
        </Link>
      </main>
    )
  }

  const formattedDate = new Date(item.date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <main style={item.cardBg ? { background: item.cardBg, minHeight: '60vh' } : { minHeight: '60vh' }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '140px 24px 80px',
        color: '#fff',
      }}>
        <Link href="/blog" style={{
          color: '#A0BF39',
          marginBottom: '32px',
          display: 'inline-block',
          textDecoration: 'none',
          fontSize: '15px',
        }}>
          &larr; Назад к статьям
        </Link>

        <article>
          {item.image && (
            <div style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16/9',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '32px',
            }}>
              <Image
                src={item.image.url}
                alt={item.title}
                fill
                style={{ objectFit: 'cover' }}
              />
            </div>
          )}

          <time style={{
            display: 'block',
            color: '#888',
            fontSize: '14px',
            marginBottom: '12px',
          }}>
            {formattedDate}
          </time>

          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            marginBottom: '24px',
            lineHeight: 1.3,
          }}>
            {item.title}
          </h1>

          <div
            style={{
              fontSize: '16px',
              lineHeight: 1.8,
              color: '#ccc',
            }}
            dangerouslySetInnerHTML={{ __html: item.content }}
          />
        </article>

        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #222' }}>
          <Link href="/blog" style={{
            color: '#A0BF39',
            textDecoration: 'none',
            fontSize: '15px',
          }}>
            &larr; Все статьи
          </Link>
        </div>
      </div>
    </main>
  )
}
