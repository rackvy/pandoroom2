'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Quest, TableZonePublic, IikoMenuItemPublic } from '@/lib/api'
import styles from './holiday-booking.module.css'

interface Props {
  zones: TableZonePublic[]
  quests: Quest[]
  menu: IikoMenuItemPublic[]
}

const ZONE_LABELS: Record<string, string> = {
  CAFE: 'Зал Кафе',
  LOUNGE: 'Зал Лаунж',
  KIDS: 'Детская зона',
}

const CAKE_CATEGORIES = ['Торты']
const CAKE_DECOR_CATEGORIES = ['Оформление торта']
const SHOW_CATEGORIES = ['Шоу-программы']
const DECOR_CATEGORIES = ['Организация', 'Атрибутика']
const FOOD_CATEGORIES = ['Кухня', 'Праздничное меню', 'Бар', 'Лимонады']

const DIFFICULTY_DOTS: Record<string, number> = {
  Легкий: 1,
  Средний: 2,
  Сложный: 3,
  'Очень сложный': 4,
}

const PAGE_SIZE = 4

function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return ''
  return `${String(Math.round(price)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} руб.`
}

function byCategory(menu: IikoMenuItemPublic[], categories: string[]): IikoMenuItemPublic[] {
  return menu.filter((item) => categories.includes(item.category))
}

interface CakeGroup {
  key: string
  name: string
  imageUrl: string | null
  variants: IikoMenuItemPublic[]
}

function weightLabel(item: IikoMenuItemPublic): string {
  const m = item.name.match(/(\d+(?:[.,]\d+)?)\s*кг\s*$/i)
  return m ? `${m[1]} кг` : item.weight || '1 порция'
}

function formatWeight(weight: string): string {
  const m = weight.match(/^([\d.,]+)\s*(.*)$/)
  if (!m) return weight
  const num = parseFloat(m[1].replace(',', '.'))
  if (Number.isNaN(num)) return weight
  const rounded = Math.round(num * 100) / 100
  return `${String(rounded).replace('.', ',')} ${m[2].trim()}`.trim()
}

function CoverImg({ src, alt }: { src?: string | null; alt: string }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) return <span className={styles.imgStub} aria-label={alt} />
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={src} alt={alt} className={styles.coverImg} loading="lazy" onError={() => setBroken(true)} />
}

function groupCakes(cakes: IikoMenuItemPublic[]): CakeGroup[] {
  const groups = new Map<string, CakeGroup>()
  cakes.forEach((item) => {
    const m = item.name.match(/^(.*?)\s+\d+(?:[.,]\d+)?\s*кг\s*$/i)
    const key = m ? m[1].trim() : item.name
    const group = groups.get(key)
    if (group) {
      group.variants.push(item)
      if (!group.imageUrl && item.imageUrl) group.imageUrl = item.imageUrl
    } else {
      groups.set(key, { key, name: key, imageUrl: item.imageUrl ?? null, variants: [item] })
    }
  })
  return Array.from(groups.values())
}

function DifficultyDots({ level }: { level: number }) {
  return (
    <span className={styles.dots} aria-label={`Сложность ${level} из 4`}>
      {[1, 2, 3, 4].map((i) => (
        <i key={i} className={i <= level ? styles.dotOn : styles.dotOff} />
      ))}
    </span>
  )
}

function Stepper({
  qty,
  onChange,
}: {
  qty: number
  onChange: (delta: number) => void
}) {
  return (
    <div className={`${styles.stepper} ${qty > 0 ? styles.stepperOn : ''}`}>
      <button type="button" className={styles.stepBtn} onClick={() => onChange(-1)} aria-label="Убрать одну позицию">
        −
      </button>
      <span className={styles.stepQty}>{qty}</span>
      <button type="button" className={styles.stepBtn} onClick={() => onChange(1)} aria-label="Добавить одну позицию">
        +
      </button>
    </div>
  )
}

function CheckRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (v: boolean) => void
}) {
  return (
    <label className={styles.checkRow}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={styles.checkBox} aria-hidden="true" />
      <span className={styles.checkLabel}>{label}</span>
    </label>
  )
}

function ShowMore({ visible, total, onClick }: { visible: number; total: number; onClick: () => void }) {
  if (visible >= total) return null
  return (
    <button type="button" className={styles.showMore} onClick={onClick}>
      <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
        <path
          d="M9 1.5C4.8 1.5 1.6 6 1.6 6s3.2 4.5 7.4 4.5S16.4 6 16.4 6 13.2 1.5 9 1.5Z"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <circle cx="9" cy="6" r="2" fill="currentColor" />
      </svg>
      Показать еще
    </button>
  )
}

export default function HolidayBookingClient({ zones, quests, menu }: Props) {
  // ---- top form ----
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [adults, setAdults] = useState('4')
  const [children, setChildren] = useState('12')
  const [birthdayName, setBirthdayName] = useState('')
  const [birthdayAge, setBirthdayAge] = useState('')
  const [comment, setComment] = useState('')
  const [showNotice, setShowNotice] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)

  // ---- section 1: tables ----
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set())

  // ---- section 2: quests ----
  const [questBooked, setQuestBooked] = useState(false)
  const [questNone, setQuestNone] = useState(false)
  const [genreFilter, setGenreFilter] = useState('all')
  const [diffFilter, setDiffFilter] = useState('all')
  const [actorsOnly, setActorsOnly] = useState(false)
  const [selectedQuests, setSelectedQuests] = useState<Set<string>>(new Set())
  const [questsVisible, setQuestsVisible] = useState(PAGE_SIZE)

  // ---- section 3: cakes ----
  const [cakeNone, setCakeNone] = useState(false)
  const [cakeOwn, setCakeOwn] = useState(false)
  const [cakeChoice, setCakeChoice] = useState<Record<string, string>>({})
  const [cakesVisible, setCakesVisible] = useState(PAGE_SIZE)

  // ---- section 3.1: cake decoration ----
  const [cakeDecorNone, setCakeDecorNone] = useState(false)
  const [cakeDecorQty, setCakeDecorQty] = useState<Record<string, number>>({})

  // ---- section 4: shows ----
  const [showNone, setShowNone] = useState(false)
  const [selectedShows, setSelectedShows] = useState<Set<string>>(new Set())
  const [showsVisible, setShowsVisible] = useState(PAGE_SIZE)

  // ---- section 5: decorations ----
  const [decorNone, setDecorNone] = useState(false)
  const [decorQty, setDecorQty] = useState<Record<string, number>>({})
  const [decorsVisible, setDecorsVisible] = useState(PAGE_SIZE)

  // ---- section 6: menu ----
  const [menuQty, setMenuQty] = useState<Record<string, number>>({})
  const [activeFoodCat, setActiveFoodCat] = useState('')

  const cakes = useMemo(() => byCategory(menu, CAKE_CATEGORIES), [menu])
  const cakeGroups = useMemo(() => groupCakes(cakes), [cakes])
  const cakeDecors = useMemo(() => byCategory(menu, CAKE_DECOR_CATEGORIES), [menu])
  const shows = useMemo(() => byCategory(menu, SHOW_CATEGORIES), [menu])
  const decors = useMemo(() => byCategory(menu, DECOR_CATEGORIES), [menu])
  const foods = useMemo(() => byCategory(menu, FOOD_CATEGORIES), [menu])
  const ownCakeFee = useMemo(
    () => menu.find((i) => i.category === 'Дополнительно Торты' && /свой торт/i.test(i.name)) ?? null,
    [menu],
  )
  const foodCategories = useMemo(
    () => FOOD_CATEGORIES.filter((c) => foods.some((i) => i.category === c)),
    [foods],
  )
  const currentFoodCat = foodCategories.includes(activeFoodCat) ? activeFoodCat : (foodCategories[0] ?? '')

  const genres = useMemo(() => Array.from(new Set(quests.map((q) => q.genre))), [quests])
  const difficulties = useMemo(
    () => Array.from(new Set(quests.map((q) => q.difficulty).filter((d): d is string => Boolean(d)))),
    [quests],
  )

  const filteredQuests = useMemo(
    () =>
      quests.filter(
        (q) =>
          (genreFilter === 'all' || q.genre === genreFilter) &&
          (diffFilter === 'all' || q.difficulty === diffFilter) &&
          (!actorsOnly || q.hasActors),
      ),
    [quests, genreFilter, diffFilter, actorsOnly],
  )

  const toggleInSet = (setter: (v: Set<string>) => void, current: Set<string>, id: string) => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setter(next)
  }

  const changeQty =
    (setter: React.Dispatch<React.SetStateAction<Record<string, number>>>) =>
    (id: string, delta: number) => {
    setter((prev) => {
      const next = Math.max(0, (prev[id] || 0) + delta)
      const copy = { ...prev }
      if (next === 0) delete copy[id]
      else copy[id] = next
      return copy
    })
  }
  const changeCakeDecorQty = changeQty(setCakeDecorQty)
  const changeDecorQty = changeQty(setDecorQty)
  const changeMenuQty = changeQty(setMenuQty)

  // ---- totals ----
  interface Line {
    label: string
    qty: number
    price: number
  }
  const lines: Line[] = []
  selectedTables.forEach((id) => {
    const t = zones.flatMap((z) => z.tables).find((x) => x.id === id)
    if (t) lines.push({ label: `Стол: ${t.title}`, qty: 1, price: 0 })
  })
  selectedQuests.forEach((id) => {
    const q = quests.find((x) => x.id === id)
    if (q) lines.push({ label: `Квест: ${q.name}`, qty: 1, price: 0 })
  })
  Object.values(cakeChoice).forEach((variantId) => {
    const item = cakes.find((c) => c.id === variantId)
    if (item) lines.push({ label: `Торт: ${item.name}`, qty: 1, price: item.price ?? 0 })
  })
  cakeDecors.forEach((item) => {
    const qty = cakeDecorQty[item.id] || 0
    if (qty > 0) lines.push({ label: item.name, qty, price: item.price ?? 0 })
  })
  if (cakeOwn && ownCakeFee) lines.push({ label: ownCakeFee.name, qty: 1, price: ownCakeFee.price ?? 0 })
  selectedShows.forEach((id) => {
    const s = shows.find((x) => x.id === id)
    if (s) lines.push({ label: s.name, qty: 1, price: s.price ?? 0 })
  })
  decors.forEach((item) => {
    const qty = decorQty[item.id] || 0
    if (qty > 0) lines.push({ label: item.name, qty, price: item.price ?? 0 })
  })
  foods.forEach((item) => {
    const qty = menuQty[item.id] || 0
    if (qty > 0) lines.push({ label: item.name, qty, price: item.price ?? 0 })
  })

  const total = lines.reduce((sum, l) => sum + l.qty * l.price, 0)
  const positionsCount = lines.reduce((sum, l) => sum + l.qty, 0)

  // ---- food meter ----
  const guests = Math.max(1, (parseInt(adults, 10) || 0) + (parseInt(children, 10) || 0))
  const foodPortions = lines
    .filter((l) => foods.some((f) => f.name === l.label))
    .reduce((sum, l) => sum + l.qty, 0)
  const portionsPerGuest = foodPortions / guests
  const foodLevel = portionsPerGuest < 0.7 ? 0 : portionsPerGuest <= 1.3 ? 1 : 2
  const FOOD_LEVELS = ['Маловато еды', 'Впритык', 'Наесться от души']
  const meterFill = Math.min(100, Math.round((portionsPerGuest / 2.2) * 100))

  const tablesCount = zones.reduce((sum, z) => sum + z.tables.length, 0)

  return (
    <main className={styles.page}>
      {/* ==================== HERO + TOP FORM ==================== */}
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <a href="/" className={styles.crumb}>
            Главная страница
          </a>
          <h1 className={styles.heroTitle}>
            <span className={styles.heroTitleAccent}>Забронируйте мероприятие</span>
            <span className={styles.heroTitlePlain}>в Pandoroom прямо сейчас</span>
          </h1>

          <div className={styles.heroGrid}>
            <div className={styles.heroForm}>
              <h2 className={styles.formTitle}>Общая информация</h2>
              <div className={styles.formRow}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Ваше имя</span>
                  <input
                    className={styles.input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Елена Петровна"
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Телефон</span>
                  <input
                    className={styles.input}
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 984 123 54 68"
                  />
                </label>
              </div>
              <div className={styles.formRow}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Дата праздника</span>
                  <input
                    className={styles.input}
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Время</span>
                  <input
                    className={styles.input}
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Взрослых</span>
                  <input
                    className={styles.input}
                    type="number"
                    min={0}
                    max={60}
                    value={adults}
                    onChange={(e) => setAdults(e.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Детей</span>
                  <input
                    className={styles.input}
                    type="number"
                    min={0}
                    max={60}
                    value={children}
                    onChange={(e) => setChildren(e.target.value)}
                  />
                </label>
              </div>
              <div className={styles.formRow}>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span className={styles.fieldLabel}>Имя именинника</span>
                  <input
                    className={styles.input}
                    value={birthdayName}
                    onChange={(e) => setBirthdayName(e.target.value)}
                    placeholder="Константин"
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Возраст</span>
                  <input
                    className={styles.input}
                    type="number"
                    min={0}
                    max={99}
                    value={birthdayAge}
                    onChange={(e) => setBirthdayAge(e.target.value)}
                  />
                </label>
              </div>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Комментарий</span>
                <textarea
                  className={`${styles.input} ${styles.textarea}`}
                  placeholder="Повод, пожелания, аллергии…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </label>
            </div>

            <div className={styles.heroSide}>
              <p className={styles.heroNote}>
                Бронирование мероприятия осуществляется только лицами старше 18 лет
              </p>
              <button type="button" className={styles.submitBtn} onClick={() => setShowNotice(true)}>
                Забронировать
              </button>
              <p className={styles.heroNote}>
                Бронирование праздника осуществляется поэтапно. Без заполнения предыдущего этапа
                невозможно перейти к следующему.
              </p>
              <div className={styles.orderCard}>
                <div className={styles.orderTotalRow}>
                  <span className={styles.orderTotalLabel}>Ваш заказ:</span>
                  <span className={styles.orderTotalValue}>{formatPrice(total)}</span>
                </div>
                <button
                  type="button"
                  className={styles.orderLink}
                  onClick={() => setShowBreakdown((v) => !v)}
                >
                  {showBreakdown ? 'Скрыть детализированный счет' : 'Посмотреть детализированный счет'}
                </button>
                {showBreakdown && (
                  <ul className={styles.breakdown}>
                    {lines.length === 0 && <li>Пока ничего не выбрано</li>}
                    {lines.map((l, i) => (
                      <li key={`${l.label}-${i}`}>
                        <span>
                          {l.label}
                          {l.qty > 1 ? ` × ${l.qty}` : ''}
                        </span>
                        <span>{l.price > 0 ? formatPrice(l.price * l.qty) : '—'}</span>
                      </li>
                    ))}
                    {positionsCount > 0 && (
                      <li className={styles.breakdownTotal}>
                        <span>Позиций: {positionsCount}</span>
                        <span>{formatPrice(total)}</span>
                      </li>
                    )}
                  </ul>
                )}
              </div>
              {showNotice && (
                <div className={styles.notice}>
                  Онлайн-бронирование скоро заработает! Пока оставьте заявку по телефону{' '}
                  <a href="tel:+74232022696" className={styles.noticeLink}>
                    8 (423) 202-26-96
                  </a>{' '}
                  — мы всё соберём за вас.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 1. TABLES ==================== */}
      {tablesCount > 0 && (
        <section className={styles.panel} id="tables">
          <div className="container">
            <h2 className={styles.sectionTitle}>1. Выберите стол</h2>
            <div className={styles.tableGrid}>
              {zones.flatMap((zone) =>
                zone.tables.map((table) => {
                  const active = selectedTables.has(table.id)
                  return (
                    <article
                      key={table.id}
                      className={`${styles.tableCard} ${active ? styles.cardActive : ''}`}
                    >
                      <div className={styles.tablePhoto}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={table.imageUrl || '/images/table-placeholder.jpg'}
                          alt={table.imageAlt || table.title}
                          className={styles.tablePhotoImg}
                          loading="lazy"
                        />
                      </div>
                      <div className={styles.tableHead}>
                        <span className={styles.tableZone}>{ZONE_LABELS[zone.key] || zone.name}</span>
                        <span className={styles.tableName}>{table.title}</span>
                      </div>
                      <div className={styles.tableFeatures}>
                        {table.capacity ? <span>до {table.capacity} человек</span> : null}
                        <span>Праздничная сервировка</span>
                      </div>
                      <div className={styles.tableActions}>
                        <button
                          type="button"
                          className={`${styles.pillBtn} ${active ? styles.pillBtnOn : ''}`}
                          onClick={() => toggleInSet(setSelectedTables, selectedTables, table.id)}
                        >
                          {active ? '✓ Стол выбран' : 'Выбрать этот стол'}
                        </button>
                      </div>
                    </article>
                  )
                }),
              )}
            </div>
          </div>
        </section>
      )}

      {/* ==================== 2. QUESTS ==================== */}
      {quests.length > 0 && (
        <section className={styles.section} id="quests">
          <div className="container">
            <h2 className={styles.sectionTitle}>2. Выберите квест</h2>
            <div className={styles.switchRow}>
              <button
                type="button"
                className={`${styles.switch} ${questBooked ? styles.switchOn : ''}`}
                onClick={() => {
                  setQuestBooked((v) => !v)
                  setQuestNone(false)
                  if (!questBooked) setSelectedQuests(new Set())
                }}
                aria-pressed={questBooked}
              >
                <span className={styles.switchKnob} />
                Квест уже забронирован
              </button>
              <CheckRow
                checked={questNone}
                label="Мой праздник без квеста"
                onChange={(v) => {
                  setQuestNone(v)
                  if (v) {
                    setQuestBooked(false)
                    setSelectedQuests(new Set())
                  }
                }}
              />
            </div>

            {!questBooked && !questNone && (
              <>
                <div className={styles.filterRow}>
                  <button
                    type="button"
                    className={`${styles.filterPill} ${genreFilter === 'all' ? styles.filterPillOn : ''}`}
                    onClick={() => setGenreFilter('all')}
                  >
                    Все жанры
                  </button>
                  {genres.map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`${styles.filterPill} ${genreFilter === g ? styles.filterPillOn : ''}`}
                      onClick={() => setGenreFilter(genreFilter === g ? 'all' : g)}
                    >
                      {g}
                    </button>
                  ))}
                  <CheckRow checked={actorsOnly} label="Квесты с актерами" onChange={setActorsOnly} />
                </div>
                <div className={styles.filterRow}>
                  <button
                    type="button"
                    className={`${styles.filterPill} ${diffFilter === 'all' ? styles.filterPillOn : ''}`}
                    onClick={() => setDiffFilter('all')}
                  >
                    Любая сложность
                  </button>
                  {difficulties.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`${styles.filterPill} ${diffFilter === d ? styles.filterPillOn : ''}`}
                      onClick={() => setDiffFilter(diffFilter === d ? 'all' : d)}
                    >
                      {d === 'Легкий'
                        ? 'Легкие'
                        : d === 'Средний'
                          ? 'Средние'
                          : d === 'Сложный'
                            ? 'Сложные'
                            : d}
                      <DifficultyDots level={DIFFICULTY_DOTS[d] ?? 1} />
                    </button>
                  ))}
                </div>

                <div className={styles.questGrid}>
                  {filteredQuests.slice(0, questsVisible).map((quest) => {
                    const active = selectedQuests.has(quest.id)
                    return (
                      <button
                        key={quest.id}
                        type="button"
                        className={`${styles.questCard} ${active ? styles.cardActive : ''}`}
                        onClick={() => toggleInSet(setSelectedQuests, selectedQuests, quest.id)}
                      >
                        <span className={styles.questPoster}>
                          {quest.previewImage?.url ? (
                            <Image
                              src={quest.previewImage.url}
                              alt={quest.name}
                              fill
                              sizes="300px"
                              className={styles.posterImg}
                            />
                          ) : (
                            <span className={styles.imgStub} />
                          )}
                          <span className={styles.genreBadge}>{quest.genre.toLowerCase()}</span>
                          {active && <span className={styles.pickedBadge}>✓ в заказе</span>}
                        </span>
                        <span className={styles.questBody}>
                          <span className={styles.questName}>{quest.name}</span>
                          <span className={styles.questMeta}>
                            <DifficultyDots level={DIFFICULTY_DOTS[quest.difficulty ?? ''] ?? 0} />
                            <span>{quest.durationMinutes} минут</span>
                            <span>
                              {quest.minPlayers}–{quest.maxPlayers} игроков
                            </span>
                            {quest.ageRestriction ? <span>{quest.ageRestriction}</span> : null}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
                <ShowMore
                  visible={questsVisible}
                  total={filteredQuests.length}
                  onClick={() => setQuestsVisible((v) => v + PAGE_SIZE)}
                />
              </>
            )}
            {questBooked && (
              <p className={styles.sectionNote}>
                Отлично! Покажите бронь квеста администратору в день праздника — остальное соберём
                ниже.
              </p>
            )}
            {questNone && (
              <p className={styles.sectionNote}>Праздник без квеста — тоже праздник. Выбирайте стол и меню.</p>
            )}
          </div>
        </section>
      )}

      {/* ==================== 3. CAKES ==================== */}
      {cakeGroups.length > 0 && (
        <section className={styles.panel} id="cakes">
          <div className="container">
            <h2 className={styles.sectionTitle}>3. Выберите торт</h2>
            <div className={styles.switchRow}>
              <CheckRow
                checked={cakeNone}
                label="Праздник без торта"
                onChange={(v) => {
                  setCakeNone(v)
                  if (v) {
                    setCakeOwn(false)
                    setCakeChoice({})
                  }
                }}
              />
              <CheckRow
                checked={cakeOwn}
                label="Будет свой торт"
                onChange={(v) => {
                  setCakeOwn(v)
                  if (v) {
                    setCakeNone(false)
                    setCakeChoice({})
                  }
                }}
              />
            </div>

            {!cakeNone && !cakeOwn && (
              <>
                <div className={styles.cakeGrid}>
                  {cakeGroups.slice(0, cakesVisible).map((group) => {
                    const chosen = cakeChoice[group.key]
                    return (
                      <article key={group.key} className={styles.cakeCard}>
                        <div className={styles.cakePhoto}>
                          <CoverImg src={group.imageUrl} alt={group.name} />
                        </div>
                        <h3 className={styles.cardTitle}>{group.name}</h3>
                        <div className={styles.variantGrid}>
                          {group.variants.map((variant) => {
                            const active = chosen === variant.id
                            return (
                              <button
                                key={variant.id}
                                type="button"
                                className={`${styles.variantChip} ${active ? styles.variantChipOn : ''}`}
                                onClick={() =>
                                  setCakeChoice((prev) => {
                                    const copy = { ...prev }
                                    if (active) delete copy[group.key]
                                    else copy[group.key] = variant.id
                                    return copy
                                  })
                                }
                              >
                                {weightLabel(variant)} — {formatPrice(variant.price)}
                                {active && <span className={styles.variantX}>×</span>}
                              </button>
                            )
                          })}
                        </div>
                      </article>
                    )
                  })}
                </div>
                <ShowMore
                  visible={cakesVisible}
                  total={cakeGroups.length}
                  onClick={() => setCakesVisible((v) => v + PAGE_SIZE)}
                />
              </>
            )}
            {cakeOwn && ownCakeFee && (
              <p className={styles.sectionNote}>
                Свой торт — ок! Мы добавим к заказу «{ownCakeFee.name}» ({formatPrice(ownCakeFee.price)}):
                охладим и подадим к столу.
              </p>
            )}
            {cakeNone && <p className={styles.sectionNote}>Без торта — значит без торта. Дальше можно выбрать шоу и меню.</p>}

            {/* ---- 3.1 cake decoration ---- */}
            {cakeDecors.length > 0 && !cakeNone && (
              <>
                <h2 className={styles.subTitle}>3.1 Выберите оформление торта</h2>
                <div className={styles.switchRow}>
                  <CheckRow checked={cakeDecorNone} label="Торт без оформления" onChange={setCakeDecorNone} />
                </div>
                {!cakeDecorNone && (
                  <div className={styles.decorGrid}>
                    {cakeDecors.map((item) => (
                      <article key={item.id} className={styles.tallCard}>
                        <div className={styles.tallPhoto}>
                          <CoverImg src={item.imageUrl} alt={item.name} />
                        </div>
                        <h3 className={styles.cardTitle}>{item.name}</h3>
                        <div className={styles.priceRow}>
                          <Stepper qty={cakeDecorQty[item.id] || 0} onChange={(d) => changeCakeDecorQty(item.id, d)} />
                          <b className={styles.price}>{formatPrice(item.price)}</b>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* ==================== 4. SHOWS ==================== */}
      {shows.length > 0 && (
        <section className={styles.section} id="shows">
          <div className="container">
            <h2 className={styles.sectionTitle}>4. Выберите шоу-программу</h2>
            <div className={styles.switchRow}>
              <CheckRow
                checked={showNone}
                label="Шоу-программа не нужна"
                onChange={(v) => {
                  setShowNone(v)
                  if (v) setSelectedShows(new Set())
                }}
              />
            </div>
            {!showNone && (
              <>
                <div className={styles.showGrid}>
                  {shows.slice(0, showsVisible).map((show) => {
                    const active = selectedShows.has(show.id)
                    return (
                      <article key={show.id} className={`${styles.tallCard} ${active ? styles.cardActive : ''}`}>
                        <div className={styles.tallPhoto}>
                          <CoverImg src={show.imageUrl} alt={show.name} />
                        </div>
                        <h3 className={styles.cardTitle}>{show.name}</h3>
                        <div className={styles.priceRow}>
                          <button
                            type="button"
                            className={`${styles.pillBtn} ${active ? styles.pillBtnOn : ''}`}
                            onClick={() => toggleInSet(setSelectedShows, selectedShows, show.id)}
                          >
                            {active ? '✓ В заказе' : 'Заказать'}
                          </button>
                          <b className={styles.price}>{formatPrice(show.price)}</b>
                        </div>
                      </article>
                    )
                  })}
                </div>
                <ShowMore
                  visible={showsVisible}
                  total={shows.length}
                  onClick={() => setShowsVisible((v) => v + PAGE_SIZE)}
                />
              </>
            )}
          </div>
        </section>
      )}

      {/* ==================== 5. DECORATIONS ==================== */}
      {decors.length > 0 && (
        <section className={styles.panel} id="decors">
          <div className="container">
            <h2 className={styles.sectionTitle}>5. Выберите украшения для праздника</h2>
            <div className={styles.switchRow}>
              <CheckRow
                checked={decorNone}
                label="Праздник без украшений"
                onChange={(v) => {
                  setDecorNone(v)
                  if (v) setDecorQty({})
                }}
              />
            </div>
            {!decorNone && (
              <>
                <div className={styles.showGrid}>
                  {decors.slice(0, decorsVisible).map((item) => (
                    <article key={item.id} className={styles.tallCard}>
                      <div className={styles.tallPhoto}>
                        <CoverImg src={item.imageUrl} alt={item.name} />
                      </div>
                      <h3 className={styles.cardTitle}>{item.name}</h3>
                      <div className={styles.priceRow}>
                        <Stepper qty={decorQty[item.id] || 0} onChange={(d) => changeDecorQty(item.id, d)} />
                        <b className={styles.price}>{formatPrice(item.price)}</b>
                      </div>
                    </article>
                  ))}
                </div>
                <ShowMore
                  visible={decorsVisible}
                  total={decors.length}
                  onClick={() => setDecorsVisible((v) => v + PAGE_SIZE)}
                />
              </>
            )}
          </div>
        </section>
      )}

      {/* ==================== 6. MENU ==================== */}
      {foods.length > 0 && (
        <section className={styles.section} id="menu">
          <div className="container">
            <div className={styles.menuLayout}>
              <div className={styles.menuLeft}>
                <h2 className={styles.sectionTitle}>6. Выберите меню для праздника</h2>
                <div className={styles.menuCats}>
                  {foodCategories.map((cat) => {
                    const count = foods.filter((i) => i.category === cat).length
                    return (
                      <button
                        key={cat}
                        type="button"
                        className={`${styles.filterPill} ${currentFoodCat === cat ? styles.filterPillOn : ''}`}
                        onClick={() => setActiveFoodCat(cat)}
                      >
                        {cat}
                        <span className={styles.pillCount}>— {count}</span>
                      </button>
                    )
                  })}
                </div>
                <div className={styles.menuGrid}>
                  {foods
                    .filter((item) => item.category === currentFoodCat)
                    .map((item) => {
                      const qty = menuQty[item.id] || 0
                      return (
                        <article key={item.id} className={styles.dishCard}>
                          <div className={styles.dishPhoto}>
                            <CoverImg src={item.imageUrl} alt={item.name} />
                            {item.weight && <span className={styles.weightChip}>{formatWeight(item.weight)}</span>}
                            {item.description && <span className={styles.dishTip}>{item.description}</span>}
                          </div>
                          <h3 className={styles.cardTitle}>{item.name}</h3>
                          <div className={styles.priceRow}>
                            <Stepper qty={qty} onChange={(d) => changeMenuQty(item.id, d)} />
                            <b className={styles.price}>{formatPrice(item.price)}</b>
                          </div>
                        </article>
                      )
                    })}
                </div>

                <div className={styles.meterLabels}>
                  {FOOD_LEVELS.map((label, i) => (
                    <span key={label} className={i === foodLevel ? styles.meterLabelOn : ''}>
                      {label}
                    </span>
                  ))}
                </div>
                <div className={styles.meterTrack}>
                  <div className={styles.meterFill} style={{ width: `${meterFill}%` }} />
                </div>
                {foodLevel < 2 && (
                  <div className={styles.foodHint}>
                    Добавьте еще пару{' '}
                    <button
                      type="button"
                      className={styles.foodHintLink}
                      onClick={() => setActiveFoodCat(foodCategories[0] ?? '')}
                    >
                      горячих блюд
                    </button>
                    , чтобы еды было «впритык»
                  </div>
                )}
              </div>

              <aside className={styles.setsPanel}>
                <h3 className={styles.setsTitle}>Готовые наборы меню для праздника</h3>
                <p className={styles.setsText}>
                  Вы можете выбрать праздничный стол из наших готовых наборов еды для праздника,
                  если не хотите составлять меню самостоятельно. Мы организовали сотни праздников и
                  составили оптимальные меню.
                </p>
                <div className={styles.setsChips}>
                  {FOOD_LEVELS.map((label) => (
                    <span key={label} className={styles.setChip}>
                      {label}
                    </span>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
