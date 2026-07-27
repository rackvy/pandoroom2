'use client'

import { ReactNode, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Quest, TableZonePublic, IikoMenuItemPublic } from '@/lib/api'
import styles from './holiday-booking.module.css'

interface Props {
  zones: TableZonePublic[]
  quests: Quest[]
  menu: IikoMenuItemPublic[]
}

const ZONE_LABELS: Record<string, string> = {
  CAFE: 'Кафе',
  LOUNGE: 'Лаунж-зона',
  KIDS: 'Детская зона',
}

const ZONE_IMAGES: Record<string, string> = {
  CAFE: '/images/main/hero2.jpg',
  LOUNGE: '/images/main/hero3.jpg',
  KIDS: '/images/main/5.png',
}

// iiko categories → page sections
const CAKE_CATEGORIES = ['Торты', 'Дополнительно Торты']
const SHOW_CATEGORIES = ['Шоу-программы']
const DECOR_CATEGORIES = ['Организация', 'Атрибутика']
const FOOD_CATEGORIES = ['Кухня', 'Праздничное меню', 'Бар', 'Лимонады']

const DURATION_OPTIONS = ['1 час', '2 часа', '3 часа', '4 часа', '5 часов']

function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return ''
  return `${String(Math.round(price)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`
}

function formatPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('8')) digits = '7' + digits.slice(1)
  if (!digits.startsWith('7')) digits = '7' + digits
  digits = digits.slice(0, 11)

  const d = digits.slice(1)
  let out = '+7'
  if (d.length > 0) out += ' (' + d.slice(0, 3)
  if (d.length >= 3) out += ') ' + d.slice(3, 6)
  if (d.length >= 6) out += '-' + d.slice(6, 8)
  if (d.length >= 8) out += '-' + d.slice(8, 10)
  return out
}

function byCategory(menu: IikoMenuItemPublic[], categories: string[]): IikoMenuItemPublic[] {
  return menu.filter((item) => categories.includes(item.category))
}

/* ---------- small building blocks ---------- */

function SectionTitle({ num, children }: { num: number; children: ReactNode }) {
  return (
    <h2 className={styles.sectionTitle}>
      <span className={styles.sectionNum}>{num}.</span> {children}
    </h2>
  )
}

