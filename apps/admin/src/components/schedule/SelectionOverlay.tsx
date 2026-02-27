import { useMemo } from 'react';
import { minutesToTime } from '../../utils/time';
import styles from './ScheduleGrid.module.css';

interface SelectionOverlayProps {
  topPx: number;
  heightPx: number;
  hasOverlap: boolean;
  startMinutes: number;
  endMinutes: number;
}

export default function SelectionOverlay({
  topPx,
  heightPx,
  hasOverlap,
  startMinutes,
  endMinutes,
}: SelectionOverlayProps) {
  const startTime = useMemo(() => minutesToTime(startMinutes), [startMinutes]);
  const endTime = useMemo(() => minutesToTime(endMinutes), [endMinutes]);
  const durationMinutes = endMinutes - startMinutes;

  return (
    <div
      className={`${styles.selectionOverlay} ${hasOverlap ? styles.selectionOverlap : ''}`}
      style={{
        top: topPx,
        height: heightPx,
      }}
    >
      <div className={styles.selectionContent}>
        <div className={styles.selectionTime}>
          {startTime} — {endTime}
        </div>
        <div className={styles.selectionDuration}>
          {durationMinutes} мин
        </div>
      </div>
      {hasOverlap && (
        <div className={styles.selectionError}>
          Слот занят
        </div>
      )}
    </div>
  );
}
