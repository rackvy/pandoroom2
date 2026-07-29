import { fetchApi } from '@/lib/api'
import type { VRGameDetail, NewsItem } from '@/lib/api'
import VRGameDetailClient from './VRGameDetailClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { id: string } }) {
  try {
    const game: VRGameDetail = await fetchApi(`/vr-games/${params.id}`)
    const firstSectionText = game.contentSections?.[0]?.text?.replace(/<[^>]*>/g, '').trim() || ''
    const fallbackDescription = firstSectionText || (game.description || '').replace(/<[^>]*>/g, '').trim()
    return {
      title: game.seoTitle || `PANDOROOM — ${game.name}`,
      description: game.seoDescription || fallbackDescription.slice(0, 160),
      ...(game.seoKeywords ? { keywords: game.seoKeywords } : {}),
    }
  } catch {
    return { title: 'PANDOROOM — VR игра не найдена' }
  }
}

async function getVRGame(id: string): Promise<VRGameDetail | null> {
  try {
    return await fetchApi(`/vr-games/${id}`)
  } catch {
    return null
  }
}

async function getLatestNews(): Promise<NewsItem[]> {
  try {
    const all: NewsItem[] = await fetchApi('/news')
    return all.slice(0, 4)
  } catch {
    return []
  }
}

export default async function VRGameDetailPage({ params }: { params: { id: string } }) {
  const game = await getVRGame(params.id)

  if (!game) {
    return (
      <main>
        <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
          <h1>VR игра не найдена</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 16 }}>
            Запрашиваемая игра не существует или была удалена.
          </p>
        </div>
      </main>
    )
  }

  const news = await getLatestNews()

  return (
    <>
      <VRGameDetailClient game={game} news={news} />
      {game.schemaJson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: game.schemaJson }}
        />
      )}
    </>
  )
}
