import Link from 'next/link'
import styles from './guide.module.css'
import { fetchApi, type Quest, type NewsItem, type ReviewItem, type PageBlock } from '@/lib/api'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Праздник гид — Площадки для праздников во Владивостоке | PANDOROOM',
  description:
    'Площадки для праздников и самый большой квеструм во Владивостоке. Праздник «под ключ» — игровая, кафе, шоу-программа, квесты, торт и пиньята.',
}

/* ==================== API FETCHERS ==================== */

async function getQuests(): Promise<Quest[]> {
  try {
    return await fetchApi('/quests')
  } catch {
    return []
  }
}

async function getNews(): Promise<NewsItem[]> {
  try {
    return await fetchApi('/news')
  } catch {
    return []
  }
}

async function getReviews(): Promise<ReviewItem[]> {
  try {
    return await fetchApi('/reviews')
  } catch {
    return []
  }
}

async function getGuideBlocks(): Promise<PageBlock[]> {
  try {
    return await fetchApi('/content?pageKey=PARTY_GUIDE')
  } catch {
    return []
  }
}

/* ==================== FALLBACK DATA ==================== */

const fallbackHolidayCards = [
  { kicker: 'праздники', title: 'для малышей', poster: '/images/main/6.png', href: '/holidays/toddlers' },
  { kicker: 'праздники для детей', title: '6 — 10 лет', poster: '/images/main/5.png', href: '/holidays/kids' },
  { kicker: 'праздники для детей', title: '10 — 15 лет', poster: '/images/main/4.png', href: '/holidays/teens' },
  { kicker: 'организовываем', title: 'Выпускные\nиз детсада', poster: '/images/main/3.png', href: '/holidays' },
  { kicker: 'отпразднуем', title: 'Поступление\nв школу', poster: '/images/main/2.png', href: '/holidays' },
  { kicker: 'устроим праздник', title: 'По любому\nповоду! :)', poster: '/images/main/1.png', href: '/holidays' },
]

const services = [
  { name: 'Lounge' },
  { name: 'Игровая' },
  { name: 'Кафе' },
  { name: 'Шоу-программа' },
  { name: 'Квесты' },
  { name: 'Торт' },
  { name: 'Пиньята' },
]

/* ==================== MAPPING HELPERS ==================== */

function difficultyToLevel(d: string): number {
  return d === 'easy' ? 1 : d === 'medium' ? 3 : 5
}

function formatDuration(mins: number): string {
  return `${mins} минут`
}

function formatPlayers(min: number, max: number): string {
  return `${min}-${max} игроков`
}

function getTagVariant(genre: string): 'horror' | 'detective' | 'kids' | undefined {
  if (genre === 'хоррор') return 'horror'
  if (genre === 'детектив') return 'detective'
  if (genre === 'детский') return 'kids'
  return undefined
}

interface QuestCard {
  id: string
  title: string
  subtitle?: string
  tag: string
  tagVariant?: 'horror' | 'detective' | 'kids'
  difficulty: number
  duration: string
  players: string
  age: string
  poster: string
}

function mapQuest(q: Quest): QuestCard {
  return {
    id: q.id,
    title: q.name,
    subtitle: q.subtitle || undefined,
    tag: q.genre,
    tagVariant: getTagVariant(q.genre),
    difficulty: difficultyToLevel(q.difficulty),
    duration: formatDuration(q.durationMinutes),
    players: formatPlayers(q.minPlayers, q.maxPlayers),
    age: q.ageRestriction || '12+',
    poster: q.previewImage?.url || '',
  }
}

interface MappedNews {
  id: string
  cardBg: string
  coverTitle: string
  coverSub?: string
  coverVariant?: string
  date: string
  title: string
  text: string
}

interface MappedReview {
  id: string
  name: string
  date: string
  text: string
  source: string
}

/* ==================== FALLBACK QUESTS ==================== */

interface FallbackQuest {
  title: string
  sub?: string
  tag: string
  tagVariant?: 'horror' | 'detective' | 'kids'
  poster: string
  difficulty: number
  duration: string
  players: string
  age: string
}

