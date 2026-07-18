'use client'

import { useRef } from 'react'
import Link from 'next/link'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface SliderQuestData {
  id: string
  title: string
  subtitle?: string
  tag: string
  tagVariant?: 'horror' | 'detective' | 'kids'
  difficulty: number
  duration: string
  players: string
  age: string
  poster: string
}

interface Props {
  title: string
  quests: SliderQuestData[]
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function tagClass(variant?: string): string {
  if (variant === 'horror') return 'qc-tag qc-tag-horror'
  if (variant === 'detective') return 'qc-tag qc-tag-detective'
  if (variant === 'kids') return 'qc-tag qc-tag-kids'
  return 'qc-tag'
}

function DifficultyDots({ level }: { level: number }) {
  return (
    <span className="qc-difficulty" aria-label={`Сложность ${level} из 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={i <= level ? 'qc-dot' : 'qc-dot qc-dot-off'} />
      ))}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function QuestSliderClient({ title, quests }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'prev' | 'next') => {
    if (!trackRef.current) return
    const card = trackRef.current.querySelector<HTMLElement>('.qc-card')
    const step = card ? card.offsetWidth + 18 : 378
    trackRef.current.scrollBy({
      left: direction === 'next' ? step : -step,
      behavior: 'smooth',
    })
  }

  return (
    <section className="qc-section">
      <div className="container">
        <h2 className="qc-section-title title-effect">{title}</h2>
      </div>

      {quests.length > 0 && (
        <div className="qc-slider">
          <button
            onClick={() => scroll('prev')}
            aria-label="Назад"
            className="qc-arrow qc-arrow-prev"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div ref={trackRef} className="qc-track">
            {quests.map((quest) => (
              <article
                key={quest.id}
                className="qc-card"
                style={{ '--poster': `url('${quest.poster}')` } as React.CSSProperties}
              >
                <div
                  className="qc-poster"
                  style={{ backgroundImage: `url('${quest.poster}')` }}
                />
                <span className={tagClass(quest.tagVariant)}>{quest.tag}</span>
                <div className="qc-body">
                  <h3 className="qc-title">
                    {quest.title}
                    {quest.subtitle && <span className="qc-sub">{quest.subtitle}</span>}
                  </h3>
                  <div className="qc-meta">
                    <DifficultyDots level={quest.difficulty} />
                    <span className="qc-info">{quest.duration}</span>
                    <span className="qc-info">{quest.players}</span>
                    <span className="qc-info">{quest.age}</span>
                  </div>
                </div>

                {/* Hover overlay */}
                <div className="qc-hover">
                  <span className="qc-hover-icon">
                    <svg width="63" height="61" viewBox="0 0 63 61" fill="none">
                      <path d="M4.05371 47.5676C21.6663 62.0721 39.2789 62.0721 56.8915 47.5676" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M52.2297 50.6757L46.0135 24.2568L49.1216 18.0405L55.3378 21.1486L60 16.4865L52.2297 2.5C36.5276 3.17757 33.6122 12.2377 30.473 21.1486H11.8243C9.35136 21.1486 6.97968 22.131 5.23103 23.8797C3.48238 25.6283 2.5 28 2.5 30.473M8.71622 50.6757L14.9324 21.1486" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M18.041 55.3379L24.2572 39.7974H36.6897L42.9059 55.3379" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <h3 className="qc-hover-title">
                    Игровая и кафе<br />для вашего ребенка
                  </h3>
                  <p className="qc-hover-text">
                    Проведите этот день максимально весело. Отдохните после квеста в наших кафе и игровой
                  </p>
                  <div className="qc-hover-actions">
                    <Link href="/quests" className="qc-btn qc-btn-pink qc-btn-full">
                      Перейти в квест
                    </Link>
                    <Link href="/holidays" className="qc-btn qc-btn-green qc-btn-full">
                      Забронировать столик
                    </Link>
                  </div>
                </div>
                <Link href={`/quests/${quest.id}`} className="qc-link" aria-label="Подробнее" />
              </article>
            ))}
          </div>

          <button
            onClick={() => scroll('next')}
            aria-label="Вперед"
            className="qc-arrow qc-arrow-next"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .qc-section {
          padding-top: 50px;
          padding-bottom: 50px;
        }
        @media (min-width: 1024px) {
          .qc-section { padding-top: 70px; padding-bottom: 70px; }
        }
        .qc-section-title {
          font-family: var(--font-heading);
          font-size: clamp(22px, 2.4vw, 34px);
          font-weight: var(--font-weight-bold);
          margin-bottom: 28px;
          letter-spacing: -0.3px;
        }
        @media (min-width: 1024px) {
          .qc-section-title { margin-bottom: 36px; }
        }
        .qc-slider {
          position: relative;
          width: 100%;
        }
        .qc-track {
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
        .qc-track::-webkit-scrollbar { display: none; }
        .qc-arrow {
          display: flex;
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
          .qc-arrow { width: 56px; height: 56px; }
        }
        .qc-arrow:hover {
          background: var(--color-cta-green, #b5e61d);
          color: #0a0a0a;
          border-color: var(--color-cta-green, #b5e61d);
        }
        .qc-arrow-prev { left: max(12px, calc((100vw - 1280px) / 2 - 4px)); }
        .qc-arrow-next { right: 16px; }
        .qc-card {
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
        .qc-card::before {
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
        .qc-card::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 28%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0) 80%);
          z-index: 1;
          pointer-events: none;
        }
        .qc-card:hover { transform: translateY(-3px); }
        .qc-poster {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background-color: #0a0a0a;
          background-size: cover;
          background-position: center;
          z-index: 0;
        }
        .qc-tag {
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
        .qc-tag-horror { background-color: #9b1c2e; }
        .qc-tag-detective { background-color: #3b82f6; }
        .qc-tag-kids { background-color: #fbbf24; color: #0a0a0a; }
        .qc-body {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 0 22px 22px;
        }
        .qc-title {
          font-size: 20px;
          font-weight: 600;
          color: #fff;
          line-height: 1.25;
          letter-spacing: -0.1px;
        }
        .qc-sub {
          display: block;
          font-size: 14px;
          font-weight: 400;
          color: rgba(255,255,255,0.85);
          margin-top: 4px;
          line-height: 1.4;
        }
        .qc-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px 14px;
          font-size: 12px;
          color: var(--color-text-muted, #888);
          margin-top: auto;
        }
        .qc-info { font-size: 12px; color: var(--color-text-muted, #888); }
        .qc-difficulty { display: inline-flex; align-items: center; gap: 3px; }
        .qc-dot {
          display: inline-block;
          width: 13px;
          height: 15px;
          background-color: var(--color-cta-green, #b5e61d);
          -webkit-mask: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 15 17'%3E%3Cpath d='M10.7139 0.63514C15.1557 2.54674 15.752 6.58467 13.7659 11.0287C13.3895 11.8696 12.9604 12.6338 12.4834 13.308C12.4868 13.3124 12.4909 13.3169 12.4942 13.3217C12.4367 13.3934 12.3769 13.4631 12.3179 13.5334C11.0527 15.2273 9.4632 16.3007 7.59777 16.5115C6.4135 16.7037 5.14592 16.5327 3.8337 15.8587C3.81742 15.8504 3.80206 15.8403 3.78589 15.8319C1.49829 14.8192 0.412164 13.2673 0.141043 11.37C-0.250174 9.50296 0.184504 7.35877 1.27539 5.15248C3.3028 1.05793 6.50418 -1.05506 10.4483 0.525214C10.5363 0.559628 10.6248 0.596897 10.7139 0.63514ZM9.39347 4.43246C7.24232 3.37955 6.04979 4.92674 4.99787 7.05831C3.94041 9.19472 3.40863 11.1073 5.52765 12.247C7.79629 13.2087 8.94355 11.5697 9.92527 9.37382C10.8599 7.28991 11.2963 5.4492 9.39347 4.43246Z' fill='black'/%3E%3C/svg%3E") no-repeat center / contain;
          mask: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 15 17'%3E%3Cpath d='M10.7139 0.63514C15.1557 2.54674 15.752 6.58467 13.7659 11.0287C13.3895 11.8696 12.9604 12.6338 12.4834 13.308C12.4868 13.3124 12.4909 13.3169 12.4942 13.3217C12.4367 13.3934 12.3769 13.4631 12.3179 13.5334C11.0527 15.2273 9.4632 16.3007 7.59777 16.5115C6.4135 16.7037 5.14592 16.5327 3.8337 15.8587C3.81742 15.8504 3.80206 15.8403 3.78589 15.8319C1.49829 14.8192 0.412164 13.2673 0.141043 11.37C-0.250174 9.50296 0.184504 7.35877 1.27539 5.15248C3.3028 1.05793 6.50418 -1.05506 10.4483 0.525214C10.5363 0.559628 10.6248 0.596897 10.7139 0.63514ZM9.39347 4.43246C7.24232 3.37955 6.04979 4.92674 4.99787 7.05831C3.94041 9.19472 3.40863 11.1073 5.52765 12.247C7.79629 13.2087 8.94355 11.5697 9.92527 9.37382C10.8599 7.28991 11.2963 5.4492 9.39347 4.43246Z' fill='black'/%3E%3C/svg%3E") no-repeat center / contain;
        }
        .qc-dot-off { background-color: rgba(255,255,255,0.18); }
        .qc-link {
          position: absolute;
          inset: 0;
          z-index: 5;
          border-radius: var(--radius-lg, 16px);
        }
        .qc-hover {
          position: absolute;
          inset: 0;
          z-index: 6;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 18px;
          padding: 28px;
          text-align: center;
          background-color: #0f0f0f;
          border-radius: inherit;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.4s ease;
        }
        .qc-card:hover .qc-hover { opacity: 1; pointer-events: auto; }
        .qc-hover-icon { display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
        .qc-hover-icon svg { width: 56px; height: 54px; }
        .qc-hover-title { font-size: 20px; font-weight: 600; color: #fff; line-height: 1.3; }
        .qc-hover-text { font-size: 14px; line-height: 1.5; color: var(--color-text-muted, #888); max-width: 280px; margin: 0; }
        .qc-hover-actions { display: flex; flex-direction: column; gap: 10px; width: 100%; margin-top: 6px; }
        .qc-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 14px 26px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 14px;
          line-height: 1.2;
          text-align: center;
          cursor: pointer;
          white-space: nowrap;
          text-decoration: none;
          transition: transform 0.15s, background-color 0.15s;
        }
        .qc-btn-pink { background-color: var(--color-cta-pink, #d946ef); color: #fff; }
        .qc-btn-pink:hover { background-color: #e85cff; transform: translateY(-1px); }
        .qc-btn-green { background-color: var(--color-cta-green, #b5e61d); color: #0a0a0a; }
        .qc-btn-green:hover { background-color: #c5f52d; transform: translateY(-1px); }
        .qc-btn-full { width: 100%; z-index: 7; }
      `}} />
    </section>
  )
}
