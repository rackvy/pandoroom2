'use client'

import { useRef } from 'react'

interface ReviewData {
  id: string
  name: string
  date: string
  text: string
  source: string
  sourceIcon?: string | null
}

interface Props {
  reviews: ReviewData[]
}

export default function ReviewsSlider({ reviews }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)

  if (reviews.length === 0) return null

  return (
    <div className="rs-wrapper">
      <div ref={trackRef} className="rs-track">
        {reviews.map((review) => (
          <article key={review.id} className="rs-card review-card-item">
            <div className="rs-card-header">
              <span className="rs-card-name">{review.name}</span>
              <span className="rs-card-date">{review.date}</span>
            </div>
            <div className="rs-card-stars">{'\u2605'.repeat(5)}</div>
            <p className="rs-card-text">{review.text}</p>
            <span className="rs-card-source">
              {review.sourceIcon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={review.sourceIcon} alt="" className="rs-source-icon" />
              )}
              {review.source}
            </span>
          </article>
        ))}
      </div>

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
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          color: var(--color-cta-green, #b5e61d);
          letter-spacing: 1px;
          align-self: flex-start;
        }
        .rs-source-icon {
          width: 16px;
          height: 16px;
          object-fit: contain;
          border-radius: 3px;
        }
      `}} />
    </div>
  )
}
