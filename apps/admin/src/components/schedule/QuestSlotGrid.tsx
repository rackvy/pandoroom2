import { useMemo } from 'react';
import { QuestWithSlots, QuestSlot } from '../../api/schedule';
import styles from './QuestSlotGrid.module.css';

interface QuestSlotGridProps {
  quests: QuestWithSlots[];
  onSlotClick?: (questId: string, slot: QuestSlot) => void;
  onReservationClick?: (questId: string, slot: QuestSlot) => void;
}

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
  // Calculate time range for all quests
  const { startMinutes, timeSlots } = useMemo(() => {
    if (quests.length === 0) {
      return { startMinutes: 9 * 60, timeSlots: [] };
    }

    let minTime = Infinity;
    let maxTime = 0;

    quests.forEach(quest => {
      quest.slots.forEach(slot => {
        const slotStart = timeToMinutes(slot.startTime);
        const slotEnd = slotStart + quest.durationMinutes;
        minTime = Math.min(minTime, slotStart);
        maxTime = Math.max(maxTime, slotEnd);
      });
    });

    // Add some padding
    minTime = Math.floor(minTime / 30) * 30; // Round down to 30 min
    maxTime = Math.ceil(maxTime / 30) * 30; // Round up to 30 min

    // Generate time slots (every 30 minutes for display)
    const slots: number[] = [];
    for (let t = minTime; t <= maxTime; t += 30) {
      slots.push(t);
    }

    return { startMinutes: minTime, timeSlots: slots };
  }, [quests]);

  // Calculate slot position and height
  const getSlotStyle = (startTime: string, durationMinutes: number) => {
    const slotStart = timeToMinutes(startTime);
    const top = ((slotStart - startMinutes) / 30) * 40; // 40px per 30 min
    const height = (durationMinutes / 30) * 40;
    return { top, height };
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
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div className={styles.timeHeader}>Время</div>
        <div className={styles.questHeaders}>
          {quests.map((quest) => (
            <div key={quest.questId} className={styles.questHeader}>
              <div className={styles.questName}>{quest.questName}</div>
              <div className={styles.questDuration}>{quest.durationMinutes} мин</div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Body */}
      <div className={styles.gridBody}>
        {/* Time axis */}
        <div className={styles.timeAxis}>
          {timeSlots.map((time, index) => (
            <div 
              key={time} 
              className={styles.timeLabel}
              style={{ top: index * 40 }}
            >
              {time % 60 === 0 && minutesToTime(time)}
            </div>
          ))}
        </div>

        {/* Quest columns */}
        <div className={styles.questsContainer}>
          {quests.map((quest) => (
            <div key={quest.questId} className={styles.questColumn}>
              {/* Grid lines */}
              {timeSlots.map((_, index) => (
                <div 
                  key={index} 
                  className={styles.gridLine}
                  style={{ top: index * 40 }}
                />
              ))}

              {/* Slots */}
              {quest.slots.map((slot) => {
                const { top, height } = getSlotStyle(slot.startTime, quest.durationMinutes);
                const isBooked = !!slot.reservation;

                return (
                  <div
                    key={slot.slotId}
                    className={`${styles.slot} ${isBooked ? styles.booked : styles.available}`}
                    style={{ top, height }}
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
  );
}
