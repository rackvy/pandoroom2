export const metadata = {
  title: 'Контакты - Pandoroom',
  description: 'Как нас найти — адреса, телефоны и часы работы Pandoroom во Владивостоке',
}

export default function ContactsPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 24px', minHeight: '60vh' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '24px' }}>Контакты</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Адрес</h2>
          <p style={{ color: '#555' }}>Владивосток, ул. Пушкинская, 14</p>
        </div>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Телефоны</h2>
          <p style={{ color: '#555' }}>
            <a href="tel:+74232022696" style={{ color: '#A0BF39' }}>8 (423) 202-26-96</a>
            <br />
            <a href="tel:+74232054468" style={{ color: '#A0BF39' }}>8 (423) 205-44-68</a>
          </p>
        </div>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Часы работы</h2>
          <p style={{ color: '#555' }}>Ежедневно 10:00 — 22:00</p>
        </div>
      </div>
      <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#999', marginTop: '32px' }}>
        Карта и форма обратной связи — в разработке.
      </p>
    </main>
  )
}
