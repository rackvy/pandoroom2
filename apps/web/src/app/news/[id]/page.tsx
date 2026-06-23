import Link from 'next/link'

export const metadata = {
  title: 'Новость - Pandoroom',
  description: 'Подробности новости',
}

export default function NewsDetailPage({ params }: { params: { id: string } }) {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 24px', minHeight: '60vh' }}>
      <Link href="/news" style={{ color: '#A0BF39', marginBottom: '24px', display: 'inline-block' }}>
        ← Назад к новостям
      </Link>
      <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px' }}>Новость #{params.id}</h1>
      <p style={{ color: '#555' }}>
        Страница новости в разработке.
      </p>
    </main>
  )
}
