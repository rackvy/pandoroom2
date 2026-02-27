import { useState } from 'react'
import styles from './Page.module.css'

const pageKeys = [
  { value: 'HOME', label: 'Главная страница' },
  { value: 'ABOUT', label: 'О нас' },
  { value: 'PARTY_GUIDE', label: 'Гид по празднику' },
  { value: 'FAQ', label: 'FAQ' },
  { value: 'CONTACTS', label: 'Контакты' },
]

export default function ContentPage() {
  const [selectedPageKey, setSelectedPageKey] = useState('')
  const [blocks, setBlocks] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const handleLoadBlocks = async () => {
    if (!selectedPageKey) return
    setIsLoading(true)
    // TODO: API call to fetch page blocks
    setTimeout(() => {
      setBlocks([])
      setIsLoading(false)
    }, 500)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2>Контент</h2>
      </div>

      <div className={styles.controls}>
        <select
          value={selectedPageKey}
          onChange={(e) => setSelectedPageKey(e.target.value)}
          className={styles.select}
        >
          <option value="">Выберите страницу</option>
          {pageKeys.map((page) => (
            <option key={page.value} value={page.value}>
              {page.label}
            </option>
          ))}
        </select>

        <button
          onClick={handleLoadBlocks}
          disabled={!selectedPageKey || isLoading}
          className={styles.primaryButton}
        >
          {isLoading ? 'Загрузка...' : 'Загрузить блоки'}
        </button>
      </div>

      <div className={styles.blocksContainer}>
        {blocks.length === 0 ? (
          <div className={styles.emptyState}>
            {selectedPageKey 
              ? 'Блоки не найдены' 
              : 'Выберите страницу для загрузки блоков'}
          </div>
        ) : (
          <div className={styles.blocksList}>
            {blocks.map((block: any) => (
              <div key={block.id} className={styles.blockCard}>
                <h3>{block.title}</h3>
                <p>{block.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
