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
  CAFE: 'Кафе',
  LOUNGE: 'Лаунж',
  KIDS: 'Детская зона',
}

// iiko categories → page sections
const CAKE_CATEGORIES = ['Торты', 'Дополнительно Торты']
const SHOW_CATEGORIES = ['Шоу-программы']
const DECOR_CATEGORIES = ['Организация']
const PACK_CATEGORIES = ['Атрибутика']
const FOOD_CATEGORIES = ['Кухня', 'Праздничное меню', 'Бар', 'Лимонады']

const DURATION_OPTIONS = ['1 час', '2 часа', '3 часа', '4 часа', '5 часов']

function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return ''
  return `${String(Math.round(price)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`
}

function byCategory(menu: IikoMenuItemPublic[], categories: string[]): IikoMenuItemPublic[] {
  return menu.filter((item) => categories.includes(item.category))
}

export default function HolidayBookingClient({ zones, quests, menu }: Props) {
  // ---- top form state ----
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
  const [selectedPacks, setSelectedPacks] = useState<Set<string>>(new Set())

  // ---- menu quantities ----
  const [menuQty, setMenuQty] = useState<Record<string, number>>({})

  const cakes = useMemo(() => byCategory(menu, CAKE_CATEGORIES), [menu])
  const shows = useMemo(() => byCategory(menu, SHOW_CATEGORIES), [menu])
  const decors = useMemo(() => byCategory(menu, DECOR_CATEGORIES), [menu])
  const packs = useMemo(() => byCategory(menu, PACK_CATEGORIES), [menu])
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
    selectedPacks.size +
    menuItemsCount

  const total =
    sumSet(selectedCakes, cakes) +
    sumSet(selectedShows, shows) +
    sumSet(selectedDecors, decors) +
    sumSet(selectedPacks, packs) +
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
      {/* ==================== TOP FORM ==================== */}
      <section className={styles.topSection}>
        <div className="container">
          <p className={styles.kicker}>онлайн-бронирование</p>
          <h1 className={styles.topTitle}>
            Забронируйте праздник в&nbsp;Pandoroom прямо сейчас
          </h1>
          <p className={styles.topSub}>
            Выберите стол, квест, торт, шоу-программу и&nbsp;меню — мы&nbsp;соберём
            праздник «под ключ» и&nbsp;свяжемся с&nbsp;вами для подтверждения.
          </p>

          <div className={styles.formCard} id="holiday-form">
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Дата праздника</span>
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
              {total > 0 && (
                <div className={styles.totalBox}>
                  <span className={styles.totalLabel}>Предварительно</span>
                  <span className={styles.totalValue}>{formatPrice(total)}</span>
                </div>
              )}
              <button type="button" className={styles.submitBtn} onClick={submitForm}>
                Забронировать
              </button>
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

      {/* ==================== TABLES ==================== */}
      {zones.length > 0 && (
        <section className={styles.section}>
          <div className="container">
            <h2 className={styles.sectionTitle}>Выберите стол</h2>
            {zones.map((zone) => (
              <div key={zone.id} className={styles.zoneBlock}>
                <h3 className={styles.zoneTitle}>{ZONE_LABELS[zone.key] || zone.name}</h3>
                <div className={styles.row}>
                  {zone.tables.map((table) => {
                    const active = selectedTables.has(table.id)
                    return (
                      <button
                        key={table.id}
                        type="button"
                        className={`${styles.card} ${styles.tableCard} ${active ? styles.cardActive : ''}`}
                        onClick={() => toggleInSet(setSelectedTables, selectedTables, table.id)}
                      >
                        <span className={styles.tableIcon}>
                          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 11h16M6 11V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4M5 11l-1 8M19 11l1 8M8 11v4M16 11v4" />
                          </svg>
                        </span>
                        <span className={styles.cardName}>{table.title}</span>
                        {table.capacity ? (
                          <span className={styles.cardMeta}>до {table.capacity} гостей</span>
                        ) : null}
                        <span className={`${styles.pickBtn} ${active ? styles.pickBtnActive : ''}`}>
                          {active ? 'Выбрано' : 'Выбрать стол'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==================== QUESTS ==================== */}
      {quests.length > 0 && (
        <section className={styles.section}>
          <div className="container">
            <h2 className={styles.sectionTitle}>Выберите квест</h2>
            <div className={styles.row}>
              {quests.map((quest) => {
                const active = selectedQuests.has(quest.id)
                return (
                  <button
                    key={quest.id}
                    type="button"
                    className={`${styles.card} ${styles.productCard} ${active ? styles.cardActive : ''}`}
                    onClick={() => toggleInSet(setSelectedQuests, selectedQuests, quest.id)}
                  >
                    <span className={styles.cardImgWrap}>
                      {quest.previewImage?.url ? (
                        <Image
                          src={quest.previewImage.url}
                          alt={quest.name}
                          fill
                          sizes="280px"
                          className={styles.cardImg}
                        />
                      ) : (
                        <span className={styles.cardImgStub} />
                      )}
                    </span>
                    <span className={styles.cardBody}>
                      <span className={styles.cardName}>{quest.name}</span>
                      <span className={styles.cardMeta}>
                        {quest.genre} · {quest.durationMinutes} мин · {quest.minPlayers}–
                        {quest.maxPlayers} чел{quest.ageRestriction ? ` · ${quest.ageRestriction}` : ''}
                      </span>
                      <span className={`${styles.pickBtn} ${active ? styles.pickBtnActive : ''}`}>
                        {active ? 'Выбрано' : 'Выбрать'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ==================== CAKES ==================== */}
      {cakes.length > 0 && (
        <section className={styles.section}>
          <div className="container">
            <h2 className={styles.sectionTitle}>Выберите торт</h2>
            <div className={styles.row}>
              {cakes.map((cake) => {
                const active = selectedCakes.has(cake.id)
                return (
                  <button
                    key={cake.id}
                    type="button"
                    className={`${styles.card} ${styles.productCard} ${active ? styles.cardActive : ''}`}
                    onClick={() => toggleInSet(setSelectedCakes, selectedCakes, cake.id)}
                  >
                    <span className={styles.cardImgWrap}>
                      {cake.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={cake.imageUrl} alt={cake.name} className={styles.cardImg} loading="lazy" />
                      ) : (
                        <span className={styles.cardImgStub} />
                      )}
                    </span>
                    <span className={styles.cardBody}>
                      <span className={styles.cardName}>{cake.name}</span>
                      <span className={styles.cardMeta}>
                        {cake.weight ? `${cake.weight} · ` : ''}
                        <b className={styles.cardPrice}>{formatPrice(cake.price)}</b>
                      </span>
                      <span className={`${styles.pickBtn} ${active ? styles.pickBtnActive : ''}`}>
                        {active ? 'Выбрано' : 'Выбрать'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ==================== SHOW PROGRAMS ==================== */}
      {shows.length > 0 && (
        <section className={styles.section}>
          <div className="container">
            <h2 className={styles.sectionTitle}>Выберите шоу-программу</h2>
            <div className={styles.row}>
              {shows.map((show) => {
                const active = selectedShows.has(show.id)
                return (
                  <button
                    key={show.id}
                    type="button"
                    className={`${styles.card} ${styles.productCard} ${active ? styles.cardActive : ''}`}
                    onClick={() => toggleInSet(setSelectedShows, selectedShows, show.id)}
                  >
                    <span className={styles.cardImgWrap}>
                      {show.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={show.imageUrl} alt={show.name} className={styles.cardImg} loading="lazy" />
                      ) : (
                        <span className={styles.cardImgStub} />
                      )}
                    </span>
                    <span className={styles.cardBody}>
                      <span className={styles.cardName}>{show.name}</span>
                      <span className={styles.cardMeta}>
                        <b className={styles.cardPrice}>{formatPrice(show.price)}</b>
                      </span>
                      <span className={`${styles.pickBtn} ${active ? styles.pickBtnActive : ''}`}>
                        {active ? 'Выбрано' : 'Выбрать'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ==================== DECORATIONS (balloons etc.) ==================== */}
      {decors.length > 0 && (
        <section className={styles.section}>
          <div className="container">
            <h2 className={styles.sectionTitle}>Оформление праздника</h2>
            <div className={styles.row}>
              {decors.map((decor) => {
                const active = selectedDecors.has(decor.id)
                return (
                  <button
                    key={decor.id}
                    type="button"
                    className={`${styles.card} ${styles.productCard} ${active ? styles.cardActive : ''}`}
                    onClick={() => toggleInSet(setSelectedDecors, selectedDecors, decor.id)}
                  >
                    <span className={styles.cardImgWrap}>
                      {decor.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={decor.imageUrl} alt={decor.name} className={styles.cardImg} loading="lazy" />
                      ) : (
                        <span className={styles.cardImgStub} />
                      )}
                    </span>
                    <span className={styles.cardBody}>
                      <span className={styles.cardName}>{decor.name}</span>
                      <span className={styles.cardMeta}>
                        <b className={styles.cardPrice}>{formatPrice(decor.price)}</b>
                      </span>
                      <span className={`${styles.pickBtn} ${active ? styles.pickBtnActive : ''}`}>
                        {active ? 'Выбрано' : 'Выбрать'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ==================== PARTY PACKAGING / ATTRIBUTES ==================== */}
      {packs.length > 0 && (
        <section className={styles.section}>
          <div className="container">
            <h2 className={styles.sectionTitle}>Упаковка для праздника</h2>
            <div className={styles.row}>
              {packs.map((pack) => {
                const active = selectedPacks.has(pack.id)
                return (
                  <button
                    key={pack.id}
                    type="button"
                    className={`${styles.card} ${styles.productCard} ${active ? styles.cardActive : ''}`}
                    onClick={() => toggleInSet(setSelectedPacks, selectedPacks, pack.id)}
                  >
                    <span className={styles.cardImgWrap}>
                      {pack.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={pack.imageUrl} alt={pack.name} className={styles.cardImg} loading="lazy" />
                      ) : (
                        <span className={styles.cardImgStub} />
                      )}
                    </span>
                    <span className={styles.cardBody}>
                      <span className={styles.cardName}>{pack.name}</span>
                      <span className={styles.cardMeta}>
                        <b className={styles.cardPrice}>{formatPrice(pack.price)}</b>
                      </span>
                      <span className={`${styles.pickBtn} ${active ? styles.pickBtnActive : ''}`}>
                        {active ? 'Выбрано' : 'Выбрать'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ==================== MENU ==================== */}
      {foods.length > 0 && (
        <section className={styles.section}>
          <div className="container">
            <h2 className={styles.sectionTitle}>Выберите меню для праздника</h2>
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
