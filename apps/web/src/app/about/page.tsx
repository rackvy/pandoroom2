export const metadata = {
  title: 'О компании - Pandoroom',
  description: 'Узнайте больше о Pandoroom — самом большом квеструме во Владивостоке',
}

export default function AboutPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 24px', minHeight: '60vh' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '24px' }}>О компании</h1>
      <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#555' }}>
        Pandoroom — самый большой квеструм и площадки для праздников во Владивостоке.
        Мы работаем с 2015 года и предлагаем 15 квест-комнат для любого возраста,
        3 зоны кафе и организацию праздников под ключ.
      </p>
      <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#555', marginTop: '16px' }}>
        Раздел в разработке. Скоро здесь появится подробная информация о нашей команде,
        истории и миссии.
      </p>
    </main>
  )
}
