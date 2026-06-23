import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pandoroom - Квесты и Кафе во Владивостоке',
  description: 'Самый большой квеструм и площадки для праздников во Владивостоке. 15 квест-комнат, 3 зоны кафе, организация праздников под ключ.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  )
}
