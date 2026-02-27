import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pandoroom - Квесты и Кафе',
  description: 'Погрузитесь в мир захватывающих квестов и отдохните в нашем уютном кафе',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
