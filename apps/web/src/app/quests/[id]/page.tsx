import { fetchApi } from '@/lib/api'
import type { QuestDetail } from '@/lib/api'
import QuestDetailClient from './QuestDetailClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { id: string } }) {
  try {
    const quest: QuestDetail = await fetchApi(`/quests/${params.id}`)
    return {
      title: `PANDOROOM — ${quest.name}`,
      description: quest.description.slice(0, 160),
    }
  } catch {
    return { title: 'PANDOROOM — Квест не найден' }
  }
}

async function getQuest(id: string): Promise<QuestDetail | null> {
  try {
    return await fetchApi(`/quests/${id}`)
  } catch {
    return null
  }
}

export default async function QuestDetailPage({ params }: { params: { id: string } }) {
  const quest = await getQuest(params.id)

  if (!quest) {
    return (
      <main>
        <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
          <h1>Квест не найден</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 16 }}>
            Запрашиваемый квест не существует или был удалён.
          </p>
        </div>
      </main>
    )
  }

  return <QuestDetailClient quest={quest} />
}
