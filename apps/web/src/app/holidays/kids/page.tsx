import HolidayClient from '../HolidayClient'
import { kidsData } from '../data'

export const metadata = {
  title: 'Праздники для детей 6-10 лет во Владивостоке | PANDOROOM',
  description: 'Организовываем праздники для детей 6-10 лет во Владивостоке. Квесты, игровая, кафе, PS4/PS5, шоу-программы — праздник «под ключ» в Pandoroom.',
}

export default function HolidaysKidsPage() {
  return <HolidayClient data={kidsData} />
}
