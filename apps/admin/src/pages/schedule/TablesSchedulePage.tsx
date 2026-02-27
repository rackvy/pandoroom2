import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ScheduleGrid from '../../components/schedule/ScheduleGrid';
import { getTablesSchedule, moveTableReservation, cancelTableReservation, type TablesScheduleResponse, type TableReservation } from '../../api/schedule';
import { getBranches, type Branch } from '../../api/catalog';
import { formatDateForApi, addDays, parseDateFromString } from '../../components/schedule/timeUtils';
import styles from './SchedulePage.module.css';

export default function TablesSchedulePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Parse date from URL or use today
  const urlDate = searchParams.get('date');
  const initialDate = urlDate ? parseDateFromString(urlDate) : new Date();
  
  const [date, setDate] = useState<Date>(initialDate);
  const [branchId, setBranchId] = useState<string>('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [scheduleData, setScheduleData] = useState<TablesScheduleResponse | null>(null);
  const [showOnlyFree, setShowOnlyFree] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load branches on mount
  useEffect(() => {
    getBranches()
      .then(data => {
        setBranches(data);
        if (data.length > 0 && !branchId) {
          setBranchId(data[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Update date when URL changes
  useEffect(() => {
    const currentUrlDate = searchParams.get('date');
    if (currentUrlDate) {
      const parsedDate = parseDateFromString(currentUrlDate);
      // Only update if date is different to avoid loops
      if (formatDateForApi(parsedDate) !== formatDateForApi(date)) {
        setDate(parsedDate);
      }
    }
  }, [searchParams]);

  // Load schedule when date or branch changes
  useEffect(() => {
    if (!branchId) return;

    const loadSchedule = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const dateStr = formatDateForApi(date);
        const data = await getTablesSchedule(branchId, dateStr);
        setScheduleData(data);
      } catch (err) {
        setError('Не удалось загрузить расписание');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSchedule();
  }, [date, branchId]);

  const handleDateChange = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const handleMove = useCallback(async (id: string, updates: { tableId?: string; startTime: string; endTime: string }) => {
    try {
      await moveTableReservation(id, {
        tableId: updates.tableId,
        startTime: updates.startTime,
        endTime: updates.endTime,
      });
      // Refresh schedule
      const dateStr = formatDateForApi(date);
      const data = await getTablesSchedule(branchId, dateStr);
      setScheduleData(data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка перемещения брони');
    }
  }, [date, branchId]);

  const handleCancel = useCallback(async (id: string) => {
    if (!confirm('Отменить эту бронь?')) return;
    try {
      await cancelTableReservation(id);
      // Refresh schedule
      const dateStr = formatDateForApi(date);
      const data = await getTablesSchedule(branchId, dateStr);
      setScheduleData(data);
    } catch (err) {
      alert('Ошибка отмены брони');
    }
  }, [date, branchId]);

  const handleNavigateToBooking = useCallback((bookingId: string) => {
    navigate(`/bookings/${bookingId}`);
  }, [navigate]);

  // Filter tables if "show only free" is enabled
  const filteredTables = showOnlyFree && scheduleData
    ? scheduleData.tables.filter(table => {
        const tableReservations = scheduleData.reservations.filter(r => r.tableId === table.id);
        return tableReservations.length === 0;
      })
    : scheduleData?.tables;

  // Filter zones to only show those with visible tables
  const filteredZones = showOnlyFree && scheduleData && filteredTables
    ? scheduleData.zones.filter(zone => 
        filteredTables.some(t => t.zoneId === zone.id)
      )
    : scheduleData?.zones;

  const dateButtons = [
    { label: 'Сегодня', date: new Date() },
    { label: '+1 день', date: addDays(new Date(), 1) },
    { label: '+2 дня', date: addDays(new Date(), 2) },
    { label: '+3 дня', date: addDays(new Date(), 3) },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Сетка столов</h2>
        
        <div className={styles.controls}>
          {/* Date picker */}
          <div className={styles.datePicker}>
            {dateButtons.map((btn, index) => (
              <button
                key={index}
                className={`${styles.dateButton} ${formatDateForApi(date) === formatDateForApi(btn.date) ? styles.active : ''}`}
                onClick={() => handleDateChange(btn.date)}
              >
                {btn.label}
              </button>
            ))}
            <input
              type="date"
              className={styles.dateInput}
              value={formatDateForApi(date)}
              onChange={(e) => handleDateChange(new Date(e.target.value))}
            />
          </div>

          {/* Branch selector */}
          <select
            className={styles.branchSelect}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">Выберите филиал</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>

          {/* Show only free toggle */}
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={showOnlyFree}
              onChange={(e) => setShowOnlyFree(e.target.checked)}
            />
            Только свободные
          </label>
        </div>

        {/* View switcher */}
        <div className={styles.viewSwitcher}>
          <Link to="/table-grid" className={`${styles.viewButton} ${styles.active}`}>
            Столы
          </Link>
          <Link to="/quest-grid" className={styles.viewButton}>
            Квесты
          </Link>
        </div>
      </div>

      <div className={styles.gridContainer}>
        {!branchId ? (
          <div className={styles.emptyState}>
            <p>Выберите филиал для просмотра расписания</p>
          </div>
        ) : isLoading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : error ? (
          <div className={styles.error}>
            <p>{error}</p>
            <button className={styles.retryButton} onClick={() => window.location.reload()}>
              Повторить
            </button>
          </div>
        ) : scheduleData && filteredZones && filteredTables ? (
          <ScheduleGrid
            zones={filteredZones}
            tables={filteredTables}
            reservations={scheduleData.reservations}
            isTable={true}
            branchId={branchId}
            eventDate={formatDateForApi(date)}
            onMove={handleMove}
            onCancel={handleCancel}
            onNavigateToBooking={handleNavigateToBooking}
            onQuickBook={(response) => {
              // Add new reservation to state
              setScheduleData(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  reservations: [...prev.reservations, response.reservation as TableReservation],
                };
              });
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
