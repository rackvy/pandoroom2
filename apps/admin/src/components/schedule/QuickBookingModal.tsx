import { useState } from 'react';
import ClientPicker, { type ClientPickerValue } from '../booking/ClientPicker';
import styles from './ScheduleGrid.module.css';

interface QuickBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { clientName: string; clientPhone: string; clientId: string | null; durationMinutes: number }) => void;
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
  const [client, setClient] = useState<ClientPickerValue>({ clientId: null, clientName: '', clientPhone: '' });
  const [durationMinutes, setDurationMinutes] = useState(defaultDuration);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit({
        clientName: client.clientName.trim(),
        clientPhone: client.clientPhone.trim(),
        clientId: client.clientId,
        durationMinutes,
      });
      // Reset form
      setClient({ clientId: null, clientName: '', clientPhone: '' });
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
            <label className={styles.formLabel}>Клиент</label>
            <ClientPicker value={client} onChange={setClient} disabled={isLoading} />
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
