import Link from 'next/link'
import styles from './vr.module.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'VR — Pandoroom',
  description: 'Виртуальная реальность во Владивостоке — игры для компании от 2 до 20 человек',
}

/* ── Types ── */
interface VRGame {
  id: string
  name: string
  description: string | null
  genre: string | null
  minPlayers: number
  maxPlayers: number
  durationMinutes: number | null
  previewImage: { url: string } | null
  sortOrder: number
}

/* ── API fetch ── */
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/public'

async function getVRGames(): Promise<VRGame[]> {
  try {
    const res = await fetch(`${API}/vr-games`, { cache: 'no-store' })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

/* ── Fallback games for demo ── */
const fallbackGames: VRGame[] = [
  {
    id: 'fb-1',
    name: 'Загадочная башня',
    description: 'Поднимитесь на вершину таинственной башни, разгадывая головоломки на каждом этаже. Каждый уровень — новое испытание.',
    genre: 'Приключение',
    minPlayers: 2,
    maxPlayers: 6,
    durationMinutes: 45,
    previewImage: null,
    sortOrder: 0,
  },
  {
    id: 'fb-2',
    name: 'Космическая станция',
    description: 'Вы — экипаж космической станции. Система дала сбой, и у вас есть час, чтобы восстановить связь с Землёй.',
    genre: 'Sci-Fi',
    minPlayers: 2,
    maxPlayers: 8,
    durationMinutes: 60,
    previewImage: null,
    sortOrder: 1,
  },
  {
    id: 'fb-3',
    name: 'Зомби-апокалипсис',
    description: 'Город захвачен ордами зомби. Соберите команду и отбивайтесь от волн нежити, чтобы добраться до спасательного вертолёта.',
    genre: 'Экшен',
    minPlayers: 2,
    maxPlayers: 20,
    durationMinutes: 30,
    previewImage: null,
    sortOrder: 2,
  },
  {
    id: 'fb-4',
    name: 'Побег из тюрьмы',
    description: 'Вас подставили и заперли в камере. Найдите способ сбежать, пока охрана не обнаружила пропажу.',
    genre: 'Квест',
    minPlayers: 2,
    maxPlayers: 6,
    durationMinutes: 45,
    previewImage: null,
    sortOrder: 3,
  },
  {
    id: 'fb-5',
    name: 'Подводная лаборатория',
    description: 'Исследовательская станция на дне океана теряет герметичность. Найдите утечку и спасите команду.',
    genre: 'Хоррор',
    minPlayers: 2,
    maxPlayers: 10,
    durationMinutes: 50,
    previewImage: null,
    sortOrder: 4,
  },
  {
    id: 'fb-6',
    name: 'Дикий Запад',
    description: 'Перенеситесь в эпоху ковбоев и золотой лихорадки. Защитите город от банды грабителей.',
    genre: 'Приключение',
    minPlayers: 2,
    maxPlayers: 12,
    durationMinutes: 40,
    previewImage: null,
    sortOrder: 5,
  },
]

/* ── SVG Icons ── */
function IconPlayers() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function IconVR() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="10" rx="3" />
      <path d="M7 17c1.5-2 3.5-2 5 0" />
      <path d="M12 17c1.5-2 3.5-2 5 0" />
      <circle cx="7.5" cy="12" r="1.5" />
      <circle cx="16.5" cy="12" r="1.5" />
    </svg>
  )
}

/* ── Game Card ── */
function GameCard({ game }: { game: VRGame }) {
  const hasImage = game.previewImage?.url
  return (
    <div className={styles.card}>
      <div className={styles.cardImage}>
        {hasImage ? (
          <img src={game.previewImage!.url} alt={game.name} loading="lazy" />
        ) : (
          <div className={styles.cardImagePlaceholder}>
            <IconVR />
          </div>
        )}
        {game.genre && (
          <span className={styles.cardGenre}>{game.genre}</span>
        )}
      </div>
      <div className={styles.cardBody}>
        <h3 className={styles.cardName}>{game.name}</h3>
        {game.description && (
          <p className={styles.cardDesc}>{game.description}</p>
        )}
        <div className={styles.cardMeta}>
          <span className={styles.cardMetaItem}>
            <span className={styles.cardMetaIcon}><IconPlayers /></span>
            {game.minPlayers}–{game.maxPlayers} игроков
          </span>
          {game.durationMinutes && (
            <span className={styles.cardMetaItem}>
              <span className={styles.cardMetaIcon}><IconClock /></span>
              {game.durationMinutes} мин
            </span>
          )}
        </div>
        <button className={styles.cardBtn}>Забронировать</button>
      </div>
    </div>
  )
}

/* ── Page ── */
export default async function VRPage() {
  const apiGames = await getVRGames()
  const games = apiGames.length > 0 ? apiGames : fallbackGames

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            Виртуальная реальность
          </div>
          <h1 className={styles.heroTitle}>
            Погрузись в<br />другой мир
          </h1>
          <p className={styles.heroSub}>
            VR-игры для компании от 2 до 20 человек во Владивостоке.
            Надевай шлем и отправляйся в приключение, которого ещё не было.
          </p>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>{games.length}+</span>
              <span className={styles.heroStatLabel}>игр в каталоге</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>20</span>
              <span className={styles.heroStatLabel}>человек максимум</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>60</span>
              <span className={styles.heroStatLabel}>минут приключений</span>
            </div>
          </div>
        </section>

        {/* Games */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Выбери своё приключение</h2>
          <p className={styles.sectionSub}>
            Каждая игра — уникальная история. Собери команду и начни.
          </p>
          <div className={styles.grid}>
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Как это работает</h2>
          <p className={styles.sectionSub}>Четыре простых шага до виртуального приключения</p>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>1</div>
              <h3 className={styles.stepTitle}>Выбери игру</h3>
              <p className={styles.stepText}>Посмотри каталог и выбери сценарий, который нравится тебе и команде.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>2</div>
              <h3 className={styles.stepTitle}>Забронируй время</h3>
              <p className={styles.stepText}>Выбери удобную дату и время. Мы подготовим всё к вашему приходу.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>3</div>
              <h3 className={styles.stepTitle}>Приходи и играй</h3>
              <p className={styles.stepText}>Надевай VR-шлем и погрузись в виртуальный мир. Инструктор поможет разобраться.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>4</div>
              <h3 className={styles.stepTitle}>Делись эмоциями</h3>
              <p className={styles.stepText}>Мы запишем лучшие моменты на видео, чтобы ты мог пересмотреть.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
