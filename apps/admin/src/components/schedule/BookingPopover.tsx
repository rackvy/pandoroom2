import { useEffect, useRef } from 'react';
import styles from './ScheduleGrid.module.css';
import type { TableReservation, QuestReservation } from '../../api/schedule';

interface BookingPopoverProps {
  reservation: TableReservation | QuestReservation;
  position: { x: number; y: number };
  onClose: () => void;
  onEdit: (bookingId: string) => void;
  onCancel: (id: string) => void;
}

export default function BookingPopover({ reservation, position, onClose, onEdit, onCancel }: BookingPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Adjust position to keep popover on screen
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 340),
    y: Math.min(position.y, window.innerHeight - 400),
  };

  const shortBookingId = reservation.bookingId.slice(-6).toUpperCase();

  return (
    <>
      <div className={styles.popoverOverlay} onClick={onClose} />
      <div
        ref={popoverRef}
        className={styles.popover}
        style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
      >
        <div className={styles.popoverHeader}>
          <div>
            <div className={styles.popoverTitle}>Бронь #{shortBookingId}</div>
            <div className={styles.popoverBookingId}>{reservation.bookingId}</div>
          </div>
          <button className={styles.popoverClose} onClick={onClose}>×</button>
        </div>

        <div className={styles.popoverContent}>
          <div className={styles.popoverRow}>
            <span className={styles.popoverLabel}>Дата:</span>
            <span className={styles.popoverValue}>{(reservation as any).eventDate || '—'}</span>
          </div>
          <div className={styles.popoverRow}>
            <span className={styles.popoverLabel}>Время:</span>
            <span className={styles.popoverValue}>{reservation.startTime} - {reservation.endTime}</span>
          </div>
          <div className={styles.popoverRow}>
            <span className={styles.popoverLabel}>Клиент:</span>
            <span className={styles.popoverValue}>{reservation.title || '—'}</span>
          </div>
          <div className={styles.popoverRow}>
            <span className={styles.popoverLabel}>Статус:</span>
            <span className={styles.popoverValue}>
              {reservation.status === 'confirmed' ? 'Подтверждена' :
               reservation.status === 'draft' ? 'Черновик' :
               reservation.status === 'done' ? 'Завершена' :
               reservation.status === 'canceled' ? 'Отменена' : reservation.status}
            </span>
          </div>

          {/* Categories placeholder */}
          <div className={styles.popoverCategories}>
            <span className={styles.categoryTag}>Квест</span>
            <span className={styles.categoryTag}>Торт</span>
            <span className={styles.categoryTag}>Шоу</span>
          </div>

          <div className={styles.popoverActions}>
            <button
              className={`${styles.popoverButton} ${styles.popoverButtonPrimary}`}
              onClick={() => onEdit(reservation.bookingId)}
            >
              Редактировать
            </button>

            <div className={styles.smsButtons}>
              <button className={`${styles.popoverButton} ${styles.popoverButtonSecondary}`}>
                SMS #1
              </button>
              <button className={`${styles.popoverButton} ${styles.popoverButtonSecondary}`}>
                SMS #2
              </button>
            </div>

            {reservation.status !== 'canceled' && (
              <button
                className={`${styles.popoverButton} ${styles.popoverButtonDanger}`}
                onClick={() => onCancel(reservation.id)}
              >
                Отменить
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