const fallbackQuestsWithActors: FallbackQuest[] = [
  { title: 'Гарри Поттер', sub: 'и Философский камень', tag: 'приключение', poster: '/images/main/hp.jpg', difficulty: 4, duration: '60 минут', players: '2-6 игроков', age: '12+' },
  { title: 'Чумной доктор', tag: 'мистический', poster: '/images/quests/plague-doctor.jpg', difficulty: 3, duration: '60 минут', players: '2-6 игроков', age: '12+' },
  { title: 'Сокровища пиратов', tag: 'приключение', poster: '/images/quests/pirates.jpg', difficulty: 2, duration: '60 минут', players: '2-6 игроков', age: '12+' },
  { title: 'Resident Evil', tag: 'хоррор', tagVariant: 'horror', poster: '/images/quests/resident-evil.jpg', difficulty: 3, duration: '80 минут', players: '2-6 игроков', age: '12+' },
  { title: 'Код Да Винчи', tag: 'приключение', poster: '/images/quests/da-vinci.jpg', difficulty: 3, duration: '60 минут', players: '2-6 игроков', age: '12+' },
]

const fallbackQuestsWithoutActors: FallbackQuest[] = [
  { title: 'Инквизиция', tag: 'мистический', poster: '/images/quests/inquisition.jpg', difficulty: 4, duration: '60 минут', players: '2-6 игроков', age: '14+' },
  { title: 'Silent Hill', tag: 'хоррор', tagVariant: 'horror', poster: '/images/quests/silent-hill.jpg', difficulty: 5, duration: '80 минут', players: '2-6 игроков', age: '16+' },
  { title: 'Секретный эксперимент', tag: 'детектив', tagVariant: 'detective', poster: '/images/quests/secret-experiment.jpg', difficulty: 4, duration: '70 минут', players: '2-6 игроков', age: '12+' },
  { title: 'Тайна старого театра', tag: 'мистический', poster: '/images/quests/old-theatre.jpg', difficulty: 3, duration: '60 минут', players: '2-6 игроков', age: '12+' },
  { title: 'Охотники', tag: 'хоррор', tagVariant: 'horror', poster: '/images/quests/hunters.jpg', difficulty: 4, duration: '60 минут', players: '2-6 игроков', age: '14+' },
]

const fallbackKidsQuests: FallbackQuest[] = [
  { title: 'Лазертаг', tag: 'детский', tagVariant: 'kids', poster: '/images/quests/lasertag.jpg', difficulty: 2, duration: '60 минут', players: '4-8 игроков', age: '7+' },
  { title: 'Ограбление века', tag: 'детский', tagVariant: 'kids', poster: '/images/quests/heist.jpg', difficulty: 3, duration: '60 минут', players: '2-6 игроков', age: '10+' },
  { title: 'Вий', tag: 'детский', tagVariant: 'kids', poster: '/images/quests/viy.jpg', difficulty: 3, duration: '60 минут', players: '2-6 игроков', age: '10+' },
]

const fallbackNews: Array<{ cardBg: string; coverTitle: string; coverSub?: string; coverVariant?: string; date: string; title: string; text: string }> = [
  {
    coverTitle: 'ДЕНЬ РОЖДЕНИЯ\nВ КВЕСТЕ',
    cardBg: 'linear-gradient(180deg, #1a2010 0%, #07080a 100%)',
    date: '25 августа 2024',
    title: 'День рождения в квесте',
    text: 'Празднуем у нас — это такой праздник, который останется в памяти навсегда у вас и вашего ребенка! Хотят сценарии, кафе, праздник и многое другое.',
  },
  {
    coverTitle: 'МУМИЯ',
    coverSub: 'СКОРО ОТКРЫТИЕ',
    coverVariant: 'mummy',
    cardBg: 'linear-gradient(180deg, #20180a 0%, #08070a 100%)',
    date: '1 ноября 2024',
    title: 'Новый квест — Мумия',
    text: 'А мы уже готовимся к открытию нового квеста! Группа архитекторов уже расписала макет квеста и в работе.',
  },
  {
    coverTitle: '30%',
    coverSub: 'на квест «Тайна Теслы»',
    coverVariant: 'discount',
    cardBg: 'linear-gradient(180deg, #15101f 0%, #050514 100%)',
    date: '19 августа 2024',
    title: 'Скидка 30% на «Тайна Теслы»',
    text: 'Только на этой неделе у вас есть последняя возможность пройти квест «Тайна Теслы» со скидкой 30%',
  },
  {
    coverTitle: 'ДАРИМ\nКВЕСТ',
    coverSub: 'на весь май',
    coverVariant: 'may',
    cardBg: 'linear-gradient(180deg, #20102a 0%, #070514 100%)',
    date: '1 мая 2024',
    title: 'Дарим квест весь май',
    text: 'Продлеваем акцию! На День Рождения примите подарок от PANDOROOM — дарим квест «Тайна Теслы» при бронировании праздника.',
  },
]

