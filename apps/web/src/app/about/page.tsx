import { fetchApi, type AboutFact } from '@/lib/api'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'О компании - Pandoroom',
  description: 'Узнайте больше о Pandoroom — самом большом квеструме во Владивостоке',
}

async function getAboutFacts(): Promise<AboutFact[]> {
  try {
    return await fetchApi('/about-facts')
  } catch {
    return []
  }
}

export default async function AboutPage() {
  const facts = await getAboutFacts()
  const sortedFacts = [...facts].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <main style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '80px 24px',
      minHeight: '60vh',
      color: '#fff',
    }}>
      <h1 style={{
        fontSize: '32px',
        fontWeight: 700,
        marginBottom: '32px',
      }}>
        О компании
      </h1>

      <p style={{
        fontSize: '16px',
        lineHeight: 1.7,
        color: '#ccc',
        marginBottom: '40px',
      }}>
        Pandoroom — самый большой квеструм и площадки для праздников во Владивостоке.
        Мы работаем с 2015 года и предлагаем 19 квест-комнат для любого возраста,
        3 зоны кафе и организацию праздников под ключ.
      </p>

      {sortedFacts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {sortedFacts.map((fact) => (
            <div
              key={fact.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                padding: '20px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {fact.icon && (
                <span style={{
                  fontSize: '28px',
                  lineHeight: 1,
                  flexShrink: 0,
                }}>
                  {fact.icon}
                </span>
              )}
              <p style={{
                fontSize: '16px',
                lineHeight: 1.7,
                color: '#ccc',
                margin: 0,
              }}>
                {fact.text}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <p style={{
            fontSize: '16px',
            lineHeight: 1.7,
            color: '#888',
          }}>
            Информация скоро появится
          </p>
        </div>
      )}
    </main>
  )
}
