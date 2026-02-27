import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBranches, Branch } from '../api/schedule';
import api from '../lib/axios';
import NewOrderModal from '../components/NewOrderModal';
import styles from './RegistryPage.module.css';

interface BookingListItem {
  id: string;
  iikoOrderId: string | null;
  eventDate: string;
  timeRange: string;
  totalAmount: number;
  depositRub: number;
  clientName: string;
  clientPhone: string;
  birthdayPersonName: string | null;
  zoneName: string;
  tableName: string;
  questName: string | null;
  hasCake: boolean;
  hasDecoration: boolean;
  hasFood: boolean;
  hasExtra: boolean;
  managerName: string | null;
  status: string;
}

interface FilterState {
  clientName: string;
  iikoOrderId: string;
  minAmount: string;
  maxAmount: string;
  minDeposit: string;
  maxDeposit: string;
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
  zones: string[];
  tables: string[];
  quests: string[];
  hasCake: boolean | null;
  hasDecoration: boolean | null;
  hasFood: boolean | null;
  hasExtra: boolean | null;
  managers: string[];
  checkedBy: string[];
  smsSent: boolean | null;
}

export default function RegistryPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    clientName: '',
    iikoOrderId: '',
    minAmount: '',
    maxAmount: '',
    minDeposit: '',
    maxDeposit: '',
    dateFrom: '',
    dateTo: '',
    timeFrom: '',
    timeTo: '',
    zones: [],
    tables: [],
    quests: [],
    hasCake: null,
    hasDecoration: null,
    hasFood: null,
    hasExtra: null,
    managers: [],
    checkedBy: [],
    smsSent: null,
  });

  // Filter tags display
  const activeFilters = useMemo(() => {
    const tags: { key: string; label: string }[] = [];
    if (filters.clientName) tags.push({ key: 'client', label: filters.clientName });
    if (filters.iikoOrderId) tags.push({ key: 'iiko', label: filters.iikoOrderId });
    if (filters.zones.length) tags.push({ key: 'zones', label: `${filters.zones.length} залов` });
    if (filters.tables.length) tags.push({ key: 'tables', label: `${filters.tables.length} столов` });
    if (filters.quests.length) tags.push({ key: 'quests', label: `${filters.quests.length} квестов` });
    if (filters.hasCake !== null) tags.push({ key: 'cake', label: filters.hasCake ? 'Торт: Да' : 'Торт: Нет' });
    if (filters.hasDecoration !== null) tags.push({ key: 'decor', label: filters.hasDecoration ? 'Украш: Да' : 'Украш: Нет' });
    if (filters.hasFood !== null) tags.push({ key: 'food', label: filters.hasFood ? 'Еда: Да' : 'Еда: Нет' });
    if (filters.hasExtra !== null) tags.push({ key: 'extra', label: filters.hasExtra ? 'Доп: Да' : 'Доп: Нет' });
    return tags;
  }, [filters]);

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      loadBookings();
    }
  }, [selectedBranch]);

  const loadBranches = async () => {
    try {
      const data = await getBranches();
      setBranches(data);
      if (data.length > 0) {
        setSelectedBranch(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  };

  const loadBookings = async () => {
    setLoading(true);
    try {
      // Get all bookings for branch with date range
      const response = await api.get('/api/admin/bookings', {
        params: {
          branchId: selectedBranch,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
        }
      });
      
      // Transform to list items
      const items: BookingListItem[] = response.data.map((booking: any) => {
        const tableRes = booking.tableReservations?.[0];
        const questRes = booking.questReservations?.[0];
        
        return {
          id: booking.id,
          iikoOrderId: booking.iikoOrderId,
          eventDate: booking.eventDate,
          timeRange: tableRes 
            ? `${tableRes.startTime.slice(0, 5)} — ${tableRes.endTime.slice(0, 5)}`
            : questRes
            ? `${questRes.startTime.slice(0, 5)} — ${questRes.endTime.slice(0, 5)}`
            : '',
          totalAmount: booking.totalAmount || 0,
          depositRub: booking.depositRub || 0,
          clientName: booking.clientName,
          clientPhone: booking.clientPhone,
          birthdayPersonName: booking.birthdayPersonName,
          zoneName: tableRes?.zoneName || '',
          tableName: tableRes?.tableTitle || '',
          questName: questRes?.questName || null,
          hasCake: (booking.bookingCakes?.length || 0) > 0,
          hasDecoration: (booking.decorationItems?.length || 0) > 0,
          hasFood: (booking.foodItems?.length || 0) > 0,
          hasExtra: (booking.extraSlots?.length || 0) > 0,
          managerName: booking.manager?.fullName || null,
          status: booking.status,
        };
      });
      
      setBookings(items);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    loadBookings();
  };

  const handleResetFilters = () => {
    setFilters({
      clientName: '',
      iikoOrderId: '',
      minAmount: '',
      maxAmount: '',
      minDeposit: '',
      maxDeposit: '',
      dateFrom: '',
      dateTo: '',
      timeFrom: '',
      timeTo: '',
      zones: [],
      tables: [],
      quests: [],
      hasCake: null,
      hasDecoration: null,
      hasFood: null,
      hasExtra: null,
      managers: [],
      checkedBy: [],
      smsSent: null,
    });
  };

  const handleRemoveFilter = (key: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: key === 'zones' || key === 'tables' || key === 'quests' || key === 'managers' || key === 'checkedBy' 
        ? [] 
        : key.startsWith('has') || key === 'smsSent'
        ? null
        : ''
    }));
  };

  const formatDate = (dateStr: string) => {
    const [, month, day] = dateStr.split('-');
    return `${day}.${month}`;
  };

  // Group bookings by date
  const groupedBookings = useMemo(() => {
    const groups: Record<string, BookingListItem[]> = {};
    bookings.forEach(booking => {
      if (!groups[booking.eventDate]) {
        groups[booking.eventDate] = [];
      }
      groups[booking.eventDate].push(booking);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [bookings]);

  // Calculate daily totals
  const getDailyTotal = (items: BookingListItem[]) => {
    return items.reduce((sum, item) => sum + item.totalAmount, 0);
  };

  const getDailyDeposit = (items: BookingListItem[]) => {
    return items.reduce((sum, item) => sum + item.depositRub, 0);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Реестр бронирований</h1>
        <div className={styles.headerActions}>
          <div className={styles.branchSelect}>
            <select 
              value={selectedBranch} 
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <button 
            className={styles.newOrderButton}
            onClick={() => setShowNewOrderModal(true)}
          >
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
                value={filters.clientName}
                onChange={(e) => setFilters({...filters, clientName: e.target.value})}
                placeholder="Введите имя..."
              />
            </div>
            
            <div className={styles.filterGroup}>
              <label>Чек из iiko</label>
              <input 
                type="text" 
                value={filters.iikoOrderId}
                onChange={(e) => setFilters({...filters, iikoOrderId: e.target.value})}
                placeholder="0017354"
              />
            </div>
            
            <div className={styles.filterGroup}>
              <label>Сумма</label>
              <div className={styles.rangeInputs}>
                <input 
                  type="number" 
                  value={filters.minAmount}
                  onChange={(e) => setFilters({...filters, minAmount: e.target.value})}
                  placeholder="от"
                />
                <input 
                  type="number" 
                  value={filters.maxAmount}
                  onChange={(e) => setFilters({...filters, maxAmount: e.target.value})}
                  placeholder="до"
                />
              </div>
            </div>
            
            <div className={styles.filterGroup}>
              <label>Предоплата</label>
              <div className={styles.rangeInputs}>
                <input 
                  type="number" 
                  value={filters.minDeposit}
                  onChange={(e) => setFilters({...filters, minDeposit: e.target.value})}
                  placeholder="от"
                />
                <input 
                  type="number" 
                  value={filters.maxDeposit}
                  onChange={(e) => setFilters({...filters, maxDeposit: e.target.value})}
                  placeholder="до"
                />
              </div>
            </div>
            
            <div className={styles.filterGroup}>
              <label>Даты</label>
              <div className={styles.rangeInputs}>
                <input 
                  type="date" 
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                />
                <input 
                  type="date" 
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                />
              </div>
            </div>
            
            <div className={styles.filterGroup}>
              <label>Время</label>
              <div className={styles.rangeInputs}>
                <input 
                  type="time" 
                  value={filters.timeFrom}
                  onChange={(e) => setFilters({...filters, timeFrom: e.target.value})}
                />
                <input 
                  type="time" 
                  value={filters.timeTo}
                  onChange={(e) => setFilters({...filters, timeTo: e.target.value})}
                />
              </div>
            </div>

            {/* Toggle filters */}
            <div className={styles.filterRow}>
              <div className={styles.toggleGroup}>
                <span>Залы / столы</span>
                <div className={styles.toggleButtons}>
                  <button className={styles.addButton}>+ добавить зал</button>
                  <button className={styles.addButton}>+ добавить стол</button>
                </div>
              </div>
              
              <div className={styles.toggleGroup}>
                <span>Предзаказ</span>
                <div className={styles.toggleButtons}>
                  <button 
                    className={`${styles.toggleBtn} ${filters.hasFood === true ? styles.active : ''}`}
                    onClick={() => setFilters({...filters, hasFood: filters.hasFood === true ? null : true})}
                  >
                    Да {filters.hasFood === true && '×'}
                  </button>
                  <button 
                    className={`${styles.toggleBtn} ${filters.hasFood === false ? styles.active : ''}`}
                    onClick={() => setFilters({...filters, hasFood: filters.hasFood === false ? null : false})}
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
                    onClick={() => setFilters({...filters, hasDecoration: filters.hasDecoration === true ? null : true})}
                  >
                    Да {filters.hasDecoration === true && '×'}
                  </button>
                  <button 
                    className={`${styles.toggleBtn} ${filters.hasDecoration === false ? styles.active : ''}`}
                    onClick={() => setFilters({...filters, hasDecoration: filters.hasDecoration === false ? null : false})}
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
                    onClick={() => setFilters({...filters, hasExtra: filters.hasExtra === true ? null : true})}
                  >
                    Да {filters.hasExtra === true && '×'}
                  </button>
                  <button 
                    className={`${styles.toggleBtn} ${filters.hasExtra === false ? styles.active : ''}`}
                    onClick={() => setFilters({...filters, hasExtra: filters.hasExtra === false ? null : false})}
                  >
                    Нет {filters.hasExtra === false && '×'}
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.filterRow}>
              <div className={styles.toggleGroup}>
                <span>Квесты</span>
                <div className={styles.toggleButtons}>
                  <button className={styles.addButton}>+ добавить квест</button>
                </div>
              </div>
              
              <div className={styles.toggleGroup}>
                <span>Торт</span>
                <div className={styles.toggleButtons}>
                  <button 
                    className={`${styles.toggleBtn} ${filters.hasCake === true ? styles.active : ''}`}
                    onClick={() => setFilters({...filters, hasCake: filters.hasCake === true ? null : true})}
                  >
                    Да {filters.hasCake === true && '×'}
                  </button>
                  <button 
                    className={`${styles.toggleBtn} ${filters.hasCake === false ? styles.active : ''}`}
                    onClick={() => setFilters({...filters, hasCake: filters.hasCake === false ? null : false})}
                  >
                    Нет {filters.hasCake === false && '×'}
                  </button>
                </div>
              </div>
              
              <div className={styles.toggleGroup}>
                <span>Проверил</span>
                <div className={styles.toggleButtons}>
                  <button className={styles.addButton}>+ добавить</button>
                </div>
              </div>
              
              <div className={styles.toggleGroup}>
                <span>СМС</span>
                <div className={styles.toggleButtons}>
                  <button 
                    className={`${styles.toggleBtn} ${filters.smsSent === true ? styles.active : ''}`}
                    onClick={() => setFilters({...filters, smsSent: filters.smsSent === true ? null : true})}
                  >
                    Да {filters.smsSent === true && '×'}
                  </button>
                  <button 
                    className={`${styles.toggleBtn} ${filters.smsSent === false ? styles.active : ''}`}
                    onClick={() => setFilters({...filters, smsSent: filters.smsSent === false ? null : false})}
                  >
                    Нет {filters.smsSent === false && '×'}
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
                      <th>дата</th>
                      <th>время</th>
                      <th>сумма, руб.</th>
                      <th>предоплата</th>
                      <th>клиент</th>
                      <th>телефон</th>
                      <th>именинник</th>
                      <th>зал</th>
                      <th>стол</th>
                      <th>квест</th>
                      <th>торт</th>
                      <th>предзаказ</th>
                      <th>украш.</th>
                      <th>доп. развлечения</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((booking) => (
                      <tr 
                        key={booking.id} 
                        className={styles.bookingRow}
                        onClick={() => navigate(`/registry/${booking.id}`)}
                      >
                        <td>{booking.iikoOrderId || '-'}</td>
                        <td>{formatDate(booking.eventDate)}</td>
                        <td>{booking.timeRange}</td>
                        <td>{booking.totalAmount.toLocaleString()}</td>
                        <td>{booking.depositRub.toLocaleString()}</td>
                        <td>{booking.clientName}</td>
                        <td>{booking.clientPhone}</td>
                        <td>{booking.birthdayPersonName || '-'}</td>
                        <td>{booking.zoneName}</td>
                        <td>{booking.tableName}</td>
                        <td>{booking.questName || 'Нет'}</td>
                        <td className={booking.hasCake ? styles.yesCell : styles.noCell}>
                          {booking.hasCake ? 'Да' : 'Нет'}
                        </td>
                        <td className={booking.hasFood ? styles.yesCell : styles.noCell}>
                          {booking.hasFood ? 'Да' : 'Нет'}
                        </td>
                        <td className={booking.hasDecoration ? styles.yesCell : styles.noCell}>
                          {booking.hasDecoration ? 'Да' : 'Нет'}
                        </td>
                        <td className={booking.hasExtra ? styles.yesCell : styles.noCell}>
                          {booking.hasExtra ? 'Да' : 'Нет'}
                        </td>
                      </tr>
                    ))}
                    <tr className={styles.totalRow}>
                      <td colSpan={3}>Итого за {formatDate(date)}</td>
                      <td>{getDailyTotal(items).toLocaleString()}</td>
                      <td>{getDailyDeposit(items).toLocaleString()}</td>
                      <td colSpan={10}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
            
            {bookings.length === 0 && (
              <div className={styles.emptyState}>
                Нет бронирований для отображения
              </div>
            )}
          </>
        )}
      </div>
      
      <NewOrderModal
        isOpen={showNewOrderModal}
        onClose={() => setShowNewOrderModal(false)}
        onSuccess={(bookingId) => {
          setShowNewOrderModal(false);
          navigate(`/registry/${bookingId}`);
        }}
      />
    </div>
  );
}
