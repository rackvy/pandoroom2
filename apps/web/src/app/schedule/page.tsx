import { fetchApi } from '@/lib/api'
import type { Quest } from '@/lib/api'
import ScheduleClient from './ScheduleClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'PANDOROOM — Расписание квестов',
  description: 'Расписание квестов во Владивостоке. Выберите дату и время для бронирования.',
}

async function getQuests(): Promise<Quest[]> {
  try {
    return await fetchApi('/quests')
  } catch {
    return []
  }
}

export default async function SchedulePage() {
  const quests = await getQuests()
  return <ScheduleClient quests={quests} />
}
