import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SidebarCalendar.module.css';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export default function SidebarCalendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get fresh date on each render to ensure "today" is correct
  const today = new Date();

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Adjust for Monday start (0 = Monday, 6 = Sunday)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;

    const days: Array<{
      date: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      fullDate: Date;
    }> = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: false,
        fullDate: date,
      });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({
        date: i,
        isCurrentMonth: true,
        isToday: 
          date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear(),
        fullDate: date,
      });
    }

    // Next month days to fill the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date: i,
        isCurrentMonth: false,
        isToday: false,
        fullDate: date,
      });
    }

    return days;
  }, [currentDate, today]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const formatDateForUrl = (date: Date): string => {
    // Format as YYYY-MM-DD in local timezone to avoid UTC conversion issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    // Navigate to table grid with selected date
    const dateStr = formatDateForUrl(date);
    navigate(`/table-grid?date=${dateStr}`);
  };

  const handleGoToSchedule = () => {
    const dateToUse = selectedDate || new Date();
    const dateStr = formatDateForUrl(dateToUse);
    navigate(`/table-grid?date=${dateStr}`);
  };

  return (
    <div className={styles.calendar}>
      <div className={styles.calendarHeader}>
        <div className={styles.calendarMonth}>
          {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
        </div>
        <div className={styles.calendarNav}>
          <button className={styles.calendarNavButton} onClick={handlePrevMonth}>
            ‹
          </button>
          <button className={styles.calendarNavButton} onClick={handleNextMonth}>
            ›
          </button>
        </div>
      </div>

      <div className={styles.calendarGrid}>
        {WEEKDAYS.map((day) => (
          <div key={day} className={styles.calendarWeekday}>
            {day}
          </div>
        ))}
        {calendarDays.map((day, index) => {
          const isSelected = selectedDate &&
            day.fullDate.getDate() === selectedDate.getDate() &&
            day.fullDate.getMonth() === selectedDate.getMonth() &&
            day.fullDate.getFullYear() === selectedDate.getFullYear();

          return (
            <button
              key={index}
              className={`${styles.calendarDay} ${
                !day.isCurrentMonth ? styles.otherMonth : ''
              } ${day.isToday ? styles.today : ''} ${
                isSelected ? styles.selected : ''
              }`}
              onClick={() => handleDayClick(day.fullDate)}
            >
              {day.date}
            </button>
          );
        })}
      </div>

      <div className={styles.calendarScheduleLink}>
        <button className={styles.scheduleButton} onClick={handleGoToSchedule}>
          {selectedDate ? 'Открыть сетку на выбранную дату' : 'Открыть сетку на сегодня'}
        </button>
      </div>
    </div>
  );
}
