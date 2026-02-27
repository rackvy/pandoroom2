import { getTimeSlots, PIXELS_PER_MINUTE, TIME_STEP_MINUTES } from './timeUtils';
import styles from './Schedule.module.css';

export default function TimeAxis() {
  const slots = getTimeSlots();

  return (
    <div className={styles.timeAxis}>
      {slots.map((time: string, index: number) => (
        <div
          key={time}
          className={styles.timeLabel}
          style={{
            top: index * TIME_STEP_MINUTES * PIXELS_PER_MINUTE,
          }}
        >
          <span className={styles.timeText}>{time}</span>
        </div>
      ))}
    </div>
  );
}
