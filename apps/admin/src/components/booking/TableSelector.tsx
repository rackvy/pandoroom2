import { useState, useEffect } from 'react';
import { getTablesSchedule, type TablesScheduleResponse } from '../../api/schedule';
import styles from './TableSelector.module.css';

interface TableSelectorProps {
  branchId: string;
  eventDate: string;
  selectedTableId?: string;
  onSelect: (tableId: string, tableTitle: string, zoneName: string) => void;
}

export default function TableSelector({ branchId, eventDate, selectedTableId, onSelect }: TableSelectorProps) {
  const [scheduleData, setScheduleData] = useState<TablesScheduleResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!branchId || !eventDate) return;

    const loadSchedule = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getTablesSchedule(branchId, eventDate);
        setScheduleData(data);
      } catch (err) {
        setError('Не удалось загрузить расписание столов');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSchedule();
  }, [branchId, eventDate]);

  if (isLoading) return <div className={styles.loading}>Загрузка столов...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!scheduleData || scheduleData.zones.length === 0) {
    return <div className={styles.empty}>Нет доступных столов</div>;
  }

  return (
    <div className={styles.container}>
      {scheduleData.zones.map((zone) => {
        const zoneTables = scheduleData.tables.filter((t) => t.zoneId === zone.id);
        if (zoneTables.length === 0) return null;

        return (
          <div key={zone.id} className={styles.zoneSection}>
            <h5 className={styles.zoneName}>{zone.name}</h5>
            <div className={styles.tablesGrid}>
              {zoneTables.map((table) => {
                const isSelected = table.id === selectedTableId;
                const hasReservations = scheduleData.reservations.some(
                  (r) => r.tableId === table.id
                );

                return (
                  <button
                    key={table.id}
                    className={`${styles.tableButton} ${isSelected ? styles.selected : ''} ${hasReservations ? styles.hasReservations : ''}`}
                    onClick={() => onSelect(table.id, table.title, zone.name)}
                    title={hasReservations ? 'Есть бронирования' : 'Свободен'}
                  >
                    <span className={styles.tableTitle}>{table.title}</span>
                    {table.capacity && (
                      <span className={styles.capacity}>до {table.capacity} чел</span>
                    )}
                    {hasReservations && <span className={styles.indicator} />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
