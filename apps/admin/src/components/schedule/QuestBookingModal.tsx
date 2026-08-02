import { useState } from 'react';
import { quickBookQuest, QuickQuestBookingRequest } from '../../api/schedule';
import ClientPicker, { type ClientPickerValue } from '../booking/ClientPicker';
import styles from './QuestBookingModal.module.css';

interface QuestBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  questId: string;
  questName: string;
  branchId: string;
  eventDate: string;
  startTime: string;
  durationMinutes: number;
  price: number;
}

export default function QuestBookingModal({
  isOpen,
  onClose,
  onSuccess,
  questId,
  questName,
  branchId,
  eventDate,
  startTime,
  durationMinutes,
  price,
}: QuestBookingModalProps) {
  const [client, setClient] = useState<ClientPickerValue>({ clientId: null, clientName: '', clientPhone: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const data: QuickQuestBookingRequest = {
        branchId,
        questId,
        eventDate,
        startTime,
        durationMinutes,
        clientName: client.clientName.trim() || undefined,
        clientPhone: client.clientPhone.trim() || undefined,
        clientId: client.clientId || undefined,
      };

      await quickBookQuest(data);
      
      // Reset form
      setClient({ clientId: null, clientName: '', clientPhone: '' });
      
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при создании брони');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  // Calculate end time
  const [hours, minutes] = startTime.split(':').map(Number);
  const endDate = new Date(2024, 0, 1, hours, minutes + durationMinutes);
  const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

  return (
    <>
      <div className={styles.overlay} onClick={handleClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>Бронирование квеста</h3>
          <button className={styles.closeButton} onClick={handleClose} disabled={isLoading}>
            ×
          </button>
        </div>

        <div className={styles.info}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Квест:</span>
            <span className={styles.infoValue}>{questName}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Время:</span>
            <span className={styles.infoValue}>{startTime} - {endTime}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Длительность:</span>
            <span className={styles.infoValue}>{durationMinutes} мин</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Стоимость:</span>
            <span className={styles.infoValue}>{price.toLocaleString()} ₽</span>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Клиент</label>
            <ClientPicker value={client} onChange={setClient} disabled={isLoading} />
          </div>

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
              {isLoading ? 'Создание...' : 'Забронировать'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
