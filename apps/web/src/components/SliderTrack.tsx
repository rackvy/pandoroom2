'use client'

import { useRef } from 'react'

/* ------------------------------------------------------------------ */
/*  SVG arrows                                                        */
/* ------------------------------------------------------------------ */

const ArrowPrevSvg = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const ArrowNextSvg = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface SliderQuest {
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
  quests: SliderQuest[]
  cardRender: (quest: SliderQuest) => React.ReactNode
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function SliderTrack({ quests, cardRender }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'prev' | 'next') => {
    if (!trackRef.current) return
    const card = trackRef.current.querySelector<HTMLElement>('.slider-card')
    const step = card ? card.offsetWidth + 18 : 378
    trackRef.current.scrollBy({
      left: direction === 'next' ? step : -step,
      behavior: 'smooth',
    })
  }

  if (quests.length === 0) return null

  return (
    <div className="st-wrapper">
      <button
        onClick={() => scroll('prev')}
        aria-label="Назад"
        className="st-arrow st-arrow-prev"
      >
        {ArrowPrevSvg}
      </button>

      <div ref={trackRef} className="st-track">
        {quests.map((quest) => (
          <div key={quest.id} className="slider-card">
            {cardRender(quest)}
          </div>
        ))}
      </div>

      <button
        onClick={() => scroll('next')}
        aria-label="Вперед"
        className="st-arrow st-arrow-next"
      >
        {ArrowNextSvg}
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        .st-wrapper {
          position: relative;
          width: 100%;
        }
        .st-track {
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
        .st-track::-webkit-scrollbar {
          display: none;
        }
        .st-arrow {
          display: flex;
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(20, 20, 20, 0.85);
          color: var(--color-text, #ccc);
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(6px);
          cursor: pointer;
        }
        @media (min-width: 1024px) {
          .st-arrow { width: 56px; height: 56px; }
        }
        .st-arrow:hover {
          background: var(--color-cta-green, #b5e61d);
          color: #0a0a0a;
          border-color: var(--color-cta-green, #b5e61d);
        }
        .st-arrow-prev {
          left: max(12px, calc((100vw - 1280px) / 2 - 4px));
        }
        .st-arrow-next {
          right: 16px;
        }
      `}} />
    </div>
  )
}
