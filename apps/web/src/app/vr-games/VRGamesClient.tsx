'use client'

import Image from 'next/image'
import Link from 'next/link'
import styles from '../quests/quests.module.css'
import type { VRGame } from '@/lib/api'

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const difficultyMap: Record<string, number> = {
  easy: 1,
  medium: 3,
  hard: 5,
  'Легкий': 1,
  'Средний': 3,
  'Сложный': 5,
}

function difficultyNumber(d?: string | null): number {
  return difficultyMap[d ?? ''] ?? 3
}

function DifficultyDots({ level, icon = '🔥' }: { level: number; icon?: string | null }) {
  return (
    <span className={styles.qcardDifficulty} aria-label={`Сложность ${level} из 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`${styles.qcardDot}${i > level ? ` ${styles.qcardDotOff}` : ''}`}>
          {i <= level ? icon : ''}
        </span>
      ))}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface VRGamesClientProps {
  games: VRGame[]
}

export default function VRGamesClient({ games }: VRGamesClientProps) {
  return (
    <main>
      {/* ==================== CATALOG HEADER ==================== */}
      <section className={styles.sectionCatalog}>
        <div className="container">
          <nav className={styles.breadcrumb} aria-label="Навигация">
            <Link href="/" className={styles.breadcrumbLink}>
              Главная
            </Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>VR игры</span>
          </nav>
          <div className={styles.catalogHeader}>
            <h1 className={styles.catalogTitle}>VR игры во Владивостоке</h1>
          </div>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: 720, lineHeight: 1.6, margin: 0 }}>
            Командные VR-баталии на арене до 20 игроков. Выберите игру, посмотрите видео
            и приходите играть — всё оборудование мы выдадим на месте.
          </p>
        </div>
      </section>

      {/* ==================== GAMES GRID ==================== */}
      <section className={styles.sectionQuestGrid}>
        <div className="container">
          {games.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '48px 0' }}>
              Скоро здесь появятся VR игры. Следите за новостями!
            </p>
          ) : (
            <div className={styles.questGrid}>
              {games.map((g) => {
                const diff = difficultyNumber(g.difficulty)
                const posterUrl = g.previewImage?.url || ''

                return (
                  <article
                    key={g.id}
                    className={styles.qcard}
                    style={
                      posterUrl
                        ? ({ '--poster': `url('${posterUrl}')` } as React.CSSProperties)
                        : undefined
                    }
                  >
                    {/* Full-bleed poster */}
                    <div className={styles.qcardPoster}>
                      {posterUrl ? (
                        <Image
                          src={posterUrl}
                          alt={g.previewImage?.altText || g.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className={styles.qcardPosterImg}
                        />
                      ) : (
                        <div className={styles.qcardPosterImg} />
                      )}
                    </div>

                    {/* VR badge */}
                    <span
                      className={`${styles.qcardTag} ${styles.qcardTagVR}`}
                      style={{ position: 'absolute', top: 18, left: 22, margin: 0, zIndex: 2 }}
                    >
                      VR
                    </span>

                    {/* Genre tag pill */}
                    {g.genre && (
                      <span className={styles.qcardTag}>{g.genre}</span>
                    )}

                    {/* Body — title + meta */}
                    <div className={styles.qcardBody}>
                      <h3 className={styles.qcardTitle}>{g.name}</h3>
                      <div className={styles.qcardMeta}>
                        <DifficultyDots level={diff} icon={g.difficultyIcon} />
                        {g.durationMinutes && (
                          <span className={styles.qcardInfo}>{g.durationMinutes} мин</span>
                        )}
                        <span className={styles.qcardInfo}>{g.minPlayers}-{g.maxPlayers} игроков</span>
                        <span className={styles.qcardInfo}>{g.ageRestriction || '12+'}</span>
                      </div>
                    </div>

                    {/* Full-card link overlay */}
                    <Link
                      href={`/vr-games/${g.id}`}
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
