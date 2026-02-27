import Link from 'next/link'
import Image from 'next/image'
import { fetchApi, type Quest } from '@/lib/api'
import styles from '../page.module.css'
import questStyles from './quests.module.css'

export const metadata = {
  title: 'Квесты - Pandoroom',
  description: 'Выберите свой квест и погрузитесь в увлекательное приключение',
}

async function getQuests(): Promise<Quest[]> {
  try {
    return await fetchApi('/quests')
  } catch (error) {
    console.error('Failed to fetch quests:', error)
    return []
  }
}

export default async function QuestsPage() {
  const quests = await getQuests()

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
        <h2 className={styles.heroTitle}>Наши квесты</h2>
        <p className={styles.heroSubtitle}>
          Выберите свой квест и погрузитесь в увлекательное приключение
        </p>
      </section>

      <section className={questStyles.questsGrid}>
        {quests.length === 0 ? (
          <div className={questStyles.emptyState}>
            <p>Пока нет доступных квестов</p>
            <p className={questStyles.emptySubtext}>Загляните позже или свяжитесь с нами</p>
          </div>
        ) : (
          quests.map((quest) => (
            <div key={quest.id} className={questStyles.questCard}>
              <div className={questStyles.imageWrapper}>
                {quest.previewImage ? (
                  <Image
                    src={quest.previewImage.url}
                    alt={quest.previewImage.alt || quest.name}
                    fill
                    className={questStyles.image}
                  />
                ) : (
                  <div className={questStyles.placeholder}>
                    <span>🎭</span>
                  </div>
                )}
              </div>
              <div className={questStyles.content}>
                <h3>{quest.name}</h3>
                <p className={questStyles.description}>{quest.shortDescription}</p>
                <div className={questStyles.meta}>
                  <span>⏱️ {quest.duration} мин</span>
                  <span>👥 {quest.minPlayers}-{quest.maxPlayers}</span>
                  <span>🎯 {quest.difficulty === 'EASY' ? 'Легкий' : quest.difficulty === 'MEDIUM' ? 'Средний' : 'Сложный'}</span>
                </div>
                {quest.branch && (
                  <p className={questStyles.branch}>📍 {quest.branch.city}, {quest.branch.name}</p>
                )}
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  )
}
