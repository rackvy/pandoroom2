import Link from 'next/link'
import styles from './quests.module.css'

export const metadata = {
  title: 'PANDOROOM — Все квесты во Владивостоке',
  description:
    '16 разнообразных квестов для любой компании. Квесты с актёрами и без, детские, хорроры, приключения. Забронируйте онлайн!',
}

/* ------------------------------------------------------------------ */
/*  Mock data — 14 quests from the HTML mockup                        */
/* ------------------------------------------------------------------ */

interface QuestMock {
  id: string
  title: string
  subtitle?: string
  difficulty: number // 1-5
  duration: string
  players: string
  age: string
  slots: { h: string; m: string }[]
}

const quests: QuestMock[] = [
  {
    id: '1',
    title: 'Гарри Поттер',
    subtitle: 'и Философский камень',
    difficulty: 4,
    duration: '60 мин',
    players: '2-6',
    age: '12+',
    slots: [
      { h: '17', m: '00' },
      { h: '18', m: '30' },
      { h: '20', m: '00' },
    ],
  },
  {
    id: '2',
    title: 'Чумной доктор',
    difficulty: 3,
    duration: '60 мин',
    players: '2-6',
    age: '12+',
    slots: [
      { h: '17', m: '00' },
      { h: '19', m: '00' },
      { h: '21', m: '00' },
    ],
  },
  {
    id: '3',
    title: 'Сокровища пиратов',
    difficulty: 2,
    duration: '60 мин',
    players: '2-6',
    age: '12+',
    slots: [
      { h: '18', m: '00' },
      { h: '20', m: '00' },
    ],
  },
  {
    id: '4',
    title: 'Resident Evil',
    difficulty: 3,
    duration: '80 мин',
    players: '2-6',
    age: '12+',
    slots: [
      { h: '17', m: '30' },
      { h: '19', m: '30' },
      { h: '21', m: '30' },
    ],
  },
  {
    id: '5',
    title: 'Код Да Винчи',
    difficulty: 3,
    duration: '60 мин',
    players: '2-6',
    age: '12+',
    slots: [
      { h: '17', m: '00' },
      { h: '19', m: '00' },
      { h: '21', m: '00' },
    ],
  },
  {
    id: '6',
    title: 'Инквизиция',
    difficulty: 4,
    duration: '60 мин',
    players: '2-6',
    age: '14+',
    slots: [
      { h: '18', m: '00' },
      { h: '20', m: '00' },
    ],
  },
  {
    id: '7',
    title: 'Silent Hill',
    difficulty: 5,
    duration: '80 мин',
    players: '2-6',
    age: '16+',
    slots: [
      { h: '18', m: '30' },
      { h: '21', m: '00' },
    ],
  },
  {
    id: '8',
    title: 'Секретный эксперимент',
    difficulty: 4,
    duration: '70 мин',
    players: '2-6',
    age: '12+',
    slots: [
      { h: '17', m: '00' },
      { h: '19', m: '30' },
    ],
  },
  {
    id: '9',
    title: 'Тайна старого театра',
    difficulty: 3,
    duration: '60 мин',
    players: '2-6',
    age: '12+',
    slots: [
      { h: '17', m: '00' },
      { h: '18', m: '30' },
      { h: '20', m: '00' },
    ],
  },
  {
    id: '10',
    title: 'Охотники',
    difficulty: 4,
    duration: '60 мин',
    players: '2-6',
    age: '14+',
    slots: [
      { h: '18', m: '00' },
      { h: '20', m: '30' },
    ],
  },
  {
    id: '11',
    title: 'Лазертаг',
    difficulty: 2,
    duration: '60 мин',
    players: '4-8',
    age: '7+',
    slots: [
      { h: '17', m: '00' },
      { h: '18', m: '30' },
      { h: '20', m: '00' },
    ],
  },
  {
    id: '12',
    title: 'Ограбление века',
    difficulty: 3,
    duration: '60 мин',
    players: '2-6',
    age: '10+',
    slots: [
      { h: '17', m: '00' },
      { h: '19', m: '00' },
      { h: '21', m: '00' },
    ],
  },
  {
    id: '13',
    title: 'Вий',
    difficulty: 3,
    duration: '60 мин',
    players: '2-6',
    age: '10+',
    slots: [
      { h: '18', m: '00' },
      { h: '20', m: '00' },
    ],
  },
  {
    id: '14',
    title: 'Джуманджи',
    difficulty: 3,
    duration: '60 мин',
    players: '2-6',
    age: '10+',
    slots: [
      { h: '17', m: '00' },
      { h: '19', m: '00' },
      { h: '21', m: '00' },
    ],
  },
]

/* Gradient placeholders per quest (deterministic from index) */
const gradients = [
  'linear-gradient(135deg, #1a1028 0%, #0a0a0a 100%)',
  'linear-gradient(135deg, #1a2010 0%, #07080a 100%)',
  'linear-gradient(135deg, #20180a 0%, #08070a 100%)',
  'linear-gradient(135deg, #15101f 0%, #050514 100%)',
  'linear-gradient(135deg, #20102a 0%, #070514 100%)',
  'linear-gradient(135deg, #0f1a20 0%, #060a0a 100%)',
  'linear-gradient(135deg, #201a10 0%, #0a0806 100%)',
]

/* ------------------------------------------------------------------ */
/*  Difficulty dots helper                                            */
/* ------------------------------------------------------------------ */

