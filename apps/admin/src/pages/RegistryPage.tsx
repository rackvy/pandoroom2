import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranchSelection } from '../hooks/useBranchSelection';
import {
  BOOKING_STATUSES,
  BOOKING_TYPE_LABELS,
  BOOKING_TYPES,
  bookingApiError,
  getBookings,
  type BookingListRow,
} from '../api/bookings';
import { toast } from '../components/ui/Toast';
import api from '../lib/axios';
import styles from './RegistryPage.module.css';

interface FilterState {
  text: string;
  iikoOrderId: string;
  type: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  minDeposit: string;
  maxDeposit: string;
  hasCake: boolean | null;
  hasDecoration: boolean | null;
  hasFood: boolean | null;
  hasExtra: boolean | null;
}

const EMPTY_FILTERS: FilterState = {
  text: '',
  iikoOrderId: '',
  type: '',
  status: '',
  dateFrom: '',
  dateTo: '',
  minDeposit: '',
  maxDeposit: '',
  hasCake: null,
  hasDecoration: null,
  hasFood: null,
  hasExtra: null,
};

const digits = (value: string) => value.replace(/\D/g, '');

/** Колонки @db.Time приходят как ISO в UTC — берём часы и минуты без разбора часового пояса. */
function hhmm(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(11, 16);
}

function ruDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

