import { useState, useEffect } from 'react';
import { createVRReservation } from '../../api/vrSchedule';
import { getVRGames, type VRGame } from '../../api/catalog';
import type { VRHall } from '../../api/vrSchedule';
import { toast } from '../ui/Toast';
import styles from './VRBookingModal.module.css';

interface VRBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  halls: VRHall[];
  defaultHallId?: string;
  defaultDate: string;
  defaultStartTime?: string;
}

export default function VRBookingModal({
  isOpen,
  onClose,
  onSuccess,
  halls,
  defaultHallId,
  defaultDate,
  defaultStartTime,
}: VRBookingModalProps) {
  const [type, setType] = useState<'full_hall' | 'open_slot'>('full_hall');
  const [hallId, setHallId] = useState(defaultHallId || '');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultStartTime || '10:00');
  const [endTime, setEndTime] = useState(defaultStartTime ? addHour(defaultStartTime) : '11:00');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gameId, setGameId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [guestsCount, setGuestsCount] = useState('');
  const [maxGuests, setMaxGuests] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<VRGame[]>([]);

  useEffect(() => {
    if (isOpen) {
      getVRGames().then(setGames).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (defaultHallId) setHallId(defaultHallId);
    if (defaultDate) setDate(defaultDate);
    if (defaultStartTime) {
      setStartTime(defaultStartTime);
      setEndTime(addHour(defaultStartTime));
    }
  }, [defaultHallId, defaultDate, defaultStartTime]);

  if (!isOpen) return null;

  function addHour(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const totalMin = h * 60 + m + 60;
    const newH = Math.floor(totalMin / 60);
    const newM = totalMin % 60;
    if (newH >= 24) return '23:30';
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  }

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
        endTime,
        type,
      };

      if (type === 'full_hall') {
        data.clientName = clientName.trim() || undefined;
        data.clientPhone = clientPhone.trim() || undefined;
        data.guestsCount = guestsCount ? parseInt(guestsCount) : 0;
      } else {
        data.title = title.trim() || undefined;
        data.description = description.trim() || undefined;
        data.gameId = gameId || undefined;
        data.maxGuests = maxGuests ? parseInt(maxGuests) : undefined;
      }

      await createVRReservation(data);
      toast.success('Бронь создана');
      onClose();
      onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Ошибка при создании брони';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) onClose();
  };

  return (
    <>
      <div className={styles.overlay} onClick={handleClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>Новая бронь VR</h3>
          <button className={styles.closeButton} onClick={handleClose} disabled={isLoading}>
            &times;
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Тип брони</label>
            <div className={styles.typeSelector}>
              <button
                type="button"
                className={type === 'full_hall' ? styles.typeButtonActive : styles.typeButton}
                onClick={() => setType('full_hall')}
              >
                Выкуп зала
              </button>
              <button
                type="button"
                className={type === 'open_slot' ? styles.typeButtonActive : styles.typeButton}
                onClick={() => setType('open_slot')}
              >
                Свободный слот
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
                <option key={h.id} value={h.id}>{h.name}</option>
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
            <label className={styles.label}>Время</label>
            <div className={styles.timeRow}>
              <input
                type="time"
                className={styles.input}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                disabled={isLoading}
              />
              <input
                type="time"
                className={styles.input}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {type === 'full_hall' && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Имя клиента</label>
                <input
                  type="text"
                  className={styles.input}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Введите имя"
                  disabled={isLoading}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Телефон</label>
                <input
                  type="tel"
                  className={styles.input}
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Введите телефон"
                  disabled={isLoading}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Кол-во гостей</label>
                <input
                  type="number"
                  className={styles.input}
                  value={guestsCount}
                  onChange={(e) => setGuestsCount(e.target.value)}
                  placeholder="0"
                  min="0"
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          {type === 'open_slot' && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Название</label>
                <input
                  type="text"
                  className={styles.input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Название мероприятия"
                  disabled={isLoading}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Описание</label>
                <textarea
                  className={styles.textarea}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Описание"
                  disabled={isLoading}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Игра</label>
                <select
                  className={styles.select}
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">Без игры</option>
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Макс. гостей</label>
                <input
                  type="number"
                  className={styles.input}
                  value={maxGuests}
                  onChange={(e) => setMaxGuests(e.target.value)}
                  placeholder="Максимальное кол-во"
                  min="1"
                  disabled={isLoading}
                />
              </div>
            </>
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
              disabled={isLoading}
            >
              {isLoading ? 'Создание...' : 'Создать бронь'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
