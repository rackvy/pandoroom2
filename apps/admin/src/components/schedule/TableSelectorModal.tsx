import { useState, useEffect } from 'react';
import { getTablesSchedule, Table, TableZone } from '../../api/schedule';
import styles from './ItemSelectorModal.module.css';

interface TableSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (table: Table, zone: TableZone, startTime: string, endTime: string) => void;
  branchId: string;
  eventDate: string;
  startTime: string;
}

// Generate time options from start time to end of day (23:00)
function generateTimeOptions(startFrom: string): string[] {
  const times: string[] = [];
  const [startHour] = startFrom.split(':').map(Number);
  
  for (let h = startHour; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return times;
}

export default function TableSelectorModal({
  isOpen,
  onClose,
  onSelect,
  branchId,
  eventDate,
  startTime,
}: TableSelectorModalProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [zones, setZones] = useState<TableZone[]>([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [selectedStartTime, setSelectedStartTime] = useState(startTime);
  const [selectedEndTime, setSelectedEndTime] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && branchId && eventDate) {
      loadTables();
    }
  }, [isOpen, branchId, eventDate]);

  useEffect(() => {
    // Default end time is 2 hours after start
    const [h, m] = selectedStartTime.split(':').map(Number);
    const endDate = new Date(2024, 0, 1, h + 2, m);
    setSelectedEndTime(
      `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`
    );
  }, [selectedStartTime]);

  const loadTables = async () => {
    setLoading(true);
    try {
      const data = await getTablesSchedule(branchId, eventDate);
      setTables(data.tables);
      setZones(data.zones);
    } catch (error) {
      console.error('Failed to load tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    const table = tables.find(t => t.id === selectedTableId);
    if (!table) return;
    const zone = zones.find(z => z.id === table.zoneId);
    onSelect(table, zone!, selectedStartTime, selectedEndTime);
    onClose();
  };

  if (!isOpen) return null;

  const timeOptions = generateTimeOptions(startTime);

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>Выбор стола</h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>Загрузка...</div>
          ) : (
            <>
              <div className={styles.section}>
                <label className={styles.label}>Стол</label>
                <div className={styles.grid}>
                  {zones.map(zone => (
                    <div key={zone.id} className={styles.zoneSection}>
                      <div className={styles.zoneName}>{zone.name}</div>
                      <div className={styles.items}>
                        {tables
                          .filter(t => t.zoneId === zone.id)
                          .map(table => (
                            <button
                              key={table.id}
                              className={`${styles.item} ${selectedTableId === table.id ? styles.selected : ''}`}
                              onClick={() => setSelectedTableId(table.id)}
                            >
                              <div className={styles.itemTitle}>{table.title}</div>
                              <div className={styles.itemDetails}>
                                {table.capacity} мест
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.timeSection}>
                <div className={styles.timeField}>
                  <label className={styles.label}>Начало</label>
                  <select
                    className={styles.select}
                    value={selectedStartTime}
                    onChange={(e) => setSelectedStartTime(e.target.value)}
                  >
                    {timeOptions.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.timeField}>
                  <label className={styles.label}>Окончание</label>
                  <select
                    className={styles.select}
                    value={selectedEndTime}
                    onChange={(e) => setSelectedEndTime(e.target.value)}
                  >
                    {timeOptions.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onClose}>
            Отмена
          </button>
          <button
            className={styles.confirmButton}
            onClick={handleSelect}
            disabled={!selectedTableId}
          >
            Выбрать
          </button>
        </div>
      </div>
    </>
  );
}
