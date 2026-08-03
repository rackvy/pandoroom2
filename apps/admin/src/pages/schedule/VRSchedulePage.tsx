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
import { formatDateForApi, addDays } from '../../components/schedule/timeUtils';
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

function occupancyClass(state: SlotState, ratio: number): string {
  if (state.blocked) return styles.cellBlocked;
  if (ratio === 0) return styles.cellEmpty;
  if (ratio < 0.5) return styles.cellLow;
  if (ratio < 1) return styles.cellMedium;
  return styles.cellFull;
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

export default function VRSchedulePage() {
  const [date, setDate] = useState<Date>(new Date());
  const { branches, branchId, setBranchId } = useBranchSelection();
  const [halls, setHalls] = useState<VRHallWithSchedule[]>([]);
  const [games, setGames] = useState<VRGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedHallId, setSelectedHallId] = useState<string>('all');
  const [panel, setPanel] = useState<PanelState>({ open: false, mode: 'slot' });
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

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

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const selectedBranch = branches.find((b) => b.id === branchId);
  const selectedHall = useMemo(
    () => halls.find((h) => h.id === selectedHallId),
    [halls, selectedHallId],
  );

  const closePanel = () => setPanel({ open: false, mode: 'slot' });

  const openSlotPanel = (hallId: string, slot: string) => {
    setPanel({ open: true, mode: 'slot', hallId, slot });
  };

  const openCreatePanel = (hallId: string, slot?: string) => {
    const hall = halls.find((h) => h.id === hallId);
    const start = slot || '10:00';
    setForm({
      ...emptyForm,
      hallId,
      date: formatDateForApi(date),
      startTime: start,
      endTime: addMinutes(start, SLOT_STEP),
      guestsCount: hall ? 1 : 1,
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
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Не удалось заблокировать время');
    }
  };

  const handleConfirmReservation = async (id: string) => {
    try {
      await confirmVRReservation(id);
      toast.success('Бронь подтверждена');
      loadSchedule();
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
    } catch {
      toast.error('Ошибка удаления брони');
    }
  };

  const dateButtons = [
    { label: 'Сегодня', date: new Date() },
    { label: '+1 день', date: addDays(new Date(), 1) },
    { label: '+2 дня', date: addDays(new Date(), 2) },
    { label: '+3 дня', date: addDays(new Date(), 3) },
  ];

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

  const renderHeader = () => (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <h1 className={styles.title}>VR-расписание</h1>
        <span className={styles.dateDisplay}>{formatDateForApi(date)}</span>
      </div>

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
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>

        <button
          className={styles.addButton}
          onClick={() => {
            const firstHall = halls[0];
            if (firstHall) openCreatePanel(firstHall.id);
          }}
          disabled={!halls.length}
        >
          + Новая бронь
        </button>
      </div>
    </div>
  );

  const renderHallTabs = () => (
    <div className={styles.tabs}>
      <button
        className={`${styles.tab} ${selectedHallId === 'all' ? styles.tabActive : ''}`}
        onClick={() => setSelectedHallId('all')}
      >
        Все залы
      </button>
      {halls.map((hall) => (
        <button
          key={hall.id}
          className={`${styles.tab} ${selectedHallId === hall.id ? styles.tabActive : ''}`}
          onClick={() => setSelectedHallId(hall.id)}
        >
          {hall.name}
          <span className={styles.tabCapacity}>{hall.maxCapacity} мест</span>
        </button>
      ))}
    </div>
  );

  const renderMatrixView = () => (
    <div className={styles.matrixContainer}>
      <table className={styles.matrixTable}>
        <thead>
          <tr>
            <th className={styles.matrixTimeHeader}>Время</th>
            {halls.map((hall) => (
              <th key={hall.id} className={styles.matrixHallHeader}>
                <div>{hall.name}</div>
                <div className={styles.matrixHallCapacity}>{hall.maxCapacity} мест</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIME_SLOTS.map((slot) => (
            <tr key={slot}>
              <td className={`${styles.matrixTimeCell} ${slot.endsWith(':30') ? styles.matrixTimeHalf : ''}`}>
                {slot}
              </td>
              {halls.map((hall) => {
                const state = getSlotState(hall, slot);
                const ratio = occupancyRatio(state, hall);
                const cellClass = occupancyClass(state, ratio);
                return (
                  <td
                    key={hall.id}
                    className={`${styles.matrixCell} ${cellClass}`}
                    onClick={() => openSlotPanel(hall.id, slot)}
                  >
                    <div className={styles.matrixCellContent}>
                      <span className={styles.matrixOccupied}>{state.occupied}</span>
                      <span className={styles.matrixDivider}>/</span>
                      <span className={styles.matrixTotal}>{hall.maxCapacity}</span>
                    </div>
                    {state.blocked && <div className={styles.matrixBlockedLabel}>Блок</div>}
                    {!state.blocked && state.free > 0 && (
                      <button
                        type="button"
                        className={styles.matrixLockBtn}
                        title="Заблокировать"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickBlock(hall, slot);
                        }}
                      >
                        🔒
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderSingleHallView = () => {
    if (!selectedHall) return null;
    const hall = selectedHall;

    return (
      <div className={styles.singleView}>
        <div className={styles.singleHeader}>
          <h2 className={styles.singleTitle}>{hall.name}</h2>
          <div className={styles.singleStats}>
            <div className={styles.singleStat}>
              <span className={styles.singleStatValue}>{hall.maxCapacity}</span>
              <span className={styles.singleStatLabel}>всего мест</span>
            </div>
          </div>
        </div>

        <div className={styles.slotList}>
          {TIME_SLOTS.map((slot) => {
            const state = getSlotState(hall, slot);
            const ratio = occupancyRatio(state, hall);
            const cellClass = occupancyClass(state, ratio);
            return (
              <div
                key={slot}
                className={`${styles.slotCard} ${cellClass}`}
                onClick={() => openSlotPanel(hall.id, slot)}
              >
                <div className={styles.slotCardHeader}>
                  <span className={styles.slotTime}>{slot}</span>
                  <span className={styles.slotCapacity}>
                    {state.occupied}/{hall.maxCapacity}
                  </span>
                </div>
                <div className={styles.slotBarTrack}>
                  <div
                    className={styles.slotBarFill}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
                <div className={styles.slotGuests}>
                  {state.blocked ? 'Заблокировано' : state.free === 0 ? 'Полностью занято' : `Свободно ${state.free}`}
                </div>
                {!state.blocked && state.free > 0 && (
                  <button
                    type="button"
                    className={styles.slotLockBtn}
                    title="Заблокировать"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickBlock(hall, slot);
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

  function getStatusClass(status: string): string {
    switch (status) {
      case 'confirmed': return styles.statusConfirmed;
      case 'canceled': return styles.statusCanceled;
      case 'draft': return styles.statusDraft;
      case 'done': return styles.statusDone;
      default: return '';
    }
  }

  return (
    <div className={styles.page}>
      {renderHeader()}
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
        ) : selectedHallId === 'all' ? (
          renderMatrixView()
        ) : (
          renderSingleHallView()
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
