'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import styles from './quests.module.css'
import type { Quest } from '@/lib/api'

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const difficultyMap: Record<string, number> = {
  easy: 1,
  medium: 3,
  hard: 5,
}

function difficultyNumber(d: string): number {
  return difficultyMap[d] ?? 3
}

function genreToTagVariant(genre: string): string {
  const g = genre.toLowerCase()
  if (g.includes('хоррор') || g.includes('horror')) return 'horror'
  if (g.includes('детектив') || g.includes('detective')) return 'detective'
  if (g.includes('детский') || g.includes('kids') || g.includes('для детей')) return 'kids'
  return genre
}

function DifficultyDots({ level }: { level: number }) {
  return (
    <span className={styles.qcardDifficulty}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i
          key={i}
          className={`${styles.qcardDot}${i > level ? ` ${styles.qcardDotOff}` : ''}`}
        />
      ))}
    </span>
  )
}

/* Gradient placeholders per quest (deterministic from index) */
const gradients = [
  'linear-gradient(135deg, #1a1028 0%, #0a0a0a 100%)',
  'linear-gradient(135deg, #1a2010 0%, #07080a 100%)',
  'linear-gradient(135deg, #20180a 0%, #08070a 100%)',
  'linear-gradient(135deg, #15101f 0%, #050514 100%)',
  'linear-gradient(135deg, #20102a 0%, #070514 100%)',
  'linear-gradient(135deg, #0f1a20 0%, #060a0a 100%)',
  'linear-gradient(135deg, #201a10 0%, #0a0806 100%)',
]

/* ------------------------------------------------------------------ */
/*  Filter definitions                                                */
/* ------------------------------------------------------------------ */

const difficultyFilters = ['Все квесты', 'Начинающие', 'Азартные', 'Ходилки']
const difficultyFilterMap: Record<string, string | null> = {
  'Все квесты': null,
  'Начинающие': 'easy',
  'Азартные': 'medium',
  'Ходилки': 'hard',
}

const genres = [
  'все жанры',
  'Приключение',
  'Экшен',
  'Мистический',
  'Хоррор',
  'Детектив',
  'Для детей',
]

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface QuestsClientProps {
  quests: Quest[]
}

export default function QuestsClient({ quests }: QuestsClientProps) {
  const [activeDifficulty, setActiveDifficulty] = useState('Все квесты')
  const [activeGenre, setActiveGenre] = useState('все жанры')
  const [actorsOnly, setActorsOnly] = useState(false)

  const filteredQuests = useMemo(() => {
    return quests.filter((q) => {
      // Difficulty filter
      const diffKey = difficultyFilterMap[activeDifficulty]
      if (diffKey && q.difficulty !== diffKey) return false

      // Genre filter
      if (activeGenre !== 'все жанры') {
        const genreLower = q.genre.toLowerCase()
        const filterLower = activeGenre.toLowerCase()
        if (!genreLower.includes(filterLower)) return false
      }

      // Actors filter
      if (actorsOnly && !q.hasActors) return false

      return true
    })
  }, [quests, activeDifficulty, activeGenre, actorsOnly])

  return (
    <main>
      {/* ==================== CATALOG HEADER + FILTERS ==================== */}
      <section className={styles.sectionCatalog}>
        <div className="container">
          <nav className={styles.breadcrumb} aria-label="Навигация">
            <Link href="/" className={styles.breadcrumbLink}>
              Главная
            </Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>Квесты</span>
          </nav>
          <h1 className={styles.catalogTitle}>Выберите квест во Владивостоке</h1>

          {/* Filters */}
          <div className={styles.catalogFilters}>
            {/* Difficulty filter chips */}
            <div className={styles.filtersRow}>
              {difficultyFilters.map((label) => (
                <button
                  key={label}
                  className={`${styles.filterChip}${activeDifficulty === label ? ` ${styles.filterChipActive}` : ''}`}
                  onClick={() => setActiveDifficulty(label)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Genre chips + toggle */}
            <div className={styles.filtersRow}>
              <div className={styles.filtersGenres}>
                {genres.map((g) => (
                  <button
                    key={g}
                    className={`${styles.genreChip}${activeGenre === g ? ` ${styles.genreChipActive}` : ''}`}
                    onClick={() => setActiveGenre(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <label className={styles.filterToggle}>
                <input
                  type="checkbox"
                  className={styles.filterToggleInput}
                  checked={actorsOnly}
                  onChange={(e) => setActorsOnly(e.target.checked)}
                />
                <span className={styles.filterToggleLabel}>Квесты с актерами</span>
              </label>
            </div>

            {/* Dot-based param selectors */}
            <div className={`${styles.filtersRow} ${styles.filtersRowParams}`}>
              <div className={styles.filterParam}>
                <span className={styles.filterParamLabel}>Игроков:</span>
                <span className={styles.filterParamDots}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <i
                      key={i}
                      className={`${styles.filterDot}${i <= 2 ? ` ${styles.filterDotOn}` : ''}`}
                    />
                  ))}
                </span>
              </div>
              <div className={styles.filterParam}>
                <span className={styles.filterParamLabel}>Сложность</span>
                <span className={styles.filterParamDots}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <i
                      key={i}
                      className={`${styles.filterDot}${i <= 3 ? ` ${styles.filterDotOn}` : ''}`}
                    />
                  ))}
                </span>
              </div>
              <div className={styles.filterParam}>
                <span className={styles.filterParamLabel}>Сортировка</span>
                <span className={styles.filterParamDots}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <i
                      key={i}
                      className={`${styles.filterDot}${i <= 4 ? ` ${styles.filterDotOn}` : ''}`}
                    />
                  ))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== QUEST GRID ==================== */}
      <section className={styles.sectionQuestGrid}>
        <div className="container">
          {filteredQuests.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '48px 0' }}>
              Квесты не найдены. Попробуйте изменить фильтры.
            </p>
          ) : (
            <div className={styles.questGrid}>
              {filteredQuests.map((q, idx) => {
                const diff = difficultyNumber(q.difficulty)
                const posterUrl = q.previewImage?.url || ''
                return (
                  <article
                    key={q.id}
                    className={styles.qcard}
                    style={
                      {
                        '--poster': posterUrl
                          ? `url('${posterUrl}') center/cover no-repeat`
                          : gradients[idx % gradients.length],
                      } as React.CSSProperties
                    }
                  >
                    <div className={styles.qcardPoster} />
                    <div className={styles.qcardBody}>
                      <h3 className={styles.qcardTitle}>
                        {q.name}
                        {q.subtitle && (
                          <>
                            <br />
                            <span className={styles.qcardSub}>{q.subtitle}</span>
                          </>
                        )}
                      </h3>
                      <div className={styles.qcardMeta}>
                        <DifficultyDots level={diff} />
                        <span className={styles.qcardInfo}>{q.durationMinutes} мин</span>
                        <span className={styles.qcardInfo}>{q.minPlayers}-{q.maxPlayers} игроков</span>
                        <span className={styles.qcardInfo}>{q.ageRestriction || '12+'}</span>
                      </div>
                    </div>
                    <Link
                      href={`/quests/${q.id}`}
                      className={styles.qcardLink}
                      aria-label="Подробнее"
                    />
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
