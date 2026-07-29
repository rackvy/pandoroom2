import { fetchApi } from '@/lib/api'
import type { VRGame } from '@/lib/api'
import VRGamesClient from './VRGamesClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'PANDOROOM — VR игры во Владивостоке',
  description:
    'VR игры для компании до 20 человек на одной арене. Шутеры, приключения и командные баталии в виртуальной реальности. Смотрите видео и выбирайте игру!',
}

async function getVRGames(): Promise<VRGame[]> {
  try {
    return await fetchApi('/vr-games')
  } catch {
    return []
  }
}

export default async function VRGamesPage() {
  const games = await getVRGames()

  return <VRGamesClient games={games} />
}
