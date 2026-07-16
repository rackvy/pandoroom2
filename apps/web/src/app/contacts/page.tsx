import Link from 'next/link'
import { fetchApi, type Branch } from '@/lib/api'
import styles from './contacts.module.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Контакты — Pandoroom',
  description: 'Адреса, телефоны и карта филиалов Pandoroom во Владивостоке',
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
    name: 'Развлекательный центр Pandoroom',
    address: 'г. Владивосток, ул. Нижнепортовая, 1\n(«Морской вокзал», -1 этаж, вход со стороны моря)',
    phone: '+7 (423) 202-26-96',
  },
  {
    id: 'fallback-2',
    name: 'Pandoroom на Посьетской',
    address: 'г. Владивосток, ул. Посьетская, 27 стр. 2\n(район «Центр»)',
    phone: '+7 (423) 202-26-96',
  },
  {
    id: 'fallback-3',
    name: 'Филиал хоррор квестов Pandoroom',
    address: 'г. Владивосток, ул. Алеутская 17а\n(район «Серая лошадь»)',
    phone: '+7 (423) 205-44-58',
  },
]

/* ── Phone icon SVG ── */
function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

/* ── Pin icon SVG ── */
function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

/* ── Single branch card ── */
function BranchCard({ branch }: { branch: Branch }) {
  const hasCoords = branch.geoLat != null && branch.geoLng != null
  const phoneClean = branch.phone?.replace(/[\s()-]/g, '') ?? ''

  return (
    <div className={styles.card}>
      {/* Map section */}
      {hasCoords && (
        <div className={styles.mapWrap}>
          <iframe
            src={`https://yandex.ru/map-widget/v1/?ll=${branch.geoLng}%2C${branch.geoLat}&z=16&l=map&pt=${branch.geoLng}%2C${branch.geoLat}%2Cpm2rdm`}
            className={styles.mapFrame}
            allowFullScreen
            loading="lazy"
            title={`Карта: ${branch.address}`}
          />
          <Link
            href={`https://yandex.ru/maps/?ll=${branch.geoLng}%2C${branch.geoLat}&z=16`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mapLink}
          >
            <PinIcon />
            Открыть на карте
          </Link>
        </div>
      )}

      {/* Info section */}
      <div className={styles.cardBody}>
        <h2 className={styles.cardName}>{branch.name}</h2>

        {branch.address && (
          <p className={styles.cardAddress}>
            {branch.address.split('\n').map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </p>
        )}

        {branch.phone && (
          <a href={`tel:${phoneClean}`} className={styles.cardPhone}>
            <span className={styles.phoneIcon}>
              <PhoneIcon />
            </span>
            {branch.phone}
          </a>
        )}

        <div className={styles.cardExtras}>
          {branch.email && (
            <a href={`mailto:${branch.email}`} className={styles.extraLink}>
              {branch.email}
            </a>
          )}
          {branch.whatsapp && (
            <a
              href={`https://wa.me/${branch.whatsapp.replace(/[\s()-]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.extraLink}
            >
              WhatsApp
            </a>
          )}
          {branch.telegram && (
            <a
              href={`https://t.me/${branch.telegram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.extraLink}
            >
              Telegram
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default async function ContactsPage() {
  const apiBranches = await getBranches()
  const branches = apiBranches.length > 0 ? apiBranches : fallbackBranches
  const isSingle = branches.length === 1

  return (
    <main style={{ minHeight: '60vh', paddingTop: 140 }}>
      <div style={{ maxWidth: 'var(--container-max-width, 1280px)', margin: '0 auto', padding: '0 var(--container-padding, 16px)' }}>
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <Link href="/">Главная страница</Link>
        </nav>

        <h1 className={styles.pageTitle}>Контактная информация</h1>

        {/* Branches */}
        <div className={isSingle ? styles.gridSingle : styles.grid}>
          {branches.map((branch) => (
            <BranchCard key={branch.id} branch={branch} />
          ))}
        </div>
      </div>
    </main>
  )
}
