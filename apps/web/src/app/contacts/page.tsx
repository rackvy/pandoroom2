import Link from 'next/link'
import { fetchApi, type Branch } from '@/lib/api'

export const metadata = {
  title: 'Контакты - Pandoroom',
  description: 'Как нас найти — адреса, телефоны и часы работы Pandoroom во Владивостоке',
}

async function getBranches(): Promise<Branch[]> {
  try {
    return await fetchApi('/branches')
  } catch {
    return []
  }
}

const fallbackBranches: Branch[] = [
  {
    id: 'fallback-1',
    name: 'Pandoroom на Пушкинской',
    address: 'Владивосток, ул. Пушкинская, 14',
    phone: '8 (423) 202-26-96',
    workingHours: 'Ежедневно 10:00 — 22:00',
  },
  {
    id: 'fallback-2',
    name: 'Pandoroom на Свердлова',
    address: 'Владивосток, ул. Свердлова, 13',
    phone: '8 (423) 205-44-68',
    workingHours: 'Ежедневно 10:00 — 22:00',
  },
]

export default async function ContactsPage() {
  const apiBranches = await getBranches()
  const branches = apiBranches.length > 0 ? apiBranches : fallbackBranches

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
        Контакты
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {branches.map((branch) => (
          <div
            key={branch.id}
            style={{
              padding: '24px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <h2 style={{
              fontSize: '20px',
              fontWeight: 600,
              marginBottom: '16px',
            }}>
              {branch.name}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <span style={{ color: '#888', fontSize: '14px' }}>Адрес</span>
                <p style={{ color: '#ccc', margin: '4px 0 0' }}>{branch.address}</p>
              </div>

              {branch.phone && (
                <div>
                  <span style={{ color: '#888', fontSize: '14px' }}>Телефон</span>
                  <p style={{ margin: '4px 0 0' }}>
                    <a href={`tel:${branch.phone.replace(/[\s()-]/g, '')}`} style={{ color: '#A0BF39', textDecoration: 'none' }}>
                      {branch.phone}
                    </a>
                  </p>
                </div>
              )}

              {branch.email && (
                <div>
                  <span style={{ color: '#888', fontSize: '14px' }}>Email</span>
                  <p style={{ margin: '4px 0 0' }}>
                    <a href={`mailto:${branch.email}`} style={{ color: '#A0BF39', textDecoration: 'none' }}>
                      {branch.email}
                    </a>
                  </p>
                </div>
              )}

              {branch.whatsapp && (
                <div>
                  <span style={{ color: '#888', fontSize: '14px' }}>WhatsApp</span>
                  <p style={{ margin: '4px 0 0' }}>
                    <a
                      href={`https://wa.me/${branch.whatsapp.replace(/[\s()-]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#A0BF39', textDecoration: 'none' }}
                    >
                      {branch.whatsapp}
                    </a>
                  </p>
                </div>
              )}

              {branch.telegram && (
                <div>
                  <span style={{ color: '#888', fontSize: '14px' }}>Telegram</span>
                  <p style={{ margin: '4px 0 0' }}>
                    <a
                      href={`https://t.me/${branch.telegram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#A0BF39', textDecoration: 'none' }}
                    >
                      {branch.telegram}
                    </a>
                  </p>
                </div>
              )}

              {branch.workingHours && (
                <div>
                  <span style={{ color: '#888', fontSize: '14px' }}>Часы работы</span>
                  <p style={{ color: '#ccc', margin: '4px 0 0' }}>{branch.workingHours}</p>
                </div>
              )}

              {branch.geoLat != null && branch.geoLng != null && (
                <div style={{ marginTop: '8px' }}>
                  <Link
                    href={`https://yandex.ru/maps/?ll=${branch.geoLng}%2C${branch.geoLat}&z=16`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#A0BF39',
                      textDecoration: 'none',
                      fontSize: '14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    Показать на карте
                  </Link>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
