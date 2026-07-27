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

  // ---- single-choice sections ----
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [selectedQuest, setSelectedQuest] = useState<string | null>(null)
  const [selectedCake, setSelectedCake] = useState<string | null>(null)
  const [selectedShow, setSelectedShow] = useState<string | null>(null)
  const [selectedDecor, setSelectedDecor] = useState<string | null>(null)
  const [selectedPack, setSelectedPack] = useState<string | null>(null)

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

  const priceOf = (id: string | null, items: IikoMenuItemPublic[]) => {
    if (!id) return 0
    return items.find((i) => i.id === id)?.price ?? 0
  }

  const total =
    priceOf(selectedCake, cakes) +
    priceOf(selectedShow, shows) +
    priceOf(selectedDecor, decors) +
    priceOf(selectedPack, packs) +
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

  const toggle = (
    current: string | null,
    setter: (v: string | null) => void,
    id: string,
  ) => {
    setter(current === id ? null : id)
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

          <div className={styles.formCard}>
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
                    const active = selectedTable === table.id
                    return (
                      <button
                        key={table.id}
                        type="button"
                        className={`${styles.card} ${styles.tableCard} ${active ? styles.cardActive : ''}`}
                        onClick={() => toggle(selectedTable, setSelectedTable, table.id)}
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
                const active = selectedQuest === quest.id
                return (
                  <button
                    key={quest.id}
                    type="button"
                    className={`${styles.card} ${styles.productCard} ${active ? styles.cardActive : ''}`}
                    onClick={() => toggle(selectedQuest, setSelectedQuest, quest.id)}
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
                const active = selectedCake === cake.id
                return (
                  <button
                    key={cake.id}
                    type="button"
                    className={`${styles.card} ${styles.productCard} ${active ? styles.cardActive : ''}`}
                    onClick={() => toggle(selectedCake, setSelectedCake, cake.id)}
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
                const active = selectedShow === show.id
                return (
                  <button
                    key={show.id}
                    type="button"
                    className={`${styles.card} ${styles.productCard} ${active ? styles.cardActive : ''}`}
                    onClick={() => toggle(selectedShow, setSelectedShow, show.id)}
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
                const active = selectedDecor === decor.id
                return (
                  <button
                    key={decor.id}
                    type="button"
                    className={`${styles.card} ${styles.productCard} ${active ? styles.cardActive : ''}`}
                    onClick={() => toggle(selectedDecor, setSelectedDecor, decor.id)}
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
                const active = selectedPack === pack.id
                return (
                  <button
                    key={pack.id}
                    type="button"
                    className={`${styles.card} ${styles.productCard} ${active ? styles.cardActive : ''}`}
                    onClick={() => toggle(selectedPack, setSelectedPack, pack.id)}
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
    </main>
  )
}
