import { useState, useEffect } from 'react';
import { getFreeTables, partyEndTime, type FreeTableZone } from '../../api/bookings';
import styles from './TableSelector.module.css';

interface TableSelectorProps {
  branchId: string;
  eventDate: string;
  /** Начало праздника: занятость стола проверяется интервалом, а не датой. */
  startTime: string;
  endTime?: string;
  onSelect: (tableId: string, tableTitle: string, zoneName: string) => void;
}

export default function TableSelector({
  branchId,
  eventDate,
  startTime,
  endTime,
  onSelect,
}: TableSelectorProps) {
  const [zones, setZones] = useState<FreeTableZone[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const to = endTime || partyEndTime(startTime);

  useEffect(() => {
    if (!branchId || !eventDate || !startTime) return;

    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getFreeTables({ branchId, date: eventDate, startTime, endTime: to });
        if (!cancelled) setZones(data);
      } catch (err) {
        if (!cancelled) setError('Не удалось загрузить свободные столы');
        console.error(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [branchId, eventDate, startTime, to]);

  if (!startTime) return <div className={styles.empty}>Сначала укажите время начала</div>;
  if (isLoading) return <div className={styles.loading}>Загрузка столов...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  const zonesWithTables = zones.filter((zone) => zone.tables.length > 0);
  if (zonesWithTables.length === 0) {
    return (
      <div className={styles.empty}>
        На {startTime}–{to} свободных столов нет
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {zonesWithTables.map((zone) => (
        <div key={zone.id} className={styles.zoneSection}>
          <h5 className={styles.zoneName}>
            {zone.name}
            {zone.recommendedMaxAge !== null && (
              <span className={styles.ageHint}>до {zone.recommendedMaxAge} лет</span>
            )}
          </h5>
          <div className={styles.tablesGrid}>
            {zone.tables.map((table) => (
              <button
                key={table.id}
                className={styles.tableButton}
                onClick={() => onSelect(table.id, table.title, zone.name)}
                title="Свободен на это время"
              >
                <span className={styles.tableTitle}>{table.title}</span>
                {table.capacity && (
                  <span className={styles.capacity}>до {table.capacity} чел</span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
