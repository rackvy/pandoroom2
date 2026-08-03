import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBranchSelection } from '../../hooks/useBranchSelection';
import {
  getVRSchedule,
  createVRReservation,
  updateVRReservation,
  confirmVRReservation,
  cancelVRReservation,
  deleteVRReservation,
  type VRHallWithSchedule,
  type VRReservation,
} from '../../api/vrSchedule';
import { getVRGames, type VRGame } from '../../api/catalog';
import {
  formatDateForApi,
  addDays,
  formatDateDisplay,
} from '../../components/schedule/timeUtils';
import { toast } from '../../components/ui/Toast';
import { confirm } from '../../components/ui/ConfirmDialog';
import styles from './VRSchedulePage.module.css';

const DAY_START_HOUR = 10;
const DAY_END_HOUR = 24;
const SLOT_STEP = 30;

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
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

function addMinutes(t: string, minutes: number): string {
  const total = timeToMinutes(t) + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function formatApiTime(value: string): string {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value.substring(0, 5);
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  } catch {
    return value.substring(0, 5);
  }
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('7')) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  }
  if (digits.length === 11 && digits.startsWith('8')) {
    return `8 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  }
  return value;
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

function getTypeLabel(type: string): string {
  switch (type) {
    case 'full_hall': return 'Выкуп зала';
    case 'blocked': return 'Блокировка';
    default: return 'Бронь мест';
  }
}

interface SlotState {
  occupied: number;
  free: number;
  blocked: boolean;
  reservations: VRReservation[];
}

function getSlotState(hall: VRHallWithSchedule, slotTime: string): SlotState {
  const slotMinutes = timeToMinutes(slotTime);
  const slotEndMinutes = slotMinutes + SLOT_STEP;

  const reservations = hall.reservations.filter((r) => {
    if (r.status === 'canceled') return false;
    const rStart = timeToMinutes(formatApiTime(r.startTime));
    const rEnd = timeToMinutes(formatApiTime(r.endTime));
    return rStart < slotEndMinutes && rEnd > slotMinutes;
  });

  if (reservations.some((r) => r.type === 'blocked')) {
    return { occupied: hall.maxCapacity, free: 0, blocked: true, reservations };
  }

  const occupied = reservations.reduce((sum, r) => sum + r.guestsCount, 0);
  return { occupied, free: Math.max(0, hall.maxCapacity - occupied), blocked: false, reservations };
}

function occupancyRatio(state: SlotState, hall: VRHallWithSchedule): number {
  if (hall.maxCapacity === 0) return 0;
  return state.occupied / hall.maxCapacity;
}

type PanelMode = 'slot' | 'create' | 'edit' | 'details';

interface PanelState {
  open: boolean;
  mode: PanelMode;
  hallId?: string;
  slot?: string;
  reservationId?: string;
}

type BookingType = 'open_slot' | 'full_hall' | 'blocked';

const emptyForm = {
  type: 'open_slot' as BookingType,
  hallId: '',
  date: '',
  startTime: '',
  endTime: '',
  clientName: '',
  clientPhone: '',
  guestsCount: 1,
  gameId: '',
  description: '',
};

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDates(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function formatShortWeekday(date: Date): string {
  return date.toLocaleDateString('ru-RU', { weekday: 'short' });
}

function formatDay(date: Date): string {
  return String(date.getDate());
}

export default function VRSchedulePage() {
  const [date, setDate] = useState<Date>(new Date());
  const { branches, branchId, setBranchId } = useBranchSelection();
  const [halls, setHalls] = useState<VRHallWithSchedule[]>([]);
  const [games, setGames] = useState<VRGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedHallId, setSelectedHallId] = useState<string>('');
  const [view, setView] = useState<'day' | 'week'>('day');
  const [weekData, setWeekData] = useState<Record<string, VRHallWithSchedule>>({});
  const [panel, setPanel] = useState<PanelState>({ open: false, mode: 'slot' });
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const selectedBranch = branches.find((b) => b.id === branchId);
  const selectedHall = useMemo(
    () => halls.find((h) => h.id === selectedHallId),
    [halls, selectedHallId],
  );

  const loadSchedule = useCallback(async () => {
    if (!branchId) return;
    setIsLoading(true);
    try {
      const [scheduleData, gamesData] = await Promise.all([
        getVRSchedule(branchId, formatDateForApi(date)),
        getVRGames(),
      ]);
      setHalls(scheduleData);
      setGames(gamesData.filter((g) => g.isActive));
    } catch (err) {
      console.error(err);
      toast.error('Не удалось загрузить расписание');
    } finally {
      setIsLoading(false);
    }
  }, [date, branchId]);

  const loadWeekSchedule = useCallback(async () => {
    if (!branchId || !selectedHallId || view !== 'week') return;
    setIsLoading(true);
    try {
      const weekDates = getWeekDates(date);
      const entries = await Promise.all(
        weekDates.map((d) => getVRSchedule(branchId, formatDateForApi(d))),
      );
      const map: Record<string, VRHallWithSchedule> = {};
      entries.forEach((dayHalls, idx) => {
        const hall = dayHalls.find((h) => h.id === selectedHallId);
        if (hall) {
          map[formatDateForApi(weekDates[idx])] = hall;
        }
      });
      setWeekData(map);
    } catch (err) {
      console.error(err);
      toast.error('Не удалось загрузить недельное расписание');
    } finally {
      setIsLoading(false);
    }
  }, [branchId, date, selectedHallId, view]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  useEffect(() => {
    if (view === 'week') {
      loadWeekSchedule();
    }
  }, [view, loadWeekSchedule]);

  useEffect(() => {
    if (halls.length) {
      const exists = halls.some((h) => h.id === selectedHallId);
      if (!exists || !selectedHallId) {
        setSelectedHallId(halls[0].id);
      }
    } else {
      setSelectedHallId('');
    }
  }, [halls, selectedHallId]);

  const closePanel = () => setPanel({ open: false, mode: 'slot' });

  const openSlotPanel = (hallId: string, slot: string) => {
    setPanel({ open: true, mode: 'slot', hallId, slot });
  };

  const openCreatePanel = (hallId: string, slot?: string) => {
    const start = slot || '10:00';
    setForm({
      ...emptyForm,
      hallId,
      date: formatDateForApi(date),
      startTime: start,
      endTime: addMinutes(start, SLOT_STEP),
      guestsCount: 1,
    });
    setPanel({ open: true, mode: 'create', hallId, slot });
  };

  const openDetailsPanel = (reservationId: string) => {
    setPanel({ open: true, mode: 'details', reservationId });
  };

  const openEditPanel = (reservation: VRReservation) => {
    setForm({
      type: reservation.type,
      hallId: reservation.hallId,
      date: formatDateForApi(new Date(reservation.date)),
      startTime: formatApiTime(reservation.startTime),
      endTime: formatApiTime(reservation.endTime),
      clientName: reservation.clientName || '',
      clientPhone: reservation.clientPhone || '',
      guestsCount: reservation.guestsCount,
      gameId: reservation.gameId || '',
      description: reservation.description || '',
    });
    setPanel({ open: true, mode: 'edit', reservationId: reservation.id });
  };

  const handleFormChange = (field: keyof typeof form, value: string | number | BookingType) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'type') {
        const hall = halls.find((h) => h.id === next.hallId);
        if (value === 'blocked' || value === 'full_hall') {
          next.guestsCount = hall ? hall.maxCapacity : 1;
        } else if (prev.type === 'blocked' || prev.type === 'full_hall') {
          next.guestsCount = 1;
        }
      }
      if (field === 'hallId') {
        const hall = halls.find((h) => h.id === value);
        if (next.type === 'blocked' || next.type === 'full_hall') {
          next.guestsCount = hall ? hall.maxCapacity : 1;
        }
      }
      return next;
    });
  };

  const validateForm = () => {
    if (!form.hallId) return 'Выберите зал';
    if (!form.date) return 'Укажите дату';
    if (!form.startTime || !form.endTime) return 'Укажите время';
    if (timeToMinutes(form.endTime) <= timeToMinutes(form.startTime)) return 'Время окончания должно быть позже начала';
    if (form.type === 'open_slot' && (form.clientName.trim() || form.clientPhone.trim()) && !form.clientPhone.trim()) {
      return 'Укажите телефон клиента';
    }
    return null;
  };

  const submitForm = async () => {
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...form,
        guestsCount: Number(form.guestsCount),
        gameId: form.gameId || undefined,
        description: form.description || undefined,
      };

      if (panel.mode === 'edit' && panel.reservationId) {
        await updateVRReservation(panel.reservationId, payload);
        toast.success('Бронь обновлена');
      } else {
        await createVRReservation(payload);
        toast.success('Бронь создана');
      }
      closePanel();
      loadSchedule();
      if (view === 'week') loadWeekSchedule();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Не удалось сохранить бронь');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickBlock = async (hall: VRHallWithSchedule, slot: string) => {
    const ok = await confirm({
      title: 'Заблокировать 30 минут',
      message: `Заблокировать зал «${hall.name}» в ${slot}?`,
      confirmText: 'Заблокировать',
      type: 'warning',
    });
    if (!ok) return;
    try {
      await createVRReservation({
        hallId: hall.id,
        date: formatDateForApi(date),
        startTime: slot,
        endTime: addMinutes(slot, SLOT_STEP),
        type: 'blocked',
      });
      toast.success('Время заблокировано');
      loadSchedule();
      if (view === 'week') loadWeekSchedule();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Не удалось заблокировать время');
    }
  };

  const handleConfirmReservation = async (id: string) => {
    try {
      await confirmVRReservation(id);
      toast.success('Бронь подтверждена');
      loadSchedule();
      if (view === 'week') loadWeekSchedule();
    } catch {
      toast.error('Ошибка подтверждения брони');
    }
  };

  const handleCancelReservation = async (reservation: VRReservation) => {
    const isBlocked = reservation.type === 'blocked';
    const ok = await confirm({
      title: isBlocked ? 'Снять блокировку' : 'Отменить бронь',
      message: isBlocked
        ? 'Снять блокировку с этого времени?'
        : 'Отменить эту бронь? Время станет доступным для других гостей.',
      confirmText: isBlocked ? 'Снять' : 'Отменить',
      type: 'warning',
    });
    if (!ok) return;
    try {
      await cancelVRReservation(reservation.id);
      toast.success(isBlocked ? 'Блокировка снята' : 'Бронь отменена');
      closePanel();
      loadSchedule();
      if (view === 'week') loadWeekSchedule();
    } catch {
      toast.error('Ошибка отмены');
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
      closePanel();
      loadSchedule();
      if (view === 'week') loadWeekSchedule();
    } catch {
      toast.error('Ошибка удаления брони');
    }
  };

  const weekDates = useMemo(() => getWeekDates(date), [date]);

  const handlePrev = () => {
    if (view === 'week') {
      setDate(addDays(date, -7));
    } else {
      setDate(addDays(date, -1));
    }
  };

  const handleNext = () => {
    if (view === 'week') {
      setDate(addDays(date, 7));
    } else {
      setDate(addDays(date, 1));
    }
  };

  const handleSelectWeekDay = (d: Date) => setDate(d);

  const panelReservation = useMemo(() => {
    if (panel.mode !== 'details' && panel.mode !== 'edit') return undefined;
    return halls.flatMap((h) => h.reservations).find((r) => r.id === panel.reservationId);
  }, [panel, halls]);

  const panelSlotState = useMemo(() => {
    if (panel.mode !== 'slot' || !panel.hallId || !panel.slot) return undefined;
    const hall = halls.find((h) => h.id === panel.hallId);
    if (!hall) return undefined;
    return { hall, state: getSlotState(hall, panel.slot) };
  }, [panel, halls]);

  const dayBookings = useMemo(() => {
    if (!selectedHall) return [];
    return selectedHall.reservations
      .filter((r) => r.status !== 'canceled')
      .slice()
      .sort((a, b) => timeToMinutes(formatApiTime(a.startTime)) - timeToMinutes(formatApiTime(b.startTime)));
  }, [selectedHall]);

  function getStatusClass(status: string): string {
    switch (status) {
      case 'confirmed': return styles.statusConfirmed;
      case 'canceled': return styles.statusCanceled;
      case 'draft': return styles.statusDraft;
      case 'done': return styles.statusDone;
      default: return '';
    }
  }

  const renderSegmentedBar = (hall: VRHallWithSchedule, state: SlotState) => {
    const capacity = hall.maxCapacity || 0;
    const segments = Array.from({ length: capacity }, (_, i) => {
      let cls = styles.segmentFree;
      if (state.blocked) {
        cls = styles.segmentBlocked;
      } else if (i < state.occupied) {
        cls = state.free === 0 ? styles.segmentFull : styles.segmentPartial;
      }
      return <div key={i} className={`${styles.segment} ${cls}`} />;
    });
    return <div className={styles.segmentedBar}>{segments}</div>;
  };

  const renderSlotStatusText = (state: SlotState, hall: VRHallWithSchedule) => {
    if (state.blocked) return <span className={styles.statusBlocked}>Заблокировано</span>;
    if (state.occupied === 0) return <span className={styles.statusFree}>Свободно {hall.maxCapacity} мест</span>;
    if (state.free === 0) return <span className={styles.statusFull}>Полностью занято</span>;
    return <span className={styles.statusPartial}>Занято {state.occupied} из {hall.maxCapacity}</span>;
  };

  const renderLegend = () => (
    <div className={styles.legend}>
      <div className={styles.legendItem}>
        <div className={`${styles.legendDot} ${styles.legendFree}`} />
        <span>Свободно</span>
      </div>
      <div className={styles.legendItem}>
        <div className={`${styles.legendDot} ${styles.legendPartial}`} />
        <span>Частично занято</span>
      </div>
      <div className={styles.legendItem}>
        <div className={`${styles.legendDot} ${styles.legendFull}`} />
        <span>Полностью занято</span>
      </div>
      <div className={styles.legendItem}>
        <div className={`${styles.legendDot} ${styles.legendBlocked}`} />
        <span>Блокировка</span>
      </div>
    </div>
  );

  const renderHallTabs = () => (
    <div className={styles.tabs}>
      {halls.map((hall) => (
        <button
          key={hall.id}
          className={`${styles.tab} ${selectedHallId === hall.id ? styles.tabActive : ''}`}
          onClick={() => setSelectedHallId(hall.id)}
        >
          <span>{hall.name}</span>
          <span className={styles.tabCapacity}>{hall.maxCapacity} мест</span>
        </button>
      ))}
    </div>
  );

  const renderMiniCalendar = () => (
    <div className={styles.miniCalendar}>
      <button className={styles.miniNav} onClick={handlePrev} title="Назад">
        ‹
      </button>
      {weekDates.map((d) => {
        const iso = formatDateForApi(d);
        const active = iso === formatDateForApi(date);
        return (
          <button
            key={iso}
            className={`${styles.miniDay} ${active ? styles.miniDayActive : ''}`}
            onClick={() => handleSelectWeekDay(d)}
          >
            <span className={styles.miniWeekday}>{formatShortWeekday(d)}</span>
            <span className={styles.miniDate}>{formatDay(d)}</span>
          </button>
        );
      })}
      <button className={styles.miniNav} onClick={handleNext} title="Вперёд">
        ›
      </button>
    </div>
  );

  const renderCapacityHeader = () => {
    if (!selectedHall) return null;
    const totalSeats = selectedHall.maxCapacity;
    const peakOccupied = TIME_SLOTS.reduce((max, slot) => {
      const s = getSlotState(selectedHall, slot);
      return Math.max(max, s.blocked ? totalSeats : s.occupied);
    }, 0);
    const free = totalSeats - peakOccupied;
    return (
      <div className={styles.capacityHeader}>
        <div className={styles.capacityInfo}>
          <h2 className={styles.capacityTitle}>{selectedHall.name}</h2>
          <span className={styles.capacitySubtitle}>Вместимость зала</span>
        </div>
        <div className={styles.capacityStats}>
          <div className={styles.capacityStat}>
            <span className={styles.capacityValue}>{totalSeats}</span>
            <span className={styles.capacityLabel}>всего мест</span>
          </div>
          <div className={styles.capacityDivider} />
          <div className={styles.capacityStat}>
            <span className={styles.capacityValue}>{free}</span>
            <span className={styles.capacityLabel}>свободно</span>
          </div>
          <div className={styles.capacityDivider} />
          <div className={styles.capacityStat}>
            <span className={styles.capacityValue}>{peakOccupied}</span>
            <span className={styles.capacityLabel}>пиковая загрузка</span>
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    if (!selectedHall) return null;
    return (
      <div className={styles.dayView}>
        {renderCapacityHeader()}
        {renderLegend()}
        <div className={styles.slotsTable}>
          {TIME_SLOTS.map((slot) => {
            const state = getSlotState(selectedHall, slot);
            const ratio = occupancyRatio(state, selectedHall);
            return (
              <div
                key={slot}
                className={`${styles.slotRow} ${state.blocked ? styles.slotRowBlocked : ''} ${ratio === 1 && !state.blocked ? styles.slotRowFull : ''}`}
                onClick={() => openSlotPanel(selectedHall.id, slot)}
              >
                <div className={styles.slotTime}>{slot}</div>
                <div className={styles.slotBarCell}>
                  {renderSegmentedBar(selectedHall, state)}
                </div>
                <div className={styles.slotStatus}>{renderSlotStatusText(state, selectedHall)}</div>
                {!state.blocked && state.free > 0 && (
                  <button
                    type="button"
                    className={styles.slotBlockBtn}
                    title="Заблокировать"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickBlock(selectedHall, slot);
                    }}
                  >
                    🔒
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    if (!selectedHall) return null;
    return (
      <div className={styles.weekView}>
        <div className={styles.weekTableWrapper}>
          <table className={styles.weekTable}>
            <thead>
              <tr>
                <th className={styles.weekTimeHeader}>Время</th>
                {weekDates.map((d) => (
                  <th
                    key={formatDateForApi(d)}
                    className={`${styles.weekDayHeader} ${formatDateForApi(d) === formatDateForApi(date) ? styles.weekDayHeaderActive : ''}`}
                  >
                    <div>{formatShortWeekday(d)}</div>
                    <div className={styles.weekDayNumber}>{formatDay(d)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slot) => (
                <tr key={slot}>
                  <td className={styles.weekTimeCell}>{slot}</td>
                  {weekDates.map((d) => {
                    const iso = formatDateForApi(d);
                    const hall = weekData[iso];
                    const state = hall ? getSlotState(hall, slot) : { occupied: 0, free: 0, blocked: false, reservations: [] };
                    const ratio = hall ? occupancyRatio(state, hall) : 0;
                    const cellClass = state.blocked
                      ? styles.weekCellBlocked
                      : ratio === 0
                        ? styles.weekCellEmpty
                        : ratio < 1
                          ? styles.weekCellPartial
                          : styles.weekCellFull;
                    return (
                      <td
                        key={iso}
                        className={`${styles.weekCell} ${cellClass}`}
                        onClick={() => {
                          if (hall) {
                            setDate(d);
                            openSlotPanel(hall.id, slot);
                          }
                        }}
                      >
                        <div className={styles.weekCellBar}>
                          {hall && renderSegmentedBar(hall, state)}
                        </div>
                        <div className={styles.weekCellLabel}>
                          {state.blocked ? 'Блок' : `${state.occupied}/${hall ? hall.maxCapacity : selectedHall.maxCapacity}`}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderBookingsTable = () => {
    if (!selectedHall || dayBookings.length === 0) return null;
    return (
      <div className={styles.bookingsSection}>
        <h3 className={styles.bookingsTitle}>Брони на {formatDateDisplay(date)}</h3>
        <div className={styles.bookingsTableWrapper}>
          <table className={styles.bookingsTable}>
            <thead>
              <tr>
                <th>Время</th>
                <th>Клиент / Тип</th>
                <th>Игра</th>
                <th>Гости</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {dayBookings.map((r) => (
                <tr key={r.id} className={styles.bookingRow} onClick={() => openDetailsPanel(r.id)}>
                  <td>{formatApiTime(r.startTime)} – {formatApiTime(r.endTime)}</td>
                  <td>
                    <div className={styles.bookingClient}>
                      {r.type === 'blocked'
                        ? (r.title || 'Блокировка')
                        : (r.clientName || r.title || 'Бронь')}
                    </div>
                    <div className={styles.bookingType}>{getTypeLabel(r.type)}</div>
                  </td>
                  <td>{r.game?.name || '—'}</td>
                  <td>{r.type === 'blocked' ? '—' : `${r.guestsCount} чел`}</td>
                  <td>
                    <span className={`${styles.badge} ${getStatusClass(r.status)}`}>
                      {getStatusLabel(r.status)}
                    </span>
                  </td>
                  <td>
                    <div className={styles.bookingActions}>
                      {r.status === 'draft' && (
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.actionBtnSuccess}`}
                          onClick={(e) => { e.stopPropagation(); handleConfirmReservation(r.id); }}
                        >
                          Подтвердить
                        </button>
                      )}
                      {r.status !== 'canceled' && (
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.actionBtnWarning}`}
                          onClick={(e) => { e.stopPropagation(); handleCancelReservation(r); }}
                        >
                          {r.type === 'blocked' ? 'Снять' : 'Отменить'}
                        </button>
                      )}
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                        onClick={(e) => { e.stopPropagation(); openEditPanel(r); }}
                      >
                        Изменить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPanelContent = () => {
    if (panel.mode === 'create' || panel.mode === 'edit') {
      const hall = halls.find((h) => h.id === form.hallId);
      const isBlocked = form.type === 'blocked';
      const isFullHall = form.type === 'full_hall';
      const title = panel.mode === 'edit' ? 'Редактировать бронь' : 'Новая бронь';

      return (
        <div className={styles.panelForm}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>{title}</h3>
            <button className={styles.panelClose} onClick={closePanel}>×</button>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Тип</label>
            <div className={styles.segmented}>
              {[
                { value: 'open_slot', label: 'Места' },
                { value: 'full_hall', label: 'Выкуп зала' },
                { value: 'blocked', label: 'Блокировка' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.segment} ${form.type === opt.value ? styles.segmentActive : ''}`}
                  onClick={() => handleFormChange('type', opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Зал</label>
              <select
                className={styles.formSelect}
                value={form.hallId}
                onChange={(e) => handleFormChange('hallId', e.target.value)}
                disabled={isSaving}
              >
                {halls.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Дата</label>
              <input
                type="date"
                className={styles.formInput}
                value={form.date}
                onChange={(e) => handleFormChange('date', e.target.value)}
                disabled={isSaving}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Начало</label>
              <select
                className={styles.formSelect}
                value={form.startTime}
                onChange={(e) => {
                  const start = e.target.value;
                  handleFormChange('startTime', start);
                  if (timeToMinutes(form.endTime) <= timeToMinutes(start)) {
                    handleFormChange('endTime', addMinutes(start, SLOT_STEP));
                  }
                }}
                disabled={isSaving}
              >
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Окончание</label>
              <select
                className={styles.formSelect}
                value={form.endTime}
                onChange={(e) => handleFormChange('endTime', e.target.value)}
                disabled={isSaving}
              >
                {TIME_SLOTS.filter((t) => timeToMinutes(t) > timeToMinutes(form.startTime)).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {!isBlocked && !isFullHall && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Гостей</label>
              <input
                type="number"
                min={1}
                max={hall?.maxCapacity || 20}
                className={styles.formInput}
                value={form.guestsCount}
                onChange={(e) => handleFormChange('guestsCount', Number(e.target.value))}
                disabled={isSaving}
              />
            </div>
          )}

          {!isBlocked && (
            <>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Имя клиента</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={form.clientName}
                    onChange={(e) => handleFormChange('clientName', e.target.value)}
                    disabled={isSaving}
                    placeholder="Имя"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Телефон</label>
                  <input
                    type="tel"
                    className={styles.formInput}
                    value={form.clientPhone}
                    onChange={(e) => handleFormChange('clientPhone', e.target.value)}
                    disabled={isSaving}
                    placeholder="+7 ..."
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Игра</label>
                <select
                  className={styles.formSelect}
                  value={form.gameId}
                  onChange={(e) => handleFormChange('gameId', e.target.value)}
                  disabled={isSaving}
                >
                  <option value="">Не выбрана</option>
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{isBlocked ? 'Причина блокировки' : 'Описание / примечание'}</label>
            <textarea
              className={styles.formTextarea}
              rows={3}
              value={form.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className={styles.panelActions}>
            <button
              className={`${styles.panelBtn} ${styles.panelBtnPrimary}`}
              onClick={submitForm}
              disabled={isSaving}
            >
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
              className={`${styles.panelBtn} ${styles.panelBtnSecondary}`}
              onClick={closePanel}
              disabled={isSaving}
            >
              Отмена
            </button>
          </div>
        </div>
      );
    }

    if (panel.mode === 'details' && panelReservation) {
      const r = panelReservation;
      const hall = halls.find((h) => h.id === r.hallId);
      return (
        <div className={styles.panelDetails}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>{getTypeLabel(r.type)}</h3>
            <button className={styles.panelClose} onClick={closePanel}>×</button>
          </div>

          <div className={`${styles.detailsBadge} ${getStatusClass(r.status)}`}>
            {getStatusLabel(r.status)}
          </div>

          <div className={styles.detailsSection}>
            <div className={styles.detailsRow}>
              <span className={styles.detailsLabel}>Время</span>
              <span className={styles.detailsValue}>
                {formatApiTime(r.startTime)} – {formatApiTime(r.endTime)}
              </span>
            </div>
            <div className={styles.detailsRow}>
              <span className={styles.detailsLabel}>Зал</span>
              <span className={styles.detailsValue}>{hall?.name || r.hallId}</span>
            </div>
            {r.type !== 'blocked' && hall && (
              <div className={styles.detailsRow}>
                <span className={styles.detailsLabel}>Гостей</span>
                <span className={styles.detailsValue}>{r.guestsCount} из {hall.maxCapacity}</span>
              </div>
            )}
          </div>

          {r.clientName && (
            <div className={styles.detailsSection}>
              <div className={styles.detailsRow}>
                <span className={styles.detailsLabel}>Клиент</span>
                <span className={styles.detailsValue}>{r.clientName}</span>
              </div>
              {r.clientPhone && (
                <div className={styles.detailsRow}>
                  <span className={styles.detailsLabel}>Телефон</span>
                  <span className={styles.detailsValue}>{formatPhone(r.clientPhone)}</span>
                </div>
              )}
              {r.client && (
                <div className={styles.detailsRow}>
                  <span className={styles.detailsLabel}>Карточка</span>
                  <span className={styles.detailsValue}>{r.client.name}</span>
                </div>
              )}
            </div>
          )}

          {r.game && (
            <div className={styles.detailsSection}>
              <div className={styles.detailsRow}>
                <span className={styles.detailsLabel}>Игра</span>
                <span className={styles.detailsValue}>{r.game.name}</span>
              </div>
            </div>
          )}

          {r.description && (
            <div className={styles.detailsSection}>
              <div className={styles.detailsRow}>
                <span className={styles.detailsLabel}>Примечание</span>
                <span className={styles.detailsValue}>{r.description}</span>
              </div>
            </div>
          )}

          <div className={styles.panelActions}>
            {r.status === 'draft' && (
              <button
                className={`${styles.panelBtn} ${styles.panelBtnSuccess}`}
                onClick={() => handleConfirmReservation(r.id)}
              >
                Подтвердить
              </button>
            )}
            {r.status !== 'canceled' && (
              <button
                className={`${styles.panelBtn} ${styles.panelBtnWarning}`}
                onClick={() => handleCancelReservation(r)}
              >
                {r.type === 'blocked' ? 'Снять блокировку' : 'Отменить бронь'}
              </button>
            )}
            <button
              className={`${styles.panelBtn} ${styles.panelBtnPrimary}`}
              onClick={() => openEditPanel(r)}
            >
              Изменить
            </button>
            <button
              className={`${styles.panelBtn} ${styles.panelBtnDanger}`}
              onClick={() => handleDeleteReservation(r.id)}
            >
              Удалить
            </button>
          </div>
        </div>
      );
    }

    if (panel.mode === 'slot' && panelSlotState) {
      const { hall, state } = panelSlotState;
      return (
        <div className={styles.panelSlot}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>{panel.slot}</h3>
            <button className={styles.panelClose} onClick={closePanel}>×</button>
          </div>

          <div className={styles.slotSummary}>
            <span className={styles.slotSummaryHall}>{hall.name}</span>
            <span className={styles.slotSummaryCapacity}>
              {state.occupied} / {hall.maxCapacity} мест
            </span>
          </div>

          {!state.blocked && state.free > 0 && (
            <button
              className={`${styles.panelBtn} ${styles.panelBtnPrimary} ${styles.panelBtnFull}`}
              onClick={() => openCreatePanel(hall.id, panel.slot)}
            >
              + Добавить бронь
            </button>
          )}

          {state.blocked && (
            <div className={styles.slotBlockedNote}>Этот слот заблокирован</div>
          )}

          {state.reservations.length > 0 && (
            <div className={styles.slotReservations}>
              <h4 className={styles.slotReservationsTitle}>Брони в этом слоте</h4>
              {state.reservations.map((r) => (
                <div
                  key={r.id}
                  className={`${styles.slotReservationCard} ${r.type === 'blocked' ? styles.slotReservationBlocked : ''}`}
                  onClick={() => openDetailsPanel(r.id)}
                >
                  <div className={styles.slotReservationTop}>
                    <span className={styles.slotReservationName}>
                      {r.type === 'blocked'
                        ? (r.title || 'Блокировка')
                        : (r.clientName || r.title || r.game?.name || 'Бронь')}
                    </span>
                    <span className={`${styles.slotReservationStatus} ${getStatusClass(r.status)}`}>
                      {getStatusLabel(r.status)}
                    </span>
                  </div>
                  <div className={styles.slotReservationMeta}>
                    {formatApiTime(r.startTime)} – {formatApiTime(r.endTime)}
                    {r.type !== 'blocked' && ` · ${r.guestsCount} чел`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>VR-расписание</h1>
          <span className={styles.dateDisplay}>{formatDateDisplay(date)}</span>
        </div>

        <div className={styles.controls}>
          <select
            className={styles.branchSelect}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">Выберите филиал</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>

          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${view === 'day' ? styles.viewBtnActive : ''}`}
              onClick={() => setView('day')}
            >
              День
            </button>
            <button
              className={`${styles.viewBtn} ${view === 'week' ? styles.viewBtnActive : ''}`}
              onClick={() => setView('week')}
            >
              Неделя
            </button>
          </div>

          <button
            className={styles.addButton}
            onClick={() => {
              if (selectedHall) openCreatePanel(selectedHall.id);
            }}
            disabled={!selectedHall}
          >
            + Новая бронь
          </button>
        </div>
      </div>

      {renderHallTabs()}

      <div className={styles.content}>
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
          <>
            {renderMiniCalendar()}
            {view === 'day' ? renderDayView() : renderWeekView()}
            {view === 'day' && renderBookingsTable()}
          </>
        )}
      </div>

      {panel.open && (
        <>
          <div className={styles.overlay} onClick={closePanel} />
          <aside className={styles.sidePanel}>{renderPanelContent()}</aside>
        </>
      )}
    </div>
  );
}
