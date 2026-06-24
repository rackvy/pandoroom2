import { fetchApi } from '@/lib/api'
import type { Quest } from '@/lib/api'
import QuestsClient from './QuestsClient'

export const metadata = {
  title: 'PANDOROOM — Все квесты во Владивостоке',
  description:
    'Разнообразные квесты для любой компании. Квесты с актёрами и без, детские, хорроры, приключения. Забронируйте онлайн!',
}

async function getQuests(): Promise<Quest[]> {
  try {
    return await fetchApi('/quests')
  } catch {
    return []
  }
}

export default async function QuestsPage() {
  const quests = await getQuests()

  return <QuestsClient quests={quests} />
}
