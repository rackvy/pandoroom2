import { useState, useEffect, useCallback } from 'react';
import { getBranches, type Branch } from '../../api/catalog';
import { getVRSchedule, cancelVRReservation, deleteVRReservation, type VRHallWithSchedule, type VRReservation } from '../../api/vrSchedule';
import { formatDateForApi, addDays } from '../../components/schedule/timeUtils';
import { toast } from '../../components/ui/Toast';
import VRBookingModal from '../../components/schedule/VRBookingModal';
import styles from './VRSchedulePage.module.css';

// Generate time slots from 10:00 to 23:30 every 30 minutes
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 10; h < 24; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatApiTime(value: string): string {
  // Backend returns ISO DateTime like "1970-01-01T10:00:00.000Z" or similar
  // Extract HH:MM from it
  if (!value) return '';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      // Try parsing as time string directly
      return value.substring(0, 5);
    }
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  } catch {
    return value.substring(0, 5);
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'confirmed': return 'Подтверждена';
    case 'canceled': return 'Отменена';
    case 'draft': return 'Черновик';
    case 'done': return 'Завершена';
    default: return status;
  }
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'confirmed': return styles.statusConfirmed;
    case 'canceled': return styles.statusCanceled;
    case 'draft': return styles.statusDraft;
    case 'done': return styles.statusDone;
    default: return '';
  }
}

