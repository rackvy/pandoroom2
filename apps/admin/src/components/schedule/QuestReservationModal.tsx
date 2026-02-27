import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cancelQuestReservation } from '../../api/schedule';
import styles from './QuestReservationModal.module.css';

interface QuestReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
  reservation: {
    id: string;
    bookingId: string;
    clientName: string;
    status: string;
  } | null;
  questName: string;
  startTime: string;
  durationMinutes: number;
  price: number;
}

export default function QuestReservationModal({
  isOpen,
  onClose,
  onDeleted,
  reservation,
  questName,
  startTime,
  durationMinutes,
  price,
}: QuestReservationModalProps) {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !reservation) return null;

  const handleDelete = async () => {
    if (!confirm('Вы уверены, что хотите удалить эту бронь?')) return;
    
    setIsDeleting(true);
    try {
      await cancelQuestReservation(reservation.id);
      onDeleted();
    } catch (err) {
      alert('Ошибка при удалении брони');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewBooking = () => {
    navigate(`/registry/${reservation.bookingId}`);
  };

  // Calculate end time
  const [hours, minutes] = startTime.split(':').map(Number);
  const endDate = new Date(2024, 0, 1, hours, minutes + durationMinutes);
  const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

  const getStatusText = (status: string) => {
    const statuses: Record<string, string> = {
      'PENDING': 'Ожидает',
      'CONFIRMED': 'Подтверждена',
      'COMPLETED': 'Завершена',
      'CANCELLED': 'Отменена',
    };
    return statuses[status] || status;
  };

  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      'PENDING': styles.statusPending,
      'CONFIRMED': styles.statusConfirmed,
      'COMPLETED': styles.statusCompleted,
      'CANCELLED': styles.statusCancelled,
    };
    return classes[status] || '';
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>Бронь квеста</h3>
          <button className={styles.closeButton} onClick={onClose} disabled={isDeleting}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.infoSection}>
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

          <div className={styles.divider} />

          <div className={styles.clientSection}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Клиент:</span>
              <span className={styles.infoValue}>{reservation.clientName || 'Не указано'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Статус:</span>
              <span className={`${styles.status} ${getStatusClass(reservation.status)}`}>
                {getStatusText(reservation.status)}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.deleteButton}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Удаление...' : 'Удалить бронь'}
          </button>
          <button
            className={styles.viewButton}
            onClick={handleViewBooking}
            disabled={isDeleting}
          >
            Открыть в реестре
          </button>
        </div>
      </div>
    </>
  );
}

