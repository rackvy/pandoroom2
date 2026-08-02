import { useState, useEffect, useCallback } from 'react';
import { useBranchSelection } from '../../hooks/useBranchSelection';
import { getVRSchedule, createVRReservation, confirmVRReservation, cancelVRReservation, deleteVRReservation, type VRHallWithSchedule, type VRReservation } from '../../api/vrSchedule';
import { formatDateForApi, addDays } from '../../components/schedule/timeUtils';
import { toast } from '../../components/ui/Toast';
import { confirm } from '../../components/ui/ConfirmDialog';
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

function add30Min(t: string): string {
  const total = timeToMinutes(t) + 30;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
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
    case 'draft': return 'Ждёт подтверждения';
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
  const { branches, branchId, setBranchId } = useBranchSelection();
  const [halls, setHalls] = useState<VRHallWithSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDefaults, setBookingDefaults] = useState<{ hallId?: string; startTime?: string }>({});

  // Popover state
  const [popoverReservation, setPopoverReservation] = useState<VRReservation | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

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

  const handleQuickBlock = async (e: React.MouseEvent, hall: VRHallWithSchedule, slot: string) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Заблокировать 30 минут',
      message: `Заблокировать зал «${hall.name}» в ${slot}? На это время нельзя будет оформить бронь (например, чтобы протереть шлемы после большой компании).`,
      confirmText: 'Заблокировать',
      type: 'warning',
    });
    if (!ok) return;
    try {
      await createVRReservation({
        hallId: hall.id,
        date: formatDateForApi(date),
        startTime: slot,
        endTime: add30Min(slot),
        type: 'blocked',
      });
      toast.success('Время заблокировано');
      loadSchedule();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Не удалось заблокировать время');
    }
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

  const handleConfirmReservation = async (id: string) => {
    try {
      await confirmVRReservation(id);
      toast.success('Бронь подтверждена');
      setPopoverReservation(null);
      loadSchedule();
    } catch {
      toast.error('Ошибка подтверждения брони');
    }
  };

  const handleCancelReservation = async (id: string) => {
    const isBlocked = popoverReservation?.type === 'blocked';
    const ok = await confirm({
      title: isBlocked ? 'Снять блокировку' : 'Отменить бронь',
      message: isBlocked
        ? 'Снять блокировку с этого времени? Слот снова станет доступным для бронирования.'
        : 'Отменить эту бронь? Время станет доступным для других гостей.',
      confirmText: isBlocked ? 'Снять блокировку' : 'Отменить бронь',
      type: 'warning',
    });
    if (!ok) return;
    try {
      await cancelVRReservation(id);
      toast.success(isBlocked ? 'Блокировка снята' : 'Бронь отменена');
      setPopoverReservation(null);
      loadSchedule();
    } catch {
      toast.error('Ошибка отмены брони');
    }
  };

  const handleDeleteReservation = async (id: string) => {
    const ok = await confirm({
      title: 'Удалить бронь',
      message: 'Удалить эту бронь безвозвратно?',
      confirmText: 'Удалить',
      type: 'danger',
    });
    if (!ok) return;
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

  // Free seats in a slot considering shared capacity and blocks
  const getFreeForSlot = (hall: VRHallWithSchedule, slotTime: string): { free: number; blocked: boolean } => {
    const active = getReservationsForSlot(hall, slotTime).filter((r) => r.status !== 'canceled');
    if (active.some((r) => r.type === 'blocked')) {
      return { free: 0, blocked: true };
    }
    const taken = active.reduce((sum, r) => sum + r.guestsCount, 0);
    return { free: Math.max(0, hall.maxCapacity - taken), blocked: false };
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
  const popoverHall = popoverReservation ? halls.find(h => h.id === popoverReservation.hallId) : null;

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
                  <th key={hall.id}>{hall.name}<span className={styles.hallCapacity}> / {hall.maxCapacity} мест</span></th>
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
                      const isBlocked = r.type === 'blocked';
                      const isCanceled = r.status === 'canceled';
                      const blockClass = isCanceled
                        ? styles.canceled
                        : isBlocked
                          ? styles.blockedSlot
                          : r.type === 'full_hall'
                            ? styles.fullHall
                            : styles.openSlot;

                      const displayName = isBlocked
                        ? (r.title ? `🔒 ${r.title}` : '🔒 Заблокировано')
                        : r.type === 'full_hall'
                          ? (r.clientName || 'Выкуп зала')
                          : (r.clientName || r.title || r.game?.name || 'Бронь');

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
                              {!isBlocked && !isCanceled && ` · ${r.guestsCount}/${hall.maxCapacity}`}
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

                    const { free } = getFreeForSlot(hall, slot);

                    return (
                      <td key={hall.id}>
                        <div
                          className={styles.emptyCell}
                          onClick={() => handleCellClick(hall.id, slot)}
                          title={`Свободно ${free} из ${hall.maxCapacity} мест`}
                        >
                          <span className={free === 0 ? `${styles.freeCount} ${styles.freeCountZero}` : styles.freeCount}>
                            {free}
                          </span>
                          <button
                            type="button"
                            className={styles.lockBtn}
                            title="Заблокировать 30 минут"
                            onClick={(e) => handleQuickBlock(e, hall, slot)}
                          >
                            🔒
                          </button>
                        </div>
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
              {popoverReservation.type === 'blocked'
                ? (popoverReservation.title ? `🔒 ${popoverReservation.title}` : '🔒 Время заблокировано')
                : popoverReservation.type === 'full_hall'
                  ? (popoverReservation.clientName || 'Выкуп зала')
                  : (popoverReservation.clientName || popoverReservation.title || popoverReservation.game?.name || 'Бронь')}
            </h4>

            <div className={styles.popoverRow}>
              <span className={styles.popoverLabel}>Тип:</span>
              <span className={styles.popoverValue}>
                {popoverReservation.type === 'blocked'
                  ? 'Блокировка (30 мин)'
                  : popoverReservation.type === 'full_hall'
                    ? 'Выкуп зала'
                    : 'Бронирование мест'}
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

            {popoverReservation.type !== 'blocked' && popoverHall && (
              <div className={styles.popoverRow}>
                <span className={styles.popoverLabel}>Гостей:</span>
                <span className={styles.popoverValue}>
                  {popoverReservation.guestsCount} из {popoverHall.maxCapacity}
                </span>
              </div>
            )}

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

            {popoverReservation.game && (
              <div className={styles.popoverRow}>
                <span className={styles.popoverLabel}>Игра (со страницы):</span>
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
              {popoverReservation.status === 'draft' && (
                <button
                  className={`${styles.popoverBtn} ${styles.confirmBtn}`}
                  onClick={() => handleConfirmReservation(popoverReservation.id)}
                >
                  Подтвердить
                </button>
              )}
              {popoverReservation.status !== 'canceled' && (
                <button
                  className={`${styles.popoverBtn} ${styles.cancelBtn}`}
                  onClick={() => handleCancelReservation(popoverReservation.id)}
                >
                  {popoverReservation.type === 'blocked' ? 'Снять' : 'Отменить'}
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