const fallbackReviews: Array<{ name: string; date: string; text: string; source: string }> = [
  { name: 'Кристина', date: '12 августа 2024', text: 'Вот уже много лет отмечаем у нас праздники здесь. Это невероятно крутое место для детей и для взрослых. Сама атмосфера просто волшебная.', source: 'VL.RU' },
  { name: 'Пелагея Ганчикова', date: '6 августа 2024', text: 'Были в Джинсе на Свердлова с детьми, всё было организовано отлично. Иваня. Дочка с 5 лет, остались очень довольны, ушли с подарками — благодарим за заботу!', source: '2GIS' },
  { name: 'Роксолана Скрипка', date: '1 августа 2024', text: 'Отличное место для празднования с друзьями, семьей или со своей второй половиной. Также отличная кухня и разнообразный бар :) Иван — официант, всё на высоте!', source: '2GIS' },
  { name: 'Карина Белоснежкина', date: '29 июля 2024', text: 'Спасибо большое за хорошо организованный праздник! Иван — мой любимый официант. Привлечен сторил тосты, постоянно нас веселил, настроение на все 5+. Спасибо!', source: '2GIS' },
]

/* ==================== SUB-COMPONENTS ==================== */

function DifficultyDots({ level }: { level: number }) {
  return (
    <span className={styles.questCardDifficulty} aria-label={`Сложность ${level} из 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`${styles.questCardDot}${i > level ? ` ${styles.questCardDotOff}` : ''}`}>
          {i <= level ? '🔥' : ''}
        </span>
      ))}
    </span>
  )
}

function QuestCardItem({ quest }: { quest: QuestCard | FallbackQuest }) {
  const tagClass =
    quest.tagVariant === 'horror'
      ? `${styles.questCardTag} ${styles.questCardTagHorror}`
      : quest.tagVariant === 'detective'
        ? `${styles.questCardTag} ${styles.questCardTagDetective}`
        : quest.tagVariant === 'kids'
          ? `${styles.questCardTag} ${styles.questCardTagKids}`
          : styles.questCardTag

  return (
    <article
      className={styles.questCard}
      style={{ '--poster': `url('${quest.poster}')` } as React.CSSProperties}
    >
      <div
        className={styles.questCardPoster}
        style={{ backgroundImage: `url('${quest.poster}')` }}
      />
      <span className={tagClass}>{quest.tag}</span>
      <div className={styles.questCardBody}>
        <h3 className={styles.questCardTitle}>
          {quest.title}
          {'subtitle' in quest && quest.subtitle
            ? <span className={styles.questCardSub}>{quest.subtitle}</span>
            : 'sub' in quest && quest.sub
              ? <span className={styles.questCardSub}>{quest.sub}</span>
              : null
          }
        </h3>
        <div className={styles.questCardMeta}>
          <DifficultyDots level={quest.difficulty} />
          <span className={styles.questCardInfo}>{quest.duration}</span>
          <span className={styles.questCardInfo}>{quest.players}</span>
          <span className={styles.questCardInfo}>{quest.age}</span>
        </div>
      </div>
      <Link href="/quests" className={styles.questCardLink} aria-label="Подробнее" />
    </article>
  )
}

function QuestsSlider({ title, quests }: { title: string; quests: (QuestCard | FallbackQuest)[] }) {
  return (
    <section className={styles.sectionQuests}>
      <div className="container">
        <h2 className={`${styles.sectionTitle} ${styles.titleEffect}`}>{title}</h2>
      </div>
      <div className={styles.questsSlider}>
        <button className={`${styles.sliderArrow} ${styles.sliderArrowPrev}`} aria-label="Назад">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div className={styles.questsSliderTrack}>
          {quests.map((quest, idx) => (
            <QuestCardItem key={'id' in quest ? quest.id : idx} quest={quest} />
          ))}
        </div>
        <button className={`${styles.sliderArrow} ${styles.sliderArrowNext}`} aria-label="Вперед">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
    </section>
  )
}

/* ==================== PAGE ==================== */

export default async function GuidePage() {
  const [allQuests, newsData, reviewsData, guideBlocks] = await Promise.all([
    getQuests(),
    getNews(),
    getReviews(),
    getGuideBlocks(),
  ])

  /* --- quests --- */
  const apiQuestsWithActors = allQuests
    .filter(q => q.hasActors && q.ageRestriction !== '0+')
    .map(mapQuest)

  const apiQuestsWithoutActors = allQuests
    .filter(q => !q.hasActors && q.ageRestriction !== '0+')
    .map(mapQuest)

  const apiKidsQuests = allQuests
    .filter(q => q.ageRestriction === '0+')
    .map(mapQuest)

  const questsWithActors: (QuestCard | FallbackQuest)[] = apiQuestsWithActors.length > 0 ? apiQuestsWithActors : fallbackQuestsWithActors
  const questsWithoutActors: (QuestCard | FallbackQuest)[] = apiQuestsWithoutActors.length > 0 ? apiQuestsWithoutActors : fallbackQuestsWithoutActors
  const kidsQuests: (QuestCard | FallbackQuest)[] = apiKidsQuests.length > 0 ? apiKidsQuests : fallbackKidsQuests

  /* --- holiday cards --- */
  const holidayCardsData = (() => {
    try {
      const parsed = JSON.parse(
        guideBlocks.find(b => b.blockKey === 'holiday_cards')?.extraJson || '[]'
      ) as Array<{ kicker: string; title: string; poster: string; href?: string }>
      return parsed.length > 0 ? parsed : fallbackHolidayCards
    } catch {
      return fallbackHolidayCards
    }
  })()

  /* --- news --- */
  const newsItems: MappedNews[] = newsData.length > 0
    ? newsData.map(n => ({
        id: n.id,
        cardBg: n.cardBg || 'linear-gradient(180deg, #1a2010 0%, #07080a 100%)',
        coverTitle: n.coverTitle || n.title,
        coverSub: n.coverSub || undefined,
        coverVariant: n.coverVariant || undefined,
        date: new Date(n.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
        title: n.title,
        text: n.content.substring(0, 100) + '...',
      }))
    : fallbackNews.map((n, idx) => ({ id: `fallback-${idx}`, ...n }))

  /* --- reviews --- */
  const reviewItems: MappedReview[] = reviewsData.length > 0
    ? reviewsData.map(r => ({
        id: r.id,
        name: r.name,
        date: new Date(r.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
        text: r.text,
        source: r.source?.name || '',
      }))
    : fallbackReviews.map((r, idx) => ({ id: `fallback-${idx}`, ...r }))

  return (
    <main>
      {/* ===== HERO (holidays variant) ===== */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              <span className={styles.heroTitleLine}>Площадки для праздников</span>
              <span className={styles.heroTitleLine}>
                и самый большой <Link href="/quests" className={styles.heroTitleLink}>квеструм</Link>
              </span>
              <span className={styles.heroTitleLine}>во Владивостоке</span>
            </h1>

            <div className={styles.heroButtons}>
              <Link href="/quests" className={`${styles.btn} ${styles.btnPink}`}>
                Забронировать квест
              </Link>
              <a href="#holidays-grid" className={`${styles.btn} ${styles.btnGreen}`}>
                Отметить праздник
              </a>
            </div>

            <ul className={styles.heroFeatures}>
              <li className={styles.heroFeature}>
                <span className={styles.heroCheck} aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l3.5 3.5L12 3.5" stroke="#b5e61d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>19 разнообразных квестов для любой компании</span>
              </li>
              <li className={styles.heroFeature}>
                <span className={styles.heroCheck} aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l3.5 3.5L12 3.5" stroke="#b5e61d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>три зала кафе, площадью более 350 м²</span>
              </li>
              <li className={styles.heroFeature}>
                <span className={styles.heroCheck} aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l3.5 3.5L12 3.5" stroke="#b5e61d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>ваш праздник «под ключ»</span>
              </li>
              <li className={styles.heroFeature}>
                <span className={styles.heroCheck} aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l3.5 3.5L12 3.5" stroke="#b5e61d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>работаем с 2015 года</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ===== ДЕТСКИЕ ПРАЗДНИКИ ===== */}
      <section className={`${styles.section} ${styles.sectionHolidays}`} id="holidays-grid">
        <div className="container">
          <div className={styles.holidaysIntro}>
            <h2 className={styles.holidaysIntroTitle}>
              <span className={styles.holidaysIntroLine}>Устройте незабываемый</span>
              <span className={`${styles.holidaysIntroLine} ${styles.titleEffect}`}>
                праздник для вашего ребенка
              </span>
              <span className={styles.holidaysIntroLine}>в семейном центре «Пандорум»</span>
            </h2>
          </div>

          <div className={styles.holidaysGrid}>
            {holidayCardsData.map((card, idx) => (
              <article
                key={idx}
                className={styles.holidayCard}
                style={{ '--poster': `url('${card.poster}')` } as React.CSSProperties}
              >
                <span className={styles.holidayCardKicker}>{card.kicker}</span>
                <h3 className={styles.holidayCardTitle}>
                  {card.title.split('\n').map((line, i, arr) => (
                    <span key={i}>
                      {line}
                      {i < arr.length - 1 && <br />}
                    </span>
                  ))}
                </h3>
                <Link href={card.href || '/guide'} className={styles.holidayCardBtn}>
                  подробнее
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ИКОНКИ УСЛУГ ===== */}
      <section className={`${styles.section} ${styles.sectionServices}`}>
        <div className="container">
          <p className={styles.servicesHint}>для каждого праздника вы можете подобрать</p>
          <div className={styles.servicesRow}>
            {services.map((svc, idx) => (
              <div key={idx} className={styles.serviceItem}>
                <div className={styles.serviceItemIcon}>
                  <svg width="64" height="64" viewBox="0 0 89 83" fill="none">
                    <circle cx="44" cy="42" r="30" stroke="white" strokeWidth="2" fill="none" />
                    <text x="44" y="48" textAnchor="middle" fill="white" fontSize="14" fontFamily="var(--font-primary)">
                      {svc.name.charAt(0)}
                    </text>
                  </svg>
                </div>
                <span className={styles.serviceItemName}>{svc.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== КВЕСТЫ С АКТЕРАМИ ===== */}
      <QuestsSlider title="Квесты с актерами во Владивостоке" quests={questsWithActors} />

      {/* ===== КВЕСТЫ БЕЗ АКТЕРОВ ===== */}
      <QuestsSlider title="Квесты без актеров во Владивостоке" quests={questsWithoutActors} />

      {/* ===== КВЕСТЫ ДЛЯ ДЕТЕЙ ===== */}
      <QuestsSlider title="Квесты для детей во Владивостоке" quests={kidsQuests} />

      {/* ===== ФОНОВЫЙ БЛОК (НОВОСТИ + ОТЗЫВЫ) ===== */}
      <div className={styles.bgPrefooter}>
        {/* ===== НОВОСТИ И АКЦИИ ===== */}
        <section className={styles.section}>
          <div className="container">
            <h2 className={`${styles.sectionTitle} ${styles.titleEffect}`}>Новости и акции</h2>
            <div className={styles.newsGrid}>
              {newsItems.map((item) => (
                <article
                  key={item.id}
                  className={styles.newsCard}
                  style={{ '--card-bg': item.cardBg } as React.CSSProperties}
                >
                  <div
                    className={`${styles.newsCardCover}${item.coverVariant === 'discount' ? ` ${styles.newsCardCoverDiscount}` : ''}`}
                  >
                    <span className={styles.newsCardCoverTitle}>
                      {item.coverTitle.split('\n').map((line, i, arr) => (
                        <span key={i}>
                          {line}
                          {i < arr.length - 1 && <br />}
                        </span>
                      ))}
                    </span>
                    {item.coverSub && (
                      <span className={styles.newsCardCoverSub}>{item.coverSub}</span>
                    )}
                  </div>
                  <div className={styles.newsCardContent}>
                    <span className={styles.newsCardDate}>{item.date}</span>
                    <h3 className={styles.newsCardTitle}>{item.title}</h3>
                    <p className={styles.newsCardText}>{item.text}</p>
                    <Link href={`/news/${item.id}`} className={styles.newsCardLink}>
                      подробнее
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ===== ОТЗЫВЫ ГОСТЕЙ ===== */}
        <section className={styles.section}>
          <div className="container">
            <h2 className={`${styles.sectionTitle} ${styles.titleEffect}`}>Отзывы гостей</h2>
            <div className={styles.reviewsSlider}>
              <button className={`${styles.sliderArrow} ${styles.sliderArrowPrev}`} aria-label="Назад">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <div className={styles.reviewsSliderTrack}>
                {reviewItems.map((review) => (
                  <article key={review.id} className={styles.reviewCard}>
                    <div className={styles.reviewCardHeader}>
                      <span className={styles.reviewCardName}>{review.name}</span>
                      <span className={styles.reviewCardDate}>{review.date}</span>
                    </div>
                    <div className={styles.reviewCardStars}>{'★★★★★'}</div>
                    <p className={styles.reviewCardText}>{review.text}</p>
                    <span className={styles.reviewCardSource}>{review.source}</span>
                  </article>
                ))}
              </div>
              <button className={`${styles.sliderArrow} ${styles.sliderArrowNext}`} aria-label="Вперед">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className={styles.prefooterDivider} />
    </main>
  )
}
