import { fetchApi, Quest, TableZonePublic, IikoMenuItemPublic } from '@/lib/api'
import HolidayBookingClient from './HolidayBookingClient'

export const metadata = {
  title: 'Онлайн-бронирование праздника во Владивостоке | PANDOROOM',
  description:
    'Соберите праздник онлайн: стол, квест, торт, шоу-программа, оформление и меню. Семейный центр Pandoroom во Владивостоке — праздник «под ключ».',
}

export default async function HolidayBookingPage() {
  const [zones, quests, menu] = await Promise.all([
    fetchApi('/tables').catch(() => [] as TableZonePublic[]),
    fetchApi('/quests').catch(() => [] as Quest[]),
    fetchApi('/menu').catch(() => [] as IikoMenuItemPublic[]),
  ])

  return (
    <HolidayBookingClient
      zones={zones as TableZonePublic[]}
      quests={quests as Quest[]}
      menu={menu as IikoMenuItemPublic[]}
    />
  )
}
