import { useState } from 'react';
import styles from './ScheduleGrid.module.css';

interface QuickBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { clientName: string; clientPhone: string; durationMinutes: number }) => void;
  defaultDuration: number;
  title: string;
}

const DURATION_OPTIONS = [60, 90, 120, 150, 180, 240, 300, 360];

export default function QuickBookingModal({
  isOpen,
  onClose,
  onSubmit,
  defaultDuration,
  title,
}: QuickBookingModalProps) {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(defaultDuration);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit({
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        durationMinutes,
      });
      // Reset form
      setClientName('');
      setClientPhone('');
      setDurationMinutes(defaultDuration);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <>
      <div className={styles.modalOverlay} onClick={handleClose} />
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button className={styles.modalClose} onClick={handleClose} disabled={isLoading}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Имя клиента</label>
            <input
              type="text"
              className={styles.formInput}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Необязательно"
              disabled={isLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Телефон</label>
            <input
              type="tel"
              className={styles.formInput}
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="Необязательно"
              disabled={isLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Длительность (минут)</label>
            <select
              className={styles.formSelect}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              disabled={isLoading}
            >
              {DURATION_OPTIONS.map((mins) => (
                <option key={mins} value={mins}>
                  {mins} мин ({mins / 60} ч)
                </option>
              ))}
            </select>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
              onClick={handleClose}
              disabled={isLoading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className={`${styles.modalButton} ${styles.modalButtonPrimary}`}
              disabled={isLoading}
            >
              {isLoading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
