'use client'

import { useRef } from 'react'
import Link from 'next/link'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface SliderVRGameData {
  id: string
  title: string
  subtitle?: string
  tag?: string
  difficulty: number
  duration: string
  players: string
  age: string
  poster: string
}

interface Props {
  title: string
  games: SliderVRGameData[]
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function DifficultyDots({ level }: { level: number }) {
  return (
    <span className="vrs-difficulty" aria-label={`Сложность ${level} из 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= level ? 'vrs-dot' : 'vrs-dot vrs-dot-off'}>
          {i <= level ? '🔥' : ''}
        </span>
      ))}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function VRSliderClient({ title, games }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'prev' | 'next') => {
    if (!trackRef.current) return
    const card = trackRef.current.querySelector<HTMLElement>('.vrs-card')
    const step = card ? card.offsetWidth + 18 : 378
    trackRef.current.scrollBy({
      left: direction === 'next' ? step : -step,
      behavior: 'smooth',
    })
  }

  return (
    <section className="vrs-section">
      <div className="container">
        <div className="vrs-head">
          <h2 className="vrs-section-title title-effect">{title}</h2>
          <Link href="/vr-games" className="vrs-all-link">
            Все VR игры
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </div>

      {games.length > 0 && (
        <div className="vrs-slider">
          <button
            onClick={() => scroll('prev')}
            aria-label="Назад"
            className="vrs-arrow vrs-arrow-prev"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div ref={trackRef} className="vrs-track">
            {games.map((game) => (
              <article
                key={game.id}
                className="vrs-card"
                style={{ '--poster': `url('${game.poster}')` } as React.CSSProperties}
              >
                <div
                  className="vrs-poster"
                  style={{ backgroundImage: `url('${game.poster}')` }}
                />
                <span className="vrs-badge">VR</span>
                {game.tag && <span className="vrs-tag">{game.tag}</span>}
                <div className="vrs-body">
                  <h3 className="vrs-title">
                    {game.title}
                    {game.subtitle && <span className="vrs-sub">{game.subtitle}</span>}
                  </h3>
                  <div className="vrs-meta">
                    <DifficultyDots level={game.difficulty} />
                    <span className="vrs-info">{game.duration}</span>
                    <span className="vrs-info">{game.players}</span>
                    <span className="vrs-info">{game.age}</span>
                  </div>
                </div>
                <Link href={`/vr-games/${game.id}`} className="vrs-link" aria-label="Подробнее" />
              </article>
            ))}
          </div>

          <button
            onClick={() => scroll('next')}
            aria-label="Вперед"
            className="vrs-arrow vrs-arrow-next"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .vrs-section {
          padding-top: 50px;
          padding-bottom: 50px;
        }
        @media (min-width: 1024px) {
          .vrs-section { padding-top: 70px; padding-bottom: 70px; }
        }
        .vrs-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 28px;
        }
        @media (min-width: 1024px) {
          .vrs-head { margin-bottom: 36px; }
        }
        .vrs-section-title {
          font-family: var(--font-heading);
          font-size: clamp(22px, 2.4vw, 34px);
          font-weight: var(--font-weight-bold);
          letter-spacing: -0.3px;
          margin: 0;
        }
        .vrs-all-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--color-cta-green, #b5e61d);
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
          transition: opacity 0.2s ease;
        }
        .vrs-all-link:hover { opacity: 0.75; }
        .vrs-slider {
          position: relative;
          width: 100%;
        }
        .vrs-track {
          display: flex;
          gap: 18px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding-left: max(var(--container-padding, 16px), calc((100vw - 1280px) / 2 + var(--container-padding, 16px)));
          padding-right: 0;
          padding-top: 44px;
          padding-bottom: 44px;
        }
        .vrs-track::-webkit-scrollbar { display: none; }
        .vrs-arrow {
          display: none;
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(20,20,20,0.85);
          color: var(--color-text, #ccc);
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(6px);
          cursor: pointer;
        }
        @media (min-width: 1024px) {
          .vrs-arrow { display: flex; width: 56px; height: 56px; }
        }
        .vrs-arrow:hover {
          background: var(--color-cta-green, #b5e61d);
          color: #0a0a0a;
          border-color: var(--color-cta-green, #b5e61d);
        }
        .vrs-arrow-prev { left: 16px; }
        .vrs-arrow-next { right: 16px; }
        .vrs-card {
          position: relative;
          flex: 0 0 360px;
          width: 360px;
          aspect-ratio: 3/4;
          scroll-snap-align: start;
          border-radius: var(--radius-lg, 16px);
          background-color: #0a0a0a;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 0;
          transition: transform 0.3s ease;
          box-shadow: 0 12px 28px rgba(0,0,0,0.4);
        }
        .vrs-card::before {
          content: "";
          position: absolute;
          inset: -14px;
          background-image: var(--poster);
          background-size: cover;
          background-position: center;
          filter: blur(28px) saturate(1.4);
          opacity: 0.5;
          z-index: -1;
          border-radius: 30px;
          pointer-events: none;
        }
        .vrs-card::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 28%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0) 80%);
          z-index: 1;
          pointer-events: none;
        }
        .vrs-card:hover { transform: translateY(-3px); }
        .vrs-poster {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background-color: #0a0a0a;
          background-size: cover;
          background-position: center;
          z-index: 0;
        }
        .vrs-badge {
          position: absolute;
          top: 18px;
          left: 22px;
          z-index: 2;
          padding: 7px 14px;
          border-radius: 999px;
          background-color: var(--color-cta-green, #b5e61d);
          color: #0a0a0a;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1px;
          line-height: 1;
        }
        .vrs-tag {
          position: relative;
          z-index: 2;
          align-self: flex-start;
          margin: 0 22px 14px;
          padding: 7px 14px;
          border-radius: 999px;
          background-color: var(--color-cta-pink, #d946ef);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          text-transform: lowercase;
          letter-spacing: 0.2px;
          line-height: 1;
        }
        .vrs-body {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 0 22px 22px;
        }
        .vrs-title {
          font-size: 20px;
          font-weight: 600;
          color: #fff;
          line-height: 1.25;
          letter-spacing: -0.1px;
        }
        .vrs-sub {
          display: block;
          font-size: 14px;
          font-weight: 400;
          color: rgba(255,255,255,0.85);
          margin-top: 4px;
          line-height: 1.4;
        }
        .vrs-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px 14px;
          font-size: 12px;
          color: var(--color-text-muted, #888);
          margin-top: auto;
        }
        .vrs-info { font-size: 12px; color: var(--color-text-muted, #888); }
        .vrs-difficulty { display: inline-flex; align-items: center; gap: 2px; font-size: 14px; }
        .vrs-dot { display: inline-block; line-height: 1; }
        .vrs-dot-off { opacity: 0.2; }
        .vrs-link {
          position: absolute;
          inset: 0;
          z-index: 5;
          border-radius: var(--radius-lg, 16px);
        }
      `}} />
    </section>
  )
}