function CardRow({ children }: { children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const scroll = (dir: number) =>
    trackRef.current?.scrollBy({ left: dir * 580, behavior: 'smooth' })

  return (
    <div className={styles.rowWrap}>
      <button
        type="button"
        className={`${styles.rowArrow} ${styles.rowArrowPrev}`}
        onClick={() => scroll(-1)}
        aria-label="Прокрутить назад"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className={styles.row} ref={trackRef}>
        {children}
      </div>
      <button
        type="button"
        className={`${styles.rowArrow} ${styles.rowArrowNext}`}
        onClick={() => scroll(1)}
        aria-label="Прокрутить вперёд"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}

interface ProductCardProps {
  active: boolean
  onClick: () => void
  image?: string | null
  imageAlt: string
  tag?: string | null
  name: string
  meta?: ReactNode
  price?: number | null
  external?: boolean
}

function ProductCard({ active, onClick, image, imageAlt, tag, name, meta, price, external }: ProductCardProps) {
  return (
    <button
      type="button"
      className={`${styles.card} ${active ? styles.cardActive : ''}`}
      onClick={onClick}
    >
      <span className={styles.cardImgWrap}>
        {image ? (
          external ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={image} alt={imageAlt} className={styles.cardImg} loading="lazy" />
          ) : (
            <Image src={image} alt={imageAlt} fill sizes="280px" className={styles.cardImg} />
          )
        ) : (
          <span className={styles.cardImgStub} />
        )}
        {tag ? <span className={styles.cardTag}>{tag}</span> : null}
      </span>
      <span className={styles.cardBody}>
        <span className={styles.cardName}>{name}</span>
        {meta ? <span className={styles.cardMeta}>{meta}</span> : null}
        <span className={styles.cardFooter}>
          {price !== undefined && price !== null ? (
            <span className={styles.cardPrice}>{formatPrice(price)}</span>
          ) : (
            <span />
          )}
          <span className={`${styles.pickBtn} ${active ? styles.pickBtnActive : ''}`}>
            {active ? 'Выбрано' : 'Выбрать'}
          </span>
        </span>
      </span>
    </button>
  )
}

/* ---------- page ---------- */

export default function HolidayBookingClient({ zones, quests, menu }: Props) {
  // ---- top form state ----
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [guests, setGuests] = useState('10')
  const [duration, setDuration] = useState('2 часа')
  const [comment, setComment] = useState('')
  const [showNotice, setShowNotice] = useState(false)

  // ---- multi-choice sections ----
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set())
  const [selectedQuests, setSelectedQuests] = useState<Set<string>>(new Set())
  const [selectedCakes, setSelectedCakes] = useState<Set<string>>(new Set())
  const [selectedShows, setSelectedShows] = useState<Set<string>>(new Set())
  const [selectedDecors, setSelectedDecors] = useState<Set<string>>(new Set())

  // ---- menu quantities ----
  const [menuQty, setMenuQty] = useState<Record<string, number>>({})

  const cakes = useMemo(() => byCategory(menu, CAKE_CATEGORIES), [menu])
  const shows = useMemo(() => byCategory(menu, SHOW_CATEGORIES), [menu])
  const decors = useMemo(() => byCategory(menu, DECOR_CATEGORIES), [menu])
  const foods = useMemo(() => byCategory(menu, FOOD_CATEGORIES), [menu])
  const foodCategories = useMemo(
    () => FOOD_CATEGORIES.filter((c) => foods.some((i) => i.category === c)),
    [foods],
  )
  const [activeFoodCat, setActiveFoodCat] = useState<string>('Кухня')

  const sumSet = (ids: Set<string>, items: IikoMenuItemPublic[]) => {
    let sum = 0
    ids.forEach((id) => {
      sum += items.find((i) => i.id === id)?.price ?? 0
    })
    return sum
  }

  const menuItemsCount = Object.values(menuQty).reduce((a, b) => a + b, 0)
  const positionsCount =
    selectedTables.size +
    selectedQuests.size +
    selectedCakes.size +
    selectedShows.size +
    selectedDecors.size +
    menuItemsCount

  const total =
    sumSet(selectedCakes, cakes) +
    sumSet(selectedShows, shows) +
    sumSet(selectedDecors, decors) +
    foods.reduce((sum, item) => sum + (menuQty[item.id] || 0) * (item.price ?? 0), 0)

  const changeQty = (id: string, delta: number) => {
    setMenuQty((prev) => {
      const next = Math.max(0, (prev[id] || 0) + delta)
      const copy = { ...prev }
      if (next === 0) delete copy[id]
      else copy[id] = next
      return copy
    })
  }

  const toggleInSet = (setter: (v: Set<string>) => void, current: Set<string>, id: string) => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setter(next)
  }

  const submitForm = () => {
    setShowNotice(true)
  }

  return (
    <main className={styles.page}>
      {/* ==================== HERO + FORM ==================== */}
      <section className={styles.hero}>
        <div className={styles.heroBg}>
          <Image
            src="/images/main/hero1.jpg"
            alt="Детский праздник в Pandoroom"
            fill
            sizes="100vw"
            priority
            className={styles.heroBgImg}
          />
        </div>
        <div className={styles.heroOverlay} />
        <div className={`container ${styles.heroInner}`}>
          <h1 className={styles.heroTitle}>
            Забронируйте мероприятие в&nbsp;Pandoroom прямо сейчас
          </h1>

          <div className={styles.formCard} id="holiday-form">
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Имя</span>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Ваше имя"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Телефон</span>
                <input
                  type="tel"
                  className={styles.input}
                  placeholder="+7 (___) ___-__-__"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Дата</span>
                <input
                  type="date"
                  className={styles.input}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Время</span>
                <input
                  type="time"
                  className={styles.input}
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Гостей</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  className={styles.input}
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Длительность</span>
                <select
                  className={styles.input}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Комментарий</span>
              <textarea
                className={`${styles.input} ${styles.textarea}`}
                placeholder="Повод, возраст именинника, пожелания…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </label>

            <div className={styles.formFooter}>
              <p className={styles.formNote}>
                Бронирование осуществляется только с&nbsp;помощью наших сотрудников
              </p>
              <div className={styles.formActions}>
                <div className={styles.totalBox}>
                  <span className={styles.totalLabel}>Итого</span>
                  <span className={styles.totalValue}>{formatPrice(total)}</span>
                </div>
                <button type="button" className={styles.submitBtn} onClick={submitForm}>
                  Забронировать
                </button>
              </div>
            </div>

            {showNotice && (
              <div className={styles.notice}>
                Онлайн-бронирование скоро заработает! Пока оставьте заявку по&nbsp;телефону{' '}
                <a href="tel:+74232022696" className={styles.noticeLink}>
                  8 (423) 202-26-96
                </a>{' '}
                — мы&nbsp;всё соберём за&nbsp;вас.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ==================== 1. TABLES ==================== */}
      {zones.length > 0 && (
        <section className={styles.section}>
          <div className="container">
            <SectionTitle num={1}>Выберите стол</SectionTitle>
            {zones.map((zone) => (
              <div key={zone.id} className={styles.zoneBlock}>
                <div className={styles.zoneBanner}>
                  <Image
                    src={ZONE_IMAGES[zone.key] || '/images/main/hero2.jpg'}
                    alt={ZONE_LABELS[zone.key] || zone.name}
                    fill
                    sizes="(max-width: 767px) 100vw, 1140px"
                    className={styles.zoneBannerImg}
                  />
                  <span className={styles.zoneBannerLabel}>
                    {ZONE_LABELS[zone.key] || zone.name}
                  </span>
                </div>
                <CardRow>
                  {zone.tables.map((table) => {
                    const active = selectedTables.has(table.id)
                    return (
                      <button
                        key={table.id}
                        type="button"
                        className={`${styles.tableCard} ${active ? styles.cardActive : ''}`}
                        onClick={() => toggleInSet(setSelectedTables, selectedTables, table.id)}
                      >
                        <span className={styles.tableIcon}>
                          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 11h16M6 11V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4M5 11l-1 8M19 11l1 8M8 11v4M16 11v4" />
                          </svg>
                        </span>
                        <span className={styles.tableCardBody}>
                          <span className={styles.cardName}>{table.title}</span>
                          {table.capacity ? (
                            <span className={styles.cardMeta}>до {table.capacity} гостей</span>
                          ) : null}
                        </span>
                        <span className={`${styles.pickBtn} ${styles.pickBtnFull} ${active ? styles.pickBtnActive : ''}`}>
                          {active ? 'Выбрано' : 'Выбрать стол'}
                        </span>
                      </button>
                    )
                  })}
                </CardRow>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==================== 2. QUESTS ==================== */}
      {quests.length > 0 && (
        <section className={styles.section}>
          <div className="container">
            <SectionTitle num={2}>Выберите квест</SectionTitle>
            <CardRow>
              {quests.map((quest) => {
                const active = selectedQuests.has(quest.id)
                return (
                  <ProductCard
                    key={quest.id}
                    active={active}
                    onClick={() => toggleInSet(setSelectedQuests, selectedQuests, quest.id)}
                    image={quest.previewImage?.url}
                    imageAlt={quest.name}
                    tag={quest.ageRestriction || null}
                    name={quest.name}
                    meta={`${quest.genre} · ${quest.durationMinutes} мин · ${quest.minPlayers}–${quest.maxPlayers} чел`}
                  />
                )
              })}
            </CardRow>
          </div>
        </section>
      )}

      {/* ==================== 3. CAKES ==================== */}
      {cakes.length > 0 && (
        <section className={styles.section}>
          <div className="container">
            <SectionTitle num={3}>Выберите торт</SectionTitle>
            <CardRow>
              {cakes.map((cake) => {
                const active = selectedCakes.has(cake.id)
                return (
                  <ProductCard
                    key={cake.id}
                    active={active}
                    onClick={() => toggleInSet(setSelectedCakes, selectedCakes, cake.id)}
                    image={cake.imageUrl}
                    imageAlt={cake.name}
                    name={cake.name}
                    meta={cake.weight || undefined}
                    price={cake.price}
                    external
                  />
                )
              })}
            </CardRow>
          </div>
        </section>
      )}

      {/* ==================== 4. SHOW PROGRAMS ==================== */}
      {shows.length > 0 && (
        <section className={styles.section}>
          <div className="container">
            <SectionTitle num={4}>Выберите шоу-программу</SectionTitle>
            <CardRow>
              {shows.map((show) => {
                const active = selectedShows.has(show.id)
                return (
                  <ProductCard
                    key={show.id}
                    active={active}
                    onClick={() => toggleInSet(setSelectedShows, selectedShows, show.id)}
                    image={show.imageUrl}
                    imageAlt={show.name}
                    name={show.name}
                    price={show.price}
                    external
                  />
                )
              })}
            </CardRow>
          </div>
        </section>
      )}

      {/* ==================== 5. DECORATIONS ==================== */}
      {decors.length > 0 && (
        <section className={styles.section}>
          <div className="container">
            <SectionTitle num={5}>Выберите украшения для праздника</SectionTitle>
            <CardRow>
              {decors.map((decor) => {
                const active = selectedDecors.has(decor.id)
                return (
                  <ProductCard
                    key={decor.id}
                    active={active}
                    onClick={() => toggleInSet(setSelectedDecors, selectedDecors, decor.id)}
                    image={decor.imageUrl}
                    imageAlt={decor.name}
                    name={decor.name}
                    price={decor.price}
                    external
                  />
                )
              })}
            </CardRow>
          </div>
        </section>
      )}

      {/* ==================== 6. MENU ==================== */}
      {foods.length > 0 && (
        <section className={styles.section}>
          <div className="container">
            <SectionTitle num={6}>Выберите меню для праздника</SectionTitle>
            <div className={styles.menuLayout}>
              <div className={styles.menuCats}>
                {foodCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`${styles.menuCat} ${activeFoodCat === cat ? styles.menuCatActive : ''}`}
                    onClick={() => setActiveFoodCat(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className={styles.menuGrid}>
                {foods
                  .filter((item) => item.category === activeFoodCat)
                  .map((item) => {
                    const qty = menuQty[item.id] || 0
                    return (
                      <div key={item.id} className={`${styles.menuItem} ${qty > 0 ? styles.menuItemActive : ''}`}>
                        <span className={styles.menuItemImgWrap}>
                          {item.imageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={item.imageUrl} alt={item.name} className={styles.menuItemImg} loading="lazy" />
                          ) : (
                            <span className={styles.cardImgStub} />
                          )}
                        </span>
                        <span className={styles.menuItemBody}>
                          <span className={styles.menuItemName}>{item.name}</span>
                          <span className={styles.menuItemMeta}>
                            {item.weight ? <span>{item.weight}</span> : null}
                            <b className={styles.cardPrice}>{formatPrice(item.price)}</b>
                          </span>
                        </span>
                        <div className={styles.stepper}>
                          {qty > 0 ? (
                            <>
                              <button
                                type="button"
                                className={styles.stepBtn}
                                onClick={() => changeQty(item.id, -1)}
                                aria-label="Убрать"
                              >
                                −
                              </button>
                              <span className={styles.stepQty}>{qty}</span>
                              <button
                                type="button"
                                className={styles.stepBtn}
                                onClick={() => changeQty(item.id, 1)}
                                aria-label="Добавить"
                              >
                                +
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className={`${styles.stepBtn} ${styles.stepBtnAdd}`}
                              onClick={() => changeQty(item.id, 1)}
                              aria-label="Добавить"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            <div className={styles.menuNote}>
              <h3 className={styles.menuNoteTitle}>Готовые наборы меню для праздника</h3>
              <p className={styles.menuNoteText}>
                Не&nbsp;хотите собирать меню по&nbsp;позициям? Возьмите готовый набор&nbsp;—
                мы&nbsp;всё подготовим к&nbsp;вашему приходу. Состав и&nbsp;стоимость
                подскажем по&nbsp;телефону.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ==================== STICKY TOTALS BAR ==================== */}
      {positionsCount > 0 && (
        <>
          <div className={styles.summarySpacer} />
          <div className={styles.summaryBar}>
            <div className={`container ${styles.summaryInner}`}>
              <div className={styles.summaryInfo}>
                <span className={styles.summaryCount}>
                  {positionsCount}{' '}
                  {positionsCount === 1
                    ? 'позиция'
                    : positionsCount >= 2 && positionsCount <= 4
                      ? 'позиции'
                      : 'позиций'}
                </span>
                <span className={styles.summaryTotal}>
                  Итого: {formatPrice(total)}
                </span>
              </div>
              <button
                type="button"
                className={styles.summaryBtn}
                onClick={() =>
                  document.getElementById('holiday-form')?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                К оформлению
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
