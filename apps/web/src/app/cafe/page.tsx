import Image from 'next/image'
import { fetchApi, type PageBlock } from '@/lib/api'
import contentStyles from './cafe.module.css'

export const metadata = {
  title: 'Кафе - Pandoroom',
  description: 'Уютное кафе с авторской кухней',
}

async function getCafeContent(): Promise<PageBlock[]> {
  try {
    return await fetchApi('/content?pageKey=CAFE')
  } catch (error) {
    console.error('Failed to fetch cafe content:', error)
    return []
  }
}

export default async function CafePage() {
  const blocks = await getCafeContent()

  return (
    <main style={{ minHeight: '60vh' }}>
      <section className={contentStyles.pageHero}>
        <h1 className={contentStyles.pageTitle}>Наше кафе</h1>
        <p className={contentStyles.pageSubtitle}>
          Уютное кафе с авторской кухней и напитками
        </p>
      </section>

      <section className={contentStyles.contentSection}>
        {blocks.length === 0 ? (
          <div className={contentStyles.emptyState}>
            <p>Информация о кафе скоро появится</p>
            <p className={contentStyles.emptySubtext}>Загляните позже</p>
          </div>
        ) : (
          <div className={contentStyles.blocks}>
            {blocks.map((block) => (
              <div key={block.id} className={contentStyles.block}>
                {block.title && <h3>{block.title}</h3>}
                {block.text && (
                  <div
                    className={contentStyles.blockContent}
                    dangerouslySetInnerHTML={{ __html: block.text }}
                  />
                )}
                {block.image && (
                  <div className={contentStyles.mediaGrid}>
                    <div className={contentStyles.mediaItem}>
                      <Image
                        src={block.image.url}
                        alt={block.title || ''}
                        width={400}
                        height={300}
                        className={contentStyles.mediaImage}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
