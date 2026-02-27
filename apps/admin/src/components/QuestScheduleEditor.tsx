import { useState, useCallback } from 'react';
import styles from './QuestScheduleEditor.module.css';

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const TIME_OPTIONS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00', '22:30', '23:00'
];

export interface ScheduleSlot {
  dayOfWeek: number;
  startTime: string;
  basePrice: number;
}

interface QuestScheduleEditorProps {
  slots: ScheduleSlot[];
  onChange: (slots: ScheduleSlot[]) => void;
}

export default function QuestScheduleEditor({ slots, onChange }: QuestScheduleEditorProps) {
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [price, setPrice] = useState(2500);

  const slotsByDay = slots.reduce((acc, slot) => {
    if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
    acc[slot.dayOfWeek].push(slot);
    return acc;
  }, {} as Record<number, ScheduleSlot[]>);

  // Sort slots by time for each day
  Object.keys(slotsByDay).forEach(day => {
    slotsByDay[Number(day)].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  const handleAddSlot = useCallback(() => {
    // Check if slot already exists
    const exists = slots.some(
      s => s.dayOfWeek === selectedDay && s.startTime === selectedTime
    );
    if (exists) {
      alert('Такой слот уже существует');
      return;
    }

    const newSlot: ScheduleSlot = {
      dayOfWeek: selectedDay,
      startTime: selectedTime,
      basePrice: price,
    };
    onChange([...slots, newSlot]);
  }, [slots, selectedDay, selectedTime, price, onChange]);

  const handleRemoveSlot = useCallback((dayOfWeek: number, startTime: string) => {
    onChange(slots.filter(s => !(s.dayOfWeek === dayOfWeek && s.startTime === startTime)));
  }, [slots, onChange]);

  const handleCopyDay = useCallback((fromDay: number, toDay: number) => {
    const daySlots = slots.filter(s => s.dayOfWeek === fromDay);
    const newSlots = daySlots.map(s => ({ ...s, dayOfWeek: toDay }));
    
    // Remove existing slots for target day
    const filteredSlots = slots.filter(s => s.dayOfWeek !== toDay);
    onChange([...filteredSlots, ...newSlots]);
  }, [slots, onChange]);

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Расписание и цены</h3>
      
      <div className={styles.addSlotForm}>
        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label>День</label>
            <select value={selectedDay} onChange={(e) => setSelectedDay(Number(e.target.value))}>
              {DAY_NAMES.map((name, index) => (
                <option key={index} value={index}>{name}</option>
              ))}
            </select>
          </div>
          
          <div className={styles.formField}>
            <label>Время</label>
            <select value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)}>
              {TIME_OPTIONS.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
          
          <div className={styles.formField}>
            <label>Цена (₽)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              min={0}
              step={100}
            />
          </div>
          
          <button type='button' className={styles.addButton} onClick={handleAddSlot}>
            + Добавить
          </button>
        </div>
      </div>

      <div className={styles.scheduleGrid}>
        {DAY_NAMES.map((dayName, dayIndex) => (
          <div key={dayIndex} className={styles.dayColumn}>
            <div className={styles.dayHeader}>
              <span>{dayName}</span>
              <select 
                className={styles.copySelect}
                onChange={(e) => {
                  const fromDay = Number(e.target.value);
                  if (fromDay >= 0) {
                    handleCopyDay(fromDay, dayIndex);
                  }
                }}
                value=""
                title="Копировать из..."
              >
                <option value="">Копировать из...</option>
                {DAY_NAMES.map((name, idx) => (
                  idx !== dayIndex && <option key={idx} value={idx}>{name}</option>
                ))}
              </select>
            </div>
            
            <div className={styles.slotsList}>
              {(slotsByDay[dayIndex] || []).length === 0 ? (
                <div className={styles.noSlots}>Нет слотов</div>
              ) : (
                slotsByDay[dayIndex].map((slot, idx) => (
                  <div key={idx} className={styles.slot}>
                    <span className={styles.slotTime}>{slot.startTime}</span>
                    <span className={styles.slotPrice}>{slot.basePrice} ₽</span>
                    <button
                      className={styles.removeButton}
                      onClick={() => handleRemoveSlot(slot.dayOfWeek, slot.startTime)}
                      title="Удалить"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
