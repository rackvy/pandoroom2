'use client'

import { useRef } from 'react'

interface ReviewData {
  id: string
  name: string
  date: string
  text: string
  source: string
}

interface Props {
  reviews: ReviewData[]
}

export default function ReviewsSlider({ reviews }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'prev' | 'next') => {
    if (!trackRef.current) return
    const card = trackRef.current.querySelector<HTMLElement>('.review-card-item')
    const step = card ? card.offsetWidth + 18 : 338
    trackRef.current.scrollBy({
      left: direction === 'next' ? step : -step,
      behavior: 'smooth',
    })
  }

  if (reviews.length === 0) return null

  return (
    <div className="rs-wrapper">
      <button
        onClick={() => scroll('prev')}
        aria-label="Назад"
        className="rs-arrow rs-arrow-prev"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div ref={trackRef} className="rs-track">
        {reviews.map((review) => (
          <article key={review.id} className="rs-card review-card-item">
            <div className="rs-card-header">
              <span className="rs-card-name">{review.name}</span>
              <span className="rs-card-date">{review.date}</span>
            </div>
            <div className="rs-card-stars">{'\u2605'.repeat(5)}</div>
            <p className="rs-card-text">{review.text}</p>
            <span className="rs-card-source">{review.source}</span>
          </article>
        ))}
      </div>

      <button
        onClick={() => scroll('next')}
        aria-label="Вперед"
        className="rs-arrow rs-arrow-next"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        .rs-wrapper {
          position: relative;
          display: flex;
          align-items: stretch;
          gap: 12px;
        }
        .rs-track {
          display: flex;
          gap: 18px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding: 4px 2px;
          flex: 1 1 auto;
        }
        .rs-track::-webkit-scrollbar {
          display: none;
        }
        .rs-card {
          flex: 0 0 280px;
          scroll-snap-align: start;
          background-color: rgba(20, 20, 20, 0.7);
          border-radius: var(--radius-lg, 16px);
          padding: 20px 22px 22px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
        }
        @media (min-width: 768px) {
          .rs-card { flex: 0 0 320px; }
        }
        .rs-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 6px;
        }
        .rs-card-name {
          font-weight: 700;
          font-size: 13px;
        }
        .rs-card-date {
          font-size: 11px;
          color: var(--color-text-muted, #888);
        }
        .rs-card-stars {
          color: var(--color-cta-green, #b5e61d);
          font-size: 13px;
          margin-bottom: 12px;
          letter-spacing: 2px;
        }
        .rs-card-text {
          font-size: 12px;
          color: var(--color-text, #ddd);
          line-height: 1.55;
          margin-bottom: 14px;
          flex: 1;
        }
        .rs-card-source {
          font-size: 11px;
          font-weight: 700;
          color: var(--color-cta-green, #b5e61d);
          letter-spacing: 1px;
          align-self: flex-start;
        }
        .rs-arrow {
          display: flex;
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
          width: 40px;
          height: 40px;
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
          .rs-arrow { width: 48px; height: 48px; }
        }
        .rs-arrow:hover {
          background: var(--color-cta-green, #b5e61d);
          color: #0a0a0a;
          border-color: var(--color-cta-green, #b5e61d);
        }
        .rs-arrow-prev {
          left: -56px;
        }
        .rs-arrow-next {
          right: -56px;
        }
      `}} />
    </div>
  )
}
