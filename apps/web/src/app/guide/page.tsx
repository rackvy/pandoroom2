import Link from 'next/link'
import Image from 'next/image'
import { fetchApi, type PageBlock } from '@/lib/api'
import styles from '../page.module.css'
import contentStyles from './guide.module.css'

export const metadata = {
  title: 'Праздник-гид - Pandoroom',
  description: 'Организация незабываемых праздников и корпоративов',
}

async function getPartyGuideContent(): Promise<PageBlock[]> {
  try {
    return await fetchApi('/content?pageKey=PARTY_GUIDE')
  } catch (error) {
    console.error('Failed to fetch party guide content:', error)
    return []
  }
}

export default async function GuidePage() {
  const blocks = await getPartyGuideContent()

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
        <h2 className={styles.heroTitle}>Праздник-гид</h2>
        <p className={styles.heroSubtitle}>
          Организация незабываемых праздников и корпоративов
        </p>
      </section>

      <section className={contentStyles.contentSection}>
        {blocks.length === 0 ? (
          <div className={contentStyles.emptyState}>
            <p>Информация о праздниках скоро появится</p>
            <p className={contentStyles.emptySubtext}>Загляните позже</p>
          </div>
        ) : (
          <div className={contentStyles.blocks}>
            {blocks.map((block) => (
              <div key={block.id} className={contentStyles.block}>
                {block.title && <h3>{block.title}</h3>}
                {block.content && (
                  <div 
                    className={contentStyles.blockContent}
                    dangerouslySetInnerHTML={{ __html: block.content }}
                  />
                )}
                {block.media && block.media.length > 0 && (
                  <div className={contentStyles.mediaGrid}>
                    {block.media.map((media) => (
                      <div key={media.id} className={contentStyles.mediaItem}>
                        <Image
                          src={media.url}
                          alt={media.alt || ''}
                          width={400}
                          height={300}
                          className={contentStyles.mediaImage}
                        />
                      </div>
                    ))}
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
