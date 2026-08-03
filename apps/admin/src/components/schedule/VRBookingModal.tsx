import { useState, useEffect, useMemo } from 'react';
import { createVRReservation, updateVRReservation, getVRSchedule, getVRPrice, type VRHall, type VRReservation } from '../../api/vrSchedule';
import { formatDateForApi } from './timeUtils';
import { toast } from '../ui/Toast';
import ClientPicker, { type ClientPickerValue } from '../booking/ClientPicker';
import styles from './VRBookingModal.module.css';

type BookingType = 'open_slot' | 'full_hall' | 'blocked';

interface VRBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  halls: VRHall[];
  defaultHallId?: string;
  defaultDate: string;
  defaultStartTime?: string;
  reservation?: VRReservation;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minToHHMM(min: number): string {
  return `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

function formatApiTime(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value.substring(0, 5);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export default function VRBookingModal({
  isOpen,
  onClose,
  onSuccess,
  halls,
  defaultHallId,
  defaultDate,
  defaultStartTime,
  reservation,
}: VRBookingModalProps) {
  const [type, setType] = useState<BookingType>('open_slot');
  const [hallId, setHallId] = useState(defaultHallId || '');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultStartTime || '10:00');
  const [endTime, setEndTime] = useState(defaultStartTime ? minToHHMM(timeToMinutes(defaultStartTime) + 60) : '11:00');
  const [client, setClient] = useState<ClientPickerValue>({ clientId: null, clientName: '', clientPhone: '' });
  const [guestsCount, setGuestsCount] = useState('1');
  const [blockReason, setBlockReason] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mode = reservation ? 'edit' : 'create';

  // Availability for the selected date (to show free seats)
  const [dayReservations, setDayReservations] = useState<Record<string, VRReservation[]>>({});
  // Buyout price quote
  const [buyoutTotal, setBuyoutTotal] = useState<number | null>(null);

  const branchId = halls[0]?.branchId;
  const selectedHall = halls.find((h) => h.id === hallId);

  useEffect(() => {
    if (reservation) {
      setType(reservation.type);
      setHallId(reservation.hallId);
      setDate(formatApiTime(reservation.date) ? formatDateForApi(new Date(reservation.date)) : defaultDate);
      setStartTime(formatApiTime(reservation.startTime));
      setEndTime(formatApiTime(reservation.endTime));
      setClient({
        clientId: reservation.clientId,
        clientName: reservation.clientName || '',
        clientPhone: reservation.clientPhone || '',
      });
      setGuestsCount(String(reservation.guestsCount || 1));
      setDescription(reservation.description || '');
      setBlockReason(reservation.title || '');
    } else {
      if (defaultHallId) setHallId(defaultHallId);
      if (defaultDate) setDate(defaultDate);
      if (defaultStartTime) {
        setStartTime(defaultStartTime);
        setEndTime(minToHHMM(timeToMinutes(defaultStartTime) + 30));
      }
    }
  }, [reservation, defaultHallId, defaultDate, defaultStartTime]);

  // Load availability whenever date changes (or modal opens)
  useEffect(() => {
    if (!isOpen || !branchId || !date) return;
    let cancelled = false;
    getVRSchedule(branchId, date)
      .then((data) => {
        if (cancelled) return;
        const map: Record<string, VRReservation[]> = {};
        data.forEach((h) => { map[h.id] = h.reservations; });
        setDayReservations(map);
      })
      .catch(() => { if (!cancelled) setDayReservations({}); });
    return () => { cancelled = true; };
  }, [isOpen, branchId, date]);

  const effectiveEndTime = type === 'blocked' ? minToHHMM(timeToMinutes(startTime) + 30) : endTime;

  // Free seats across the whole selected window (min over 30-min segments)
  const freeInWindow = useMemo(() => {
    if (!selectedHall) return null;
    const reservations = dayReservations[hallId] || [];
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(effectiveEndTime);
    if (endMin <= startMin) return null;
    let minFree = selectedHall.maxCapacity;
    let blocked = false;
    for (let seg = startMin; seg < endMin; seg += 30) {
      const overlapping = reservations.filter((r) => {
        if (r.status === 'canceled') return false;
        const rStart = timeToMinutes(formatApiTime(r.startTime));
        const rEnd = timeToMinutes(formatApiTime(r.endTime));
        return rStart < seg + 30 && rEnd > seg;
      });
      if (overlapping.some((r) => r.type === 'blocked')) {
        blocked = true;
        break;
      }
      const taken = overlapping.reduce((s, r) => s + r.guestsCount, 0);
      minFree = Math.min(minFree, Math.max(0, selectedHall.maxCapacity - taken));
    }
    return blocked ? { blocked: true as const, free: 0 } : { blocked: false as const, free: minFree };
  }, [selectedHall, hallId, dayReservations, startTime, effectiveEndTime]);

  // Buyout price for the selected window
  useEffect(() => {
    if (!isOpen || type !== 'full_hall' || !hallId || !date) {
      setBuyoutTotal(null);
      return;
    }
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(effectiveEndTime);
    if (endMin <= startMin) {
      setBuyoutTotal(null);
      return;
    }
    let cancelled = false;
    getVRPrice({ hallId, date, startTime, endTime: effectiveEndTime })
      .then((quote) => { if (!cancelled) setBuyoutTotal(quote.buyoutTotal); })
      .catch(() => { if (!cancelled) setBuyoutTotal(null); });
    return () => { cancelled = true; };
  }, [isOpen, type, hallId, date, startTime, effectiveEndTime]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hallId) return;
    setIsLoading(true);
    setError(null);

    try {
      const data: any = {
        hallId,
        date,
        startTime,
        endTime: effectiveEndTime,
        type,
      };

      if (type === 'blocked') {
        data.title = blockReason.trim() || undefined;
      } else {
        data.clientName = client.clientName.trim() || undefined;
        data.clientPhone = client.clientPhone.trim() || undefined;
        data.clientId = client.clientId || undefined;
        if (type === 'open_slot') {
          data.guestsCount = Math.max(1, parseInt(guestsCount) || 1);
          data.description = description.trim() || undefined;
        }
      }

      if (mode === 'edit' && reservation) {
        await updateVRReservation(reservation.id, data);
        toast.success('Бронь обновлена');
      } else {
        await createVRReservation(data);
        toast.success(type === 'blocked' ? 'Время заблокировано' : 'Бронь создана');
      }
      onClose();
      onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Ошибка при создании брони';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) onClose();
  };

  const guests = parseInt(guestsCount) || 1;
  const notEnoughSeats = type === 'open_slot' && freeInWindow && !freeInWindow.blocked && guests > freeInWindow.free;

  return (
    <>
      <div className={styles.overlay} onClick={handleClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            {mode === 'edit'
              ? 'Редактировать бронь'
              : type === 'blocked'
                ? 'Блокировка времени'
                : 'Новая бронь VR'}
          </h3>
          <button className={styles.closeButton} onClick={handleClose} disabled={isLoading}>
            &times;
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Тип</label>
            <div className={styles.typeSelector}>
              <button
                type="button"
                className={type === 'open_slot' ? styles.typeButtonActive : styles.typeButton}
                onClick={() => setType('open_slot')}
              >
                Бронь мест
              </button>
              <button
                type="button"
                className={type === 'full_hall' ? styles.typeButtonActive : styles.typeButton}
                onClick={() => setType('full_hall')}
              >
                Выкуп зала
              </button>
              <button
                type="button"
                className={type === 'blocked' ? styles.typeButtonActive : styles.typeButton}
                onClick={() => setType('blocked')}
              >
                Блок 30 мин
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Зал</label>
            <select
              className={styles.select}
              value={hallId}
              onChange={(e) => setHallId(e.target.value)}
              required
              disabled={isLoading}
            >
              <option value="">Выберите зал</option>
              {halls.map((h) => (
                <option key={h.id} value={h.id}>{h.name} ({h.maxCapacity} мест)</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Дата</label>
            <input
              type="date"
              className={styles.input}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              {type === 'blocked' ? 'Время блокировки (30 минут)' : 'Время (минимум 30 минут, шаг 30 минут)'}
            </label>
            <div className={styles.timeRow}>
              <input
                type="time"
                className={styles.input}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                step={1800}
                required
                disabled={isLoading}
              />
              <input
                type="time"
                className={styles.input}
                value={effectiveEndTime}
                onChange={(e) => setEndTime(e.target.value)}
                step={1800}
                required
                disabled={isLoading || type === 'blocked'}
              />
            </div>
          </div>

          {selectedHall && freeInWindow && type !== 'blocked' && (
            <div className={styles.hint}>
              {freeInWindow.blocked ? (
                <span className={styles.hintBad}>Это время заблокировано администратором</span>
              ) : freeInWindow.free === 0 ? (
                <span className={styles.hintBad}>На выбранное время нет свободных мест</span>
              ) : (
                <span>
                  Свободно на выбранное время: <strong>{freeInWindow.free} из {selectedHall.maxCapacity}</strong> мест
                </span>
              )}
            </div>
          )}

          {type === 'open_slot' && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Клиент</label>
                <ClientPicker value={client} onChange={setClient} disabled={isLoading} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Количество гостей (1–{selectedHall?.maxCapacity || 20})
                </label>
                <input
                  type="number"
                  className={styles.input}
                  value={guestsCount}
                  onChange={(e) => setGuestsCount(e.target.value)}
                  min={1}
                  max={selectedHall?.maxCapacity || 20}
                  required
                  disabled={isLoading}
                />
                {notEnoughSeats && (
                  <div className={styles.hint}>
                    <span className={styles.hintBad}>
                      Свободно только {freeInWindow?.free} мест — уменьшите количество гостей
                    </span>
                  </div>
                )}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Комментарий</label>
                <textarea
                  className={styles.textarea}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Необязательно"
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          {type === 'full_hall' && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Клиент</label>
                <ClientPicker value={client} onChange={setClient} disabled={isLoading} />
              </div>
              <div className={styles.priceBox}>
                <span>Выкуп зала ({selectedHall?.maxCapacity || 20} мест):</span>
                <strong>{buyoutTotal != null ? `${buyoutTotal.toLocaleString('ru-RU')} ₽` : '…'}</strong>
              </div>
            </>
          )}

          {type === 'blocked' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Причина (необязательно)</label>
              <input
                type="text"
                className={styles.input}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Например: уборка после группы"
                disabled={isLoading}
              />
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleClose}
              disabled={isLoading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading || notEnoughSeats || (!!freeInWindow?.blocked && type !== 'blocked')}
            >
              {isLoading
                ? 'Сохранение...'
                : mode === 'edit'
                  ? 'Сохранить изменения'
                  : type === 'blocked'
                    ? 'Заблокировать'
                    : 'Создать бронь'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