export default function VRSchedulePage() {
  const [date, setDate] = useState<Date>(new Date());
  const [branchId, setBranchId] = useState<string>('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [halls, setHalls] = useState<VRHallWithSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDefaults, setBookingDefaults] = useState<{ hallId?: string; startTime?: string }>({});

  // Popover state
  const [popoverReservation, setPopoverReservation] = useState<VRReservation | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    getBranches()
      .then(data => {
        setBranches(data);
        if (data.length > 0 && !branchId) {
          setBranchId(data[0].id);
        }
      })
      .catch(console.error);
  }, []);

  const loadSchedule = useCallback(async () => {
    if (!branchId) return;
    setIsLoading(true);
    try {
      const dateStr = formatDateForApi(date);
      const data = await getVRSchedule(branchId, dateStr);
      setHalls(data);
    } catch (err) {
      console.error(err);
      toast.error('Не удалось загрузить расписание');
    } finally {
      setIsLoading(false);
    }
  }, [date, branchId]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const handleCellClick = (hallId: string, timeSlot: string) => {
    setBookingDefaults({ hallId, startTime: timeSlot });
    setShowBookingModal(true);
  };

  const handleReservationClick = (e: React.MouseEvent, reservation: VRReservation) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setPopoverPos({
      top: Math.min(rect.bottom + 8, window.innerHeight - 300),
      left: Math.min(rect.left, window.innerWidth - 380),
    });
    setPopoverReservation(reservation);
  };

  const handleCancelReservation = async (id: string) => {
    if (!confirm('Отменить эту бронь?')) return;
    try {
      await cancelVRReservation(id);
      toast.success('Бронь отменена');
      setPopoverReservation(null);
      loadSchedule();
    } catch {
      toast.error('Ошибка отмены брони');
    }
  };

  const handleDeleteReservation = async (id: string) => {
    if (!confirm('Удалить эту бронь?')) return;
    try {
      await deleteVRReservation(id);
      toast.success('Бронь удалена');
      setPopoverReservation(null);
      loadSchedule();
    } catch {
      toast.error('Ошибка удаления брони');
    }
  };

  // Find reservations that overlap with a given time slot
  const getReservationsForSlot = (hall: VRHallWithSchedule, slotTime: string): VRReservation[] => {
    const slotMinutes = timeToMinutes(slotTime);
    const slotEndMinutes = slotMinutes + 30;

    return hall.reservations.filter((r) => {
      const rStart = timeToMinutes(formatApiTime(r.startTime));
      const rEnd = timeToMinutes(formatApiTime(r.endTime));
      return rStart < slotEndMinutes && rEnd > slotMinutes;
    });
  };

  // Check if a reservation starts at this slot (for rendering the block)
  const reservationStartsAtSlot = (reservation: VRReservation, slotTime: string): boolean => {
    const rStart = timeToMinutes(formatApiTime(reservation.startTime));
    const slotMinutes = timeToMinutes(slotTime);
    return rStart >= slotMinutes && rStart < slotMinutes + 30;
  };

  // Calculate how many slots a reservation spans
  const getReservationSpan = (reservation: VRReservation): number => {
    const rStart = timeToMinutes(formatApiTime(reservation.startTime));
    const rEnd = timeToMinutes(formatApiTime(reservation.endTime));
    const durationMinutes = rEnd - rStart;
    return Math.max(1, Math.ceil(durationMinutes / 30));
  };

  const selectedBranch = branches.find(b => b.id === branchId);

  const dateButtons = [
    { label: 'Сегодня', date: new Date() },
    { label: '+1 день', date: addDays(new Date(), 1) },
    { label: '+2 дня', date: addDays(new Date(), 2) },
    { label: '+3 дня', date: addDays(new Date(), 3) },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>VR Сетка</h2>

        <div className={styles.controls}>
          <div className={styles.datePicker}>
            {dateButtons.map((btn, index) => (
              <button
                key={index}
                className={`${styles.dateButton} ${formatDateForApi(date) === formatDateForApi(btn.date) ? styles.active : ''}`}
                onClick={() => setDate(btn.date)}
              >
                {btn.label}
              </button>
            ))}
            <input
              type="date"
              className={styles.dateInput}
              value={formatDateForApi(date)}
              onChange={(e) => setDate(new Date(e.target.value))}
            />
          </div>

          <select
            className={styles.branchSelect}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">Выберите филиал</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>

          <button
            className={styles.addButton}
            onClick={() => {
              setBookingDefaults({});
              setShowBookingModal(true);
            }}
          >
            + Новая бронь
          </button>
        </div>
      </div>

      <div className={styles.gridContainer}>
        {!branchId ? (
          <div className={styles.emptyState}>
            <p>Выберите филиал для просмотра расписания</p>
          </div>
        ) : selectedBranch && !selectedBranch.hasVR ? (
          <div className={styles.emptyState}>
            <p>В этом филиале нет VR зоны</p>
          </div>
        ) : isLoading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : halls.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Нет VR залов</p>
            <p>Добавьте VR залы в настройках</p>
          </div>
        ) : (
          <table className={styles.scheduleTable}>
            <thead>
              <tr>
                <th>Время</th>
                {halls.map(hall => (
                  <th key={hall.id}>{hall.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slot) => (
                <tr key={slot}>
                  <td className={slot.endsWith(':30') ? styles.timeSlotHalf : ''}>{slot}</td>
                  {halls.map((hall) => {
                    const slotReservations = getReservationsForSlot(hall, slot);
                    const startingHere = slotReservations.filter(r => reservationStartsAtSlot(r, slot));

                    if (startingHere.length > 0) {
                      const r = startingHere[0];
                      const span = getReservationSpan(r);
                      const isCanceled = r.status === 'canceled';
                      const blockClass = isCanceled
                        ? styles.canceled
                        : r.type === 'full_hall'
                          ? styles.fullHall
                          : styles.openSlot;

                      const displayName = r.type === 'full_hall'
                        ? (r.clientName || 'Выкуп зала')
                        : (r.title || r.game?.name || 'Свободный слот');

                      return (
                        <td
                          key={hall.id}
                          rowSpan={span}
                          style={{ padding: '2px' }}
                        >
                          <div
                            className={`${styles.reservationBlock} ${blockClass}`}
                            style={{ height: `${span * 40 - 4}px` }}
                            onClick={(e) => handleReservationClick(e, r)}
                          >
                            <span className={styles.reservationTitle}>{displayName}</span>
                            <span className={styles.reservationTime}>
                              {formatApiTime(r.startTime)} - {formatApiTime(r.endTime)}
                            </span>
                          </div>
                        </td>
                      );
                    }

                    // Check if this cell is covered by a reservation that started in an earlier slot
                    const coveredByEarlier = slotReservations.some(r => !reservationStartsAtSlot(r, slot));
                    if (coveredByEarlier) {
                      return null; // This cell is covered by a rowSpan from an earlier slot
                    }

                    return (
                      <td key={hall.id}>
                        <div
                          className={styles.emptyCell}
                          onClick={() => handleCellClick(hall.id, slot)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Booking Modal */}
      <VRBookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        onSuccess={loadSchedule}
        halls={halls}
        defaultHallId={bookingDefaults.hallId}
        defaultDate={formatDateForApi(date)}
        defaultStartTime={bookingDefaults.startTime}
      />

      {/* Reservation Popover */}
      {popoverReservation && (
        <>
          <div className={styles.popoverOverlay} onClick={() => setPopoverReservation(null)} />
          <div
            className={styles.popover}
            style={{ top: popoverPos.top, left: popoverPos.left }}
          >
            <h4 className={styles.popoverTitle}>
              {popoverReservation.type === 'full_hall'
                ? (popoverReservation.clientName || 'Выкуп зала')
                : (popoverReservation.title || popoverReservation.game?.name || 'Свободный слот')}
            </h4>

            <div className={styles.popoverRow}>
              <span className={styles.popoverLabel}>Тип:</span>
              <span className={styles.popoverValue}>
                {popoverReservation.type === 'full_hall' ? 'Выкуп зала' : 'Свободный слот'}
              </span>
            </div>

            <div className={styles.popoverRow}>
              <span className={styles.popoverLabel}>Время:</span>
              <span className={styles.popoverValue}>
                {formatApiTime(popoverReservation.startTime)} - {formatApiTime(popoverReservation.endTime)}
              </span>
            </div>

            <div className={styles.popoverRow}>
              <span className={styles.popoverLabel}>Статус:</span>
              <span className={`${styles.statusBadge} ${getStatusClass(popoverReservation.status)}`}>
                {getStatusLabel(popoverReservation.status)}
              </span>
            </div>

            {popoverReservation.clientName && (
              <div className={styles.popoverRow}>
                <span className={styles.popoverLabel}>Клиент:</span>
                <span className={styles.popoverValue}>{popoverReservation.clientName}</span>
              </div>
            )}

            {popoverReservation.clientPhone && (
              <div className={styles.popoverRow}>
                <span className={styles.popoverLabel}>Телефон:</span>
                <span className={styles.popoverValue}>{popoverReservation.clientPhone}</span>
              </div>
            )}

            {popoverReservation.guestsCount > 0 && (
              <div className={styles.popoverRow}>
                <span className={styles.popoverLabel}>Гостей:</span>
                <span className={styles.popoverValue}>{popoverReservation.guestsCount}</span>
              </div>
            )}

            {popoverReservation.game && (
              <div className={styles.popoverRow}>
                <span className={styles.popoverLabel}>Игра:</span>
                <span className={styles.popoverValue}>{popoverReservation.game.name}</span>
              </div>
            )}

            {popoverReservation.description && (
              <div className={styles.popoverRow}>
                <span className={styles.popoverLabel}>Описание:</span>
                <span className={styles.popoverValue}>{popoverReservation.description}</span>
              </div>
            )}

            <div className={styles.popoverActions}>
              {popoverReservation.status !== 'canceled' && (
                <button
                  className={`${styles.popoverBtn} ${styles.cancelBtn}`}
                  onClick={() => handleCancelReservation(popoverReservation.id)}
                >
                  Отменить
                </button>
              )}
              <button
                className={`${styles.popoverBtn} ${styles.deleteBtn}`}
                onClick={() => handleDeleteReservation(popoverReservation.id)}
              >
                Удалить
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
