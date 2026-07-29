'use client'

import { useState, useMemo, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import styles from '../../quests/[id]/quest-detail.module.css'
import Lightbox from '@/components/Lightbox'
import type { VRGameDetail, NewsItem } from '@/lib/api'

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

const difficultyLabels: Record<string, string> = {
  easy: 'Легкий',
  medium: 'Средний',
  hard: 'Сложный',
}

function DifficultyDots({ level, icon = '🔥' }: { level: number; icon?: string | null }) {
  return (
    <span className={styles.difficulty} aria-label={`Сложность ${level} из 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`${styles.dot}${i > level ? ` ${styles.dotOff}` : ''}`}>
          {i <= level ? icon : ''}
        </span>
      ))}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface VRGameDetailClientProps {
  game: VRGameDetail
  news?: NewsItem[]
}

export default function VRGameDetailClient({ game, news = [] }: VRGameDetailClientProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  /* Gallery images */
  const galleryImages: string[] = (game.galleryPhotos || []).length > 0
    ? game.galleryPhotos.map((gp) => gp.image.url)
    : game.previewImage?.url
      ? [game.previewImage.url]
      : []

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }
  const closeLightbox = () => setLightboxOpen(false)
  const showPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)
  }, [galleryImages.length])
  const showNext = useCallback(() => {
    setLightboxIndex((prev) => (prev + 1) % galleryImages.length)
  }, [galleryImages.length])

  /* Dynamic content sections (tabs) */
  const sections = useMemo(
    () => (game.contentSections || []).filter((s) => (s.title && s.title.trim()) || (s.text && s.text.trim())),
    [game.contentSections]
  )

  /* Branch address + Yandex Maps link */
  const branchAddress = game.branch?.address || ''
  const mapsUrl = game.branch?.geoLat != null && game.branch?.geoLng != null
    ? `https://yandex.ru/maps/?pt=${game.branch.geoLng},${game.branch.geoLat}&z=17&l=map`
    : branchAddress
      ? `https://yandex.ru/maps/?text=${encodeURIComponent(branchAddress)}`
      : null

  /* Hero background */
  const heroBg = game.backgroundImage?.url || game.previewImage?.url || null

  const diff = difficultyMap[game.difficulty ?? ''] ?? 3

  return (
    <main>
      {/* ==================== HERO ==================== */}
      <section className={styles.hero}>
        {heroBg && (
          <div className={styles.heroBg}>
            <Image
              src={heroBg}
              alt={game.backgroundImage?.altText || game.previewImage?.altText || game.name}
              fill
              sizes="100vw"
              priority
              className={styles.heroBgImg}
            />
          </div>
        )}
        <div className={styles.heroOverlay} />

        <div className={`container ${styles.heroInner}`}>
          {/* Breadcrumb */}
          <nav className={styles.breadcrumb}>
            <Link href="/" className={styles.breadcrumbLink}>Главная</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <Link href="/vr-games" className={styles.breadcrumbLink}>VR игры</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>{game.name}</span>
          </nav>

          <div className={styles.heroContent}>
            <div className={styles.heroTextBlock}>
              <h1 className={`${styles.heroTitle} title-effect`}>{game.name}</h1>
              {game.subtitle && (
                <p className={styles.heroSubtitle}>{game.subtitle}</p>
              )}

              {/* Quick specs row */}
              <div className={styles.heroSpecs}>
                {game.genre && (
                  <>
                    <div className={styles.heroSpec}>
                      <span className={styles.heroSpecLabel}>Жанр</span>
                      <span className={styles.heroSpecValue}>{game.genre}</span>
                    </div>
                    <div className={styles.heroSpecDivider} />
                  </>
                )}
                <div className={styles.heroSpec}>
                  <span className={styles.heroSpecLabel}>Сложность</span>
                  <span className={styles.heroSpecValue}>
                    <DifficultyDots level={diff} icon={game.difficultyIcon} />
                  </span>
                </div>
                {game.durationMinutes && (
                  <>
                    <div className={styles.heroSpecDivider} />
                    <div className={styles.heroSpec}>
                      <span className={styles.heroSpecLabel}>Время</span>
                      <span className={styles.heroSpecValue}>{game.durationMinutes} мин</span>
                    </div>
                  </>
                )}
                <div className={styles.heroSpecDivider} />
                <div className={styles.heroSpec}>
                  <span className={styles.heroSpecLabel}>Игроки</span>
                  <span className={styles.heroSpecValue}>{game.minPlayers}-{game.maxPlayers}</span>
                </div>
                <div className={styles.heroSpecDivider} />
                <div className={styles.heroSpec}>
                  <span className={styles.heroSpecLabel}>Возраст</span>
                  <span className={styles.heroSpecValue}>{game.ageRestriction || '12+'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== GALLERY ==================== */}
      {galleryImages.length > 0 && (
        <section className={styles.gallery}>
          <div className="container">
            <h2 className={styles.sectionTitle}>Фотографии</h2>
            <div className={styles.galleryGrid}>
              {galleryImages.slice(0, 5).map((src, idx) => (
                <button
                  key={idx}
                  className={`${styles.galleryItem}${idx === 0 ? ` ${styles.galleryItemMain}` : ''}`}
                  onClick={() => openLightbox(idx)}
                >
                  <Image
                    src={src}
                    alt={`Фото игры ${idx + 1}`}
                    fill
                    sizes={idx === 0 ? '(max-width: 768px) 100vw, 60vw' : '(max-width: 768px) 50vw, 20vw'}
                    className={styles.galleryImg}
                  />
                  {idx === 4 && galleryImages.length > 5 && (
                    <div className={styles.galleryMore}>
                      +{galleryImages.length - 5}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==================== VIDEO ==================== */}
      {game.video?.url && (
        <section className={styles.videoSection}>
          <div className="container">
            <h2 className={styles.sectionTitle}>Видео</h2>
            <div className={styles.videoWrap}>
              <video
                className={styles.videoPlayer}
                controls
                preload="metadata"
                poster={game.previewImage?.url || undefined}
              >
                <source src={game.video.url} type={game.video.mimeType || 'video/mp4'} />
                Ваш браузер не поддерживает видео.
              </video>
            </div>
          </div>
        </section>
      )}

      {/* ==================== TABS + INFO ==================== */}
      {sections.length > 0 && (
        <section className={styles.info}>
          <div className="container">
            <h2 className={styles.sectionTitle}>Об игре</h2>

            <div className={styles.tabs}>
              {sections.map((section, index) => (
                <button
                  key={index}
                  className={`${styles.tabBtn}${activeTab === index ? ` ${styles.tabBtnActive}` : ''}`}
                  onClick={() => setActiveTab(index)}
                >
                  {section.title || `Раздел ${index + 1}`}
                </button>
              ))}
            </div>

            <div className={styles.content}>
              <div className={styles.contentMain}>
                {sections.map((section, index) => (
                  <div
                    key={index}
                    className={`${styles.tabPanel}${activeTab === index ? ` ${styles.tabPanelActive}` : ''}`}
                  >
                    {section.text
                      ? (
                          <div
                            className={styles.tabHtml}
                            dangerouslySetInnerHTML={{ __html: section.text }}
                          />
                        )
                      : <p className={styles.noContent}>Информация отсутствует</p>
                    }
                  </div>
                ))}
              </div>

              <aside className={styles.sidebar}>
                <div className={styles.sidebarCard}>
                  <h3 className={styles.sidebarTitle}>Характеристики</h3>
                  <div className={styles.specs}>
                    {game.difficulty && (
                      <div className={styles.spec}>
                        <span className={styles.specLabel}>Сложность</span>
                        <span className={styles.specValue}>
                          {difficultyLabels[game.difficulty] || game.difficulty}
                        </span>
                      </div>
                    )}
                    <div className={styles.spec}>
                      <span className={styles.specLabel}>Игроки</span>
                      <span className={styles.specValue}>{game.minPlayers}-{game.maxPlayers}</span>
                    </div>
                    <div className={styles.spec}>
                      <span className={styles.specLabel}>Возраст</span>
                      <span className={styles.specValue}>{game.ageRestriction || '12+'}</span>
                    </div>
                    {game.durationMinutes && (
                      <div className={styles.spec}>
                        <span className={styles.specLabel}>Время игры</span>
                        <span className={styles.specValue}>{game.durationMinutes} мин</span>
                      </div>
                    )}
                    {game.genre && (
                      <div className={styles.spec}>
                        <span className={styles.specLabel}>Жанр</span>
                        <span className={styles.specValue}>{game.genre}</span>
                      </div>
                    )}
                  </div>

                  {branchAddress && mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.addressLink}
                      title="Открыть в Яндекс.Картах и проложить маршрут"
                    >
                      <span className={styles.addressLinkLabel}>Адрес</span>
                      <span className={styles.addressLinkValue}>{branchAddress}</span>
                      <span className={styles.addressLinkIcon} aria-hidden="true">↗</span>
                    </a>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </section>
      )}

      {/* ==================== NEWS ==================== */}
      {news.length > 0 && (
        <section className={styles.newsSection}>
          <div className="container">
            <h2 className={styles.sectionTitle}>Новости и акции</h2>
            <div className={styles.newsGrid}>
              {news.map((item) => {
                const dateStr = new Date(item.date).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
                const excerpt = item.content.replace(/<[^>]*>/g, '').slice(0, 120)
                return (
                  <Link key={item.id} href={`/news/${item.id}`} className={styles.newsCard}>
                    {item.image?.url ? (
                      <div className={styles.newsCardImage}>
                        <Image
                          src={item.image.url}
                          alt={item.image.altText || item.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 25vw"
                          className={styles.newsCardImg}
                        />
                      </div>
                    ) : (
                      <div className={styles.newsCardPlaceholder}>
                        <span>P</span>
                      </div>
                    )}
                    <div className={styles.newsCardBody}>
                      <span className={styles.newsCardDate}>{dateStr}</span>
                      <h3 className={styles.newsCardTitle}>{item.title}</h3>
                      {excerpt && (
                        <p className={styles.newsCardExcerpt}>{excerpt}...</p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
            <div style={{ textAlign: 'center', paddingTop: 24 }}>
              <Link href="/news" className={styles.backLink}>
                Все новости &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Back link */}
      <div className="container" style={{ paddingBottom: 48 }}>
        <Link href="/vr-games" className={styles.backLink}>
          &larr; Назад к VR играм
        </Link>
      </div>

      {/* Lightbox */}
      <Lightbox
        open={lightboxOpen}
        images={galleryImages}
        currentIndex={lightboxIndex}
        onClose={closeLightbox}
        onPrev={showPrev}
        onNext={showNext}
      />
    </main>
  )
}