function dayOfWeek(isoDate: string): string {
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00Z`);
  return date.toLocaleDateString('ru-RU', { weekday: 'long', timeZone: 'UTC' });
}

/** Сумма позиций: торт + декор (за штуку) + кухня (за порцию) + доп. развлечения. */
function itemsTotal(booking: BookingListRow): number {
  const cakes = booking.bookingCakes.reduce((sum, item) => sum + item.priceRub, 0);
  const decorations = booking.decorationItems.reduce((sum, item) => sum + item.priceRub * item.qty, 0);
  const food = booking.foodItems.reduce((sum, item) => sum + item.priceRub * item.qty, 0);
  const extras = booking.extraSlots.reduce((sum, item) => sum + item.priceRub, 0);
  return cakes + decorations + food + extras;
}

/** Одна строка реестра: подтверждённая занятость, а если её нет — то, что запрошено в заявке. */
function rowView(booking: BookingListRow) {
  const tables = booking.tableReservations.length
    ? booking.tableReservations.map((res) => ({
        zone: res.table?.zone?.name ?? '',
        table: res.table?.title ?? '',
        time: `${hhmm(res.startTime)} — ${hhmm(res.endTime)}`,
      }))
    : booking.tableSlots.map((slot) => ({
        zone: '',
        table: slot.title,
        time: `${hhmm(slot.startTime)} — ${hhmm(slot.endTime)}`,
      }));

  const quests = booking.questReservations.length
    ? booking.questReservations.map((res) => ({
        name: res.quest?.name ?? '',
        time: hhmm(res.startTime),
      }))
    : booking.questSlots.map((slot) => ({ name: slot.title, time: hhmm(slot.startTime) }));

  const vr = booking.vrReservations.map((res) => ({
    name: res.hall?.name ?? '',
    time: `${hhmm(res.startTime)} — ${hhmm(res.endTime)}`,
  }));

  const times = [...tables.map((t) => t.time), ...quests.map((q) => q.time), ...vr.map((v) => v.time)];

  return {
    zoneNames: [...new Set(tables.map((t) => t.zone).filter(Boolean))].join(', '),
    tableNames: tables.map((t) => t.table).filter(Boolean).join(', '),
    timeRange: times.filter(Boolean).join(', '),
    questNames: quests.map((q) => `${q.name} ${q.time}`.trim()).filter(Boolean).join(', '),
    vrNames: vr.map((v) => `${v.name} ${v.time}`.trim()).join(', '),
  };
}

export default function RegistryPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingListRow[]>([]);
  const { branches, branchId: selectedBranch, setBranchId: setSelectedBranch } = useBranchSelection();
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const [serverFilters, setServerFilters] = useState({ type: '', dateFrom: '', dateTo: '' });
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  useEffect(() => {
    if (!selectedBranch) return;
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, serverFilters]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await getBookings({
        branchId: selectedBranch,
        dateFrom: serverFilters.dateFrom || undefined,
        dateTo: serverFilters.dateTo || undefined,
        type: serverFilters.type || undefined,
      });
      setBookings(data);
    } catch (error) {
      toast.error(bookingApiError(error, 'Не удалось загрузить реестр'));
    } finally {
      setLoading(false);
    }
  };

  // Живой фильтр по строкам, которые сервер не отдаёт по параметру.
  const visibleBookings = useMemo(() => {
    const query = filters.text.trim().toLowerCase();
    const phoneQuery = digits(filters.text);
    const minDeposit = filters.minDeposit ? Number(filters.minDeposit) : null;
    const maxDeposit = filters.maxDeposit ? Number(filters.maxDeposit) : null;

    return bookings.filter((booking) => {
      if (query) {
        const haystack = [booking.clientName, booking.birthdayPersonName ?? '']
          .join(' ')
          .toLowerCase();
        const phoneMatches = phoneQuery.length >= 3 && digits(booking.clientPhone).includes(phoneQuery);
        if (!haystack.includes(query) && !phoneMatches) return false;
      }
      if (filters.iikoOrderId && !(booking.iikoOrderId ?? '').includes(filters.iikoOrderId.trim())) {
        return false;
      }
      if (filters.status && booking.status !== filters.status) return false;
      if (minDeposit !== null && booking.depositRub < minDeposit) return false;
      if (maxDeposit !== null && booking.depositRub > maxDeposit) return false;
      if (filters.hasCake !== null && (booking.bookingCakes.length > 0) !== filters.hasCake) return false;
      if (filters.hasDecoration !== null && (booking.decorationItems.length > 0) !== filters.hasDecoration) return false;
      if (filters.hasFood !== null && (booking.foodItems.length > 0) !== filters.hasFood) return false;
      if (filters.hasExtra !== null && (booking.extraSlots.length > 0) !== filters.hasExtra) return false;
      return true;
    });
  }, [bookings, filters]);

  const activeFilters = useMemo(() => {
    const tags: { key: keyof FilterState; label: string }[] = [];
    if (filters.text) tags.push({ key: 'text', label: `Клиент: ${filters.text}` });
    if (filters.iikoOrderId) tags.push({ key: 'iikoOrderId', label: `Чек: ${filters.iikoOrderId}` });
    if (filters.status) tags.push({ key: 'status', label: BOOKING_STATUSES[filters.status] });
    if (filters.minDeposit || filters.maxDeposit) {
      tags.push({ key: 'minDeposit', label: `Предоплата: ${filters.minDeposit || '0'}–${filters.maxDeposit || '∞'}` });
    }
    if (filters.hasCake !== null) tags.push({ key: 'hasCake', label: filters.hasCake ? 'Торт: Да' : 'Торт: Нет' });
    if (filters.hasDecoration !== null) {
      tags.push({ key: 'hasDecoration', label: filters.hasDecoration ? 'Украш: Да' : 'Украш: Нет' });
    }
    if (filters.hasFood !== null) tags.push({ key: 'hasFood', label: filters.hasFood ? 'Еда: Да' : 'Еда: Нет' });
    if (filters.hasExtra !== null) tags.push({ key: 'hasExtra', label: filters.hasExtra ? 'Доп: Да' : 'Доп: Нет' });
    return tags;
  }, [filters]);

  const handleApplyFilters = () => {
    const next = { type: filters.type, dateFrom: filters.dateFrom, dateTo: filters.dateTo };
    const unchanged =
      next.type === serverFilters.type &&
      next.dateFrom === serverFilters.dateFrom &&
      next.dateTo === serverFilters.dateTo;
    if (unchanged) {
      loadBookings();
      return;
    }
    setServerFilters(next);
  };

  const handleResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setServerFilters({ type: '', dateFrom: '', dateTo: '' });
  };

  const handleRemoveFilter = (key: keyof FilterState) => {
    setFilters((prev) => ({ ...prev, [key]: key.startsWith('has') ? null : '' }));
  };

  const handleStatusChange = async (bookingId: string, status: string) => {
    const previous = bookings;
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status } : b)));
    try {
      await api.patch(`/api/admin/bookings/${bookingId}`, { status });
    } catch (err) {
      toast.error(bookingApiError(err, 'Не удалось изменить статус'));
      setBookings(previous);
    }
  };

  const groupedBookings = useMemo(() => {
    const groups: Record<string, BookingListRow[]> = {};
    visibleBookings.forEach((booking) => {
      const key = booking.eventDate.slice(0, 10);
      (groups[key] ??= []).push(booking);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [visibleBookings]);

  const getDailyTotal = (items: BookingListRow[]) =>
    items.reduce((sum, item) => sum + itemsTotal(item), 0);

  const getDailyDeposit = (items: BookingListRow[]) =>
    items.reduce((sum, item) => sum + item.depositRub, 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Реестр бронирований</h1>
        <div className={styles.headerActions}>
          <div className={styles.branchSelect}>
            <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <button className={styles.newOrderButton} onClick={() => navigate('/registry/new')}>
            + Новый заказ
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className={styles.filtersSection}>
        <div className={styles.filtersToggle} onClick={() => setShowFilters(!showFilters)}>
          <span>Фильтры</span>
          <span className={styles.toggleIcon}>{showFilters ? '▲' : '▼'}</span>
        </div>

        {showFilters && (
          <div className={styles.filtersGrid}>
            <div className={styles.filterGroup}>
              <label>Клиент / телефон / именинник</label>
              <input
                type="text"
                value={filters.text}
                onChange={(e) => setFilters({ ...filters, text: e.target.value })}
                placeholder="Имя или номер"
              />
            </div>

            <div className={styles.filterGroup}>
              <label>Чек из iiko</label>
              <input
                type="text"
                value={filters.iikoOrderId}
                onChange={(e) => setFilters({ ...filters, iikoOrderId: e.target.value })}
                placeholder="0017354"
              />
            </div>

            <div className={styles.filterGroup}>
              <label>Тип брони</label>
              <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                <option value="">Все типы</option>
                {BOOKING_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {BOOKING_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Статус</label>
              <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="">Любой</option>
                {Object.entries(BOOKING_STATUSES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className={`${styles.filterGroup} ${styles.span2}`}>
              <label>Даты</label>
              <div className={styles.rangeInputs}>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>
            </div>

            <div className={`${styles.filterGroup} ${styles.span2}`}>
              <label>Предоплата</label>
              <div className={styles.rangeInputs}>
                <input
                  type="number"
                  value={filters.minDeposit}
                  onChange={(e) => setFilters({ ...filters, minDeposit: e.target.value })}
                  placeholder="от"
                />
                <input
                  type="number"
                  value={filters.maxDeposit}
                  onChange={(e) => setFilters({ ...filters, maxDeposit: e.target.value })}
                  placeholder="до"
                />
              </div>
            </div>

            <div className={styles.filterRow}>
              <div className={styles.toggleGroup}>
                <span>Торт</span>
                <div className={styles.toggleButtons}>
                  <button
                    className={`${styles.toggleBtn} ${filters.hasCake === true ? styles.active : ''}`}
                    onClick={() => setFilters({ ...filters, hasCake: filters.hasCake === true ? null : true })}
                  >
                    Да {filters.hasCake === true && '×'}
                  </button>
                  <button
                    className={`${styles.toggleBtn} ${filters.hasCake === false ? styles.active : ''}`}
                    onClick={() => setFilters({ ...filters, hasCake: filters.hasCake === false ? null : false })}
                  >
                    Нет {filters.hasCake === false && '×'}
                  </button>
                </div>
              </div>

              <div className={styles.toggleGroup}>
                <span>Предзаказ</span>
                <div className={styles.toggleButtons}>
                  <button
                    className={`${styles.toggleBtn} ${filters.hasFood === true ? styles.active : ''}`}
                    onClick={() => setFilters({ ...filters, hasFood: filters.hasFood === true ? null : true })}
                  >
                    Да {filters.hasFood === true && '×'}
                  </button>
                  <button
                    className={`${styles.toggleBtn} ${filters.hasFood === false ? styles.active : ''}`}
                    onClick={() => setFilters({ ...filters, hasFood: filters.hasFood === false ? null : false })}
                  >
                    Нет {filters.hasFood === false && '×'}
                  </button>
                </div>
              </div>

              <div className={styles.toggleGroup}>
                <span>Украшения</span>
                <div className={styles.toggleButtons}>
                  <button
                    className={`${styles.toggleBtn} ${filters.hasDecoration === true ? styles.active : ''}`}
                    onClick={() =>
                      setFilters({ ...filters, hasDecoration: filters.hasDecoration === true ? null : true })
                    }
                  >
                    Да {filters.hasDecoration === true && '×'}
                  </button>
                  <button
                    className={`${styles.toggleBtn} ${filters.hasDecoration === false ? styles.active : ''}`}
                    onClick={() =>
                      setFilters({ ...filters, hasDecoration: filters.hasDecoration === false ? null : false })
                    }
                  >
                    Нет {filters.hasDecoration === false && '×'}
                  </button>
                </div>
              </div>

              <div className={styles.toggleGroup}>
                <span>Доп. развлечения</span>
                <div className={styles.toggleButtons}>
                  <button
                    className={`${styles.toggleBtn} ${filters.hasExtra === true ? styles.active : ''}`}
                    onClick={() => setFilters({ ...filters, hasExtra: filters.hasExtra === true ? null : true })}
                  >
                    Да {filters.hasExtra === true && '×'}
                  </button>
                  <button
                    className={`${styles.toggleBtn} ${filters.hasExtra === false ? styles.active : ''}`}
                    onClick={() => setFilters({ ...filters, hasExtra: filters.hasExtra === false ? null : false })}
                  >
                    Нет {filters.hasExtra === false && '×'}
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.filterActions}>
              <button className={styles.applyButton} onClick={handleApplyFilters}>
                Применить фильтры
              </button>
              <button className={styles.resetButton} onClick={handleResetFilters}>
                Сбросить
              </button>
            </div>
          </div>
        )}

        {/* Active filter tags */}
        {activeFilters.length > 0 && (
          <div className={styles.filterTags}>
            {activeFilters.map((tag) => (
              <span key={tag.key} className={styles.filterTag}>
                {tag.label}
                <button onClick={() => handleRemoveFilter(tag.key)}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bookings Table */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : (
          <>
            {groupedBookings.map(([date, items]) => (
              <div key={date} className={styles.dateGroup}>
                <table className={styles.bookingsTable}>
                  <thead>
                    <tr>
                      <th>чек из iiko</th>
                      <th>тип</th>
                      <th>дата</th>
                      <th>время</th>
                      <th>позиции, руб.</th>
                      <th>предоплата</th>
                      <th>клиент</th>
                      <th>телефон</th>
                      <th>именинник</th>
                      <th>зал</th>
                      <th>стол</th>
                      <th>квест</th>
                      <th>VR</th>
                      <th>торт</th>
                      <th>предзаказ</th>
                      <th>украш.</th>
                      <th>доп. развлечения</th>
                      <th>статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((booking) => {
                      const view = rowView(booking);
                      return (
                        <tr
                          key={booking.id}
                          className={styles.bookingRow}
                          onClick={() => navigate(`/registry/${booking.id}`)}
                        >
                          <td>{booking.iikoOrderId || '-'}</td>
                          <td>{BOOKING_TYPE_LABELS[booking.type] ?? booking.type}</td>
                          <td>
                            {ruDate(booking.eventDate)}
                            <span className={styles.weekday}> {dayOfWeek(booking.eventDate)}</span>
                          </td>
                          <td>{view.timeRange || '-'}</td>
                          <td>{itemsTotal(booking).toLocaleString()}</td>
                          <td>{booking.depositRub.toLocaleString()}</td>
                          <td>{booking.clientName}</td>
                          <td>{booking.clientPhone}</td>
                          <td>{booking.birthdayPersonName || '-'}</td>
                          <td>{view.zoneNames || '-'}</td>
                          <td>{view.tableNames || '-'}</td>
                          <td>{view.questNames || 'Нет'}</td>
                          <td>{view.vrNames || 'Нет'}</td>
                          <td className={booking.bookingCakes.length ? styles.yesCell : styles.noCell}>
                            {booking.bookingCakes.length ? 'Да' : 'Нет'}
                          </td>
                          <td className={booking.foodItems.length ? styles.yesCell : styles.noCell}>
                            {booking.foodItems.length ? 'Да' : 'Нет'}
                          </td>
                          <td className={booking.decorationItems.length ? styles.yesCell : styles.noCell}>
                            {booking.decorationItems.length ? 'Да' : 'Нет'}
                          </td>
                          <td className={booking.extraSlots.length ? styles.yesCell : styles.noCell}>
                            {booking.extraSlots.length ? 'Да' : 'Нет'}
                          </td>
                          <td>
                            <select
                              className={styles.statusSelect}
                              value={booking.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                            >
                              {Object.entries(BOOKING_STATUSES).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className={styles.totalRow}>
                      <td colSpan={4}>Итого за {ruDate(date)}</td>
                      <td>{getDailyTotal(items).toLocaleString()}</td>
                      <td>{getDailyDeposit(items).toLocaleString()}</td>
                      <td colSpan={12}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}

            {visibleBookings.length === 0 && (
              <div className={styles.emptyState}>Нет бронирований для отображения</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
