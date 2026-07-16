import HolidayClient from '../HolidayClient'
import { teensData } from '../data'

export const metadata = {
  title: 'Праздники для детей 10-15 лет во Владивостоке | PANDOROOM',
  description: 'Организовываем праздники для подростков 10-15 лет во Владивостоке. Квесты с актёрами, лазертаг, кафе, lounge — праздник «под ключ» в Pandoroom.',
}

export default function HolidaysTeensPage() {
  return <HolidayClient data={teensData} />
}
