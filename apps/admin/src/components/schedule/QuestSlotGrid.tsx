import { useMemo } from 'react';
import { QuestWithSlots, QuestSlot } from '../../api/schedule';
import styles from './QuestSlotGrid.module.css';

interface QuestSlotGridProps {
  quests: QuestWithSlots[];
  onSlotClick?: (questId: string, slot: QuestSlot) => void;
  onReservationClick?: (questId: string, slot: QuestSlot) => void;
}

// Layout constants
const LABEL_WIDTH = 170; // px, quest name column
const PX_PER_15 = 24; // pixels per 15 minutes (96px per hour)
const ROW_HEIGHT = 60; // px per quest row

// Parse time string (HH:MM) to minutes from midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Format minutes to HH:MM
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export default function QuestSlotGrid({ quests, onSlotClick, onReservationClick }: QuestSlotGridProps) {
  // Calculate time range across all quests + marks (every 30 min)
  const { startMinutes, gridWidth, marks } = useMemo(() => {
    if (quests.length === 0) {
      return { startMinutes: 9 * 60, gridWidth: 0, marks: [] as { minutes: number; offset: number; isHour: boolean }[] };
    }

    let minTime = Infinity;
    let maxTime = 0;

    quests.forEach((quest) => {
      quest.slots.forEach((slot) => {
        const slotStart = timeToMinutes(slot.startTime);
        const slotEnd = slotStart + quest.durationMinutes;
        minTime = Math.min(minTime, slotStart);
        maxTime = Math.max(maxTime, slotEnd);
      });
    });

    // Round to 30-min bounds + padding
    minTime = Math.floor(minTime / 30) * 30;
    maxTime = Math.ceil(maxTime / 30) * 30 + 30;

    const width = ((maxTime - minTime) / 15) * PX_PER_15;

    // Time marks every 30 minutes
    const m: { minutes: number; offset: number; isHour: boolean }[] = [];
    for (let t = minTime; t <= maxTime; t += 30) {
      m.push({ minutes: t, offset: ((t - minTime) / 15) * PX_PER_15, isHour: t % 60 === 0 });
    }

    return { startMinutes: minTime, gridWidth: width, marks: m };
  }, [quests]);

  // Calculate slot horizontal position and width
  const getSlotStyle = (startTime: string, durationMinutes: number) => {
    const slotStart = timeToMinutes(startTime);
    const left = ((slotStart - startMinutes) / 15) * PX_PER_15;
    const width = (durationMinutes / 15) * PX_PER_15;
    return { left, width };
  };

  if (quests.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Нет квестов с расписанием на эту дату</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.scrollArea}>
        <div className={styles.gridInner} style={{ width: LABEL_WIDTH + gridWidth }}>
          {/* Sticky header row */}
          <div className={styles.headerRow}>
            <div className={styles.cornerCell}>Квест / Время</div>
            <div className={styles.timeHeader} style={{ width: gridWidth }}>
              {marks.map((mark) => (
                <div
                  key={mark.minutes}
                  className={`${styles.timeLabel} ${mark.isHour ? styles.hourLabel : styles.halfLabel}`}
                  style={{ left: mark.offset }}
                >
                  {minutesToTime(mark.minutes)}
                </div>
              ))}
            </div>
          </div>

          {/* Body: sticky label column + timeline column */}
          <div className={styles.rowsWrapper}>
            {/* Sticky quest labels */}
            <div className={styles.labelsColumn} style={{ width: LABEL_WIDTH }}>
              {quests.map((quest) => (
                <div key={quest.questId} className={styles.questLabel} style={{ height: ROW_HEIGHT }}>
                  <div className={styles.questName}>{quest.questName}</div>
                  <div className={styles.questDuration}>{quest.durationMinutes} мин</div>
                </div>
              ))}
            </div>

            {/* Timeline column with grid lines + rows */}
            <div className={styles.timelineColumn} style={{ width: gridWidth }}>
              {/* Vertical grid lines spanning full height */}
              {marks.map((mark) => (
                <div
                  key={mark.minutes}
                  className={`${styles.gridLine} ${mark.isHour ? styles.hourLine : styles.halfLine}`}
                  style={{ left: mark.offset }}
                />
              ))}

              {/* Quest rows with slots */}
              {quests.map((quest) => (
                <div key={quest.questId} className={styles.questRow} style={{ height: ROW_HEIGHT }}>
                  {quest.slots.map((slot) => {
                    const { left, width } = getSlotStyle(slot.startTime, quest.durationMinutes);
                    const isBooked = !!slot.reservation;
                    const isBlocked = !slot.isAvailable;

                    let className = styles.slot;
                    if (isBooked) className += ` ${styles.booked}`;
                    else if (isBlocked) className += ` ${styles.blocked}`;
                    else className += ` ${styles.available}`;

                    return (
                      <div
                        key={slot.slotId}
                        className={className}
                        style={{ left, width }}
                        title={isBlocked && slot.maintenanceNote ? slot.maintenanceNote : undefined}
                        onClick={() => {
                          if (isBooked && slot.reservation) {
                            onReservationClick?.(quest.questId, slot);
                          } else {
                            onSlotClick?.(quest.questId, slot);
                          }
                        }}
                      >
                        {isBooked ? (
                          <div className={styles.bookingInfo}>
                            <div className={styles.clientName}>{slot.reservation!.clientName}</div>
                            <div className={styles.bookingTime}>{slot.startTime}</div>
                          </div>
                        ) : isBlocked ? (
                          <div className={styles.blockedInfo}>
                            <div className={styles.blockedTime}>{slot.startTime}</div>
                            <div className={styles.blockedLabel}>
                              {slot.maintenanceNote || 'Заблокировано'}
                            </div>
                          </div>
                        ) : (
                          <div className={styles.slotInfo}>
                            <div className={styles.slotTime}>{slot.startTime}</div>
                            <div className={styles.slotPrice}>
                              {slot.finalPrice.toLocaleString()} ₽
                              {slot.hasSpecialPrice && (
                                <span className={styles.specialPriceBadge}>★</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