function DifficultyDots({ level }: { level: number }) {
  return (
    <span className={styles.qcardDifficulty}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i
          key={i}
          className={`${styles.qcardDot}${i > level ? ` ${styles.qcardDotOff}` : ''}`}
        />
      ))}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Filter-chip / genre-chip / date-picker data                       */
/* ------------------------------------------------------------------ */

const difficultyFilters = ['Все квесты', 'Начинающие', 'Азартные', 'Ходилки']
const genres = [
  'все жанры',
  'Приключение',
  'Экшен',
  'Мистический',
  'Хоррор',
  'Детектив',
  'Для детей',
]

const datePickerDays = [
  { num: '17', weekday: 'пн' },
  { num: '18', weekday: 'вт' },
  { num: '19', weekday: 'ср', active: true },
  { num: '20', weekday: 'чт' },
  { num: '21', weekday: 'пт' },
  { num: '22', weekday: 'сб' },
  { num: '23', weekday: 'вс' },
  { num: '24', weekday: 'пн' },
  { num: '25', weekday: 'вт' },
  { num: '26', weekday: 'ср' },
  { num: '27', weekday: 'чт' },
]

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function QuestsPage() {
  return (
    <main>
      {/* ==================== CATALOG HEADER + FILTERS ==================== */}
      <section className={styles.sectionCatalog}>
        <div className="container">
          <nav className={styles.breadcrumb} aria-label="Навигация">
            <Link href="/" className={styles.breadcrumbLink}>
              Главная
            </Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>Квесты</span>
          </nav>
          <h1 className={styles.catalogTitle}>Выберите квест во Владивостоке</h1>

          {/* Filters */}
          <div className={styles.catalogFilters}>
            {/* Difficulty filter chips */}
            <div className={styles.filtersRow}>
              {difficultyFilters.map((label, idx) => (
                <button
                  key={label}
                  className={`${styles.filterChip}${idx === 0 ? ` ${styles.filterChipActive}` : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Genre chips + toggle */}
            <div className={styles.filtersRow}>
              <div className={styles.filtersGenres}>
                {genres.map((g, idx) => (
                  <button
                    key={g}
                    className={`${styles.genreChip}${idx === 0 ? ` ${styles.genreChipActive}` : ''}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <label className={styles.filterToggle}>
                <input type="checkbox" className={styles.filterToggleInput} />
                <span className={styles.filterToggleLabel}>Квесты с актерами</span>
              </label>
            </div>

            {/* Dot-based param selectors */}
            <div className={`${styles.filtersRow} ${styles.filtersRowParams}`}>
              <div className={styles.filterParam}>
                <span className={styles.filterParamLabel}>Игроков:</span>
                <span className={styles.filterParamDots}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <i
                      key={i}
                      className={`${styles.filterDot}${i <= 2 ? ` ${styles.filterDotOn}` : ''}`}
                    />
                  ))}
                </span>
              </div>
              <div className={styles.filterParam}>
                <span className={styles.filterParamLabel}>Сложность</span>
                <span className={styles.filterParamDots}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <i
                      key={i}
                      className={`${styles.filterDot}${i <= 3 ? ` ${styles.filterDotOn}` : ''}`}
                    />
                  ))}
                </span>
              </div>
              <div className={styles.filterParam}>
                <span className={styles.filterParamLabel}>Сортировка</span>
                <span className={styles.filterParamDots}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <i
                      key={i}
                      className={`${styles.filterDot}${i <= 4 ? ` ${styles.filterDotOn}` : ''}`}
                    />
                  ))}
                </span>
              </div>
            </div>
          </div>

          {/* Date picker */}
          <div className={styles.datePicker}>
            <div className={styles.datePickerTrack}>
              {datePickerDays.map((d) => (
                <button
                  key={d.num + d.weekday}
                  className={`${styles.datePickerDay}${d.active ? ` ${styles.datePickerDayActive}` : ''}`}
                >
                  <span className={styles.datePickerNum}>{d.num}</span>
                  <span className={styles.datePickerWeekday}>{d.weekday}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== QUEST GRID ==================== */}
      <section className={styles.sectionQuestGrid}>
        <div className="container">
          <div className={styles.questGrid}>
            {quests.map((q, idx) => (
              <article
                key={q.id}
                className={styles.qcard}
                style={
                  {
                    '--poster': gradients[idx % gradients.length],
                  } as React.CSSProperties
                }
              >
                <div className={styles.qcardPoster} />
                <div className={styles.qcardBody}>
                  <h3 className={styles.qcardTitle}>
                    {q.title}
                    {q.subtitle && (
                      <>
                        <br />
                        <span className={styles.qcardSub}>{q.subtitle}</span>
                      </>
                    )}
                  </h3>
                  <div className={styles.qcardMeta}>
                    <DifficultyDots level={q.difficulty} />
                    <span className={styles.qcardInfo}>{q.duration}</span>
                    <span className={styles.qcardInfo}>{q.players}</span>
                    <span className={styles.qcardInfo}>{q.age}</span>
                  </div>
                  <div className={styles.qcardSlots}>
                    {q.slots.map((s) => (
                      <span key={s.h + s.m} className={styles.qcardSlot}>
                        {s.h}
                        <sub>{s.m}</sub>
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href={`/quests/${q.id}`}
                  className={styles.qcardLink}
                  aria-label="Подробнее"
                />
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
