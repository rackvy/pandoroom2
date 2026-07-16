import HolidayClient from '../HolidayClient'
import { toddlersData } from '../data'

export const metadata = {
  title: 'Праздники для малышей во Владивостоке | PANDOROOM',
  description: 'Организовываем праздники для малышей во Владивостоке. Квесты, кафе, шоу-программы, игровая — праздник «под ключ» в семейном центре Pandoroom.',
}

export default function HolidaysToddlersPage() {
  return <HolidayClient data={toddlersData} />
}
