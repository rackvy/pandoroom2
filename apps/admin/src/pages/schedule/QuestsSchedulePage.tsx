import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import QuestSlotGrid from '../../components/schedule/QuestSlotGrid';
import QuestBookingModal from '../../components/schedule/QuestBookingModal';
import QuestReservationModal from '../../components/schedule/QuestReservationModal';
import { getQuestScheduleGrid, getBranches, type QuestWithSlots, type QuestSlot, type Branch } from '../../api/schedule';
import { formatDateForApi, addDays } from '../../components/schedule/timeUtils';
import styles from './SchedulePage.module.css';

export default function QuestsSchedulePage() {
  const [date, setDate] = useState<Date>(new Date());
  const [branchId, setBranchId] = useState<string>('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [quests, setQuests] = useState<QuestWithSlots[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Booking modal state
  const [bookingModal, setBookingModal] = useState<{
    isOpen: boolean;
    questId: string;
    questName: string;
    slot: QuestSlot | null;
  }>({ isOpen: false, questId: '', questName: '', slot: null });

  // Reservation modal state
  const [reservationModal, setReservationModal] = useState<{
    isOpen: boolean;
    questId: string;
    questName: string;
    slot: QuestSlot | null;
  }>({ isOpen: false, questId: '', questName: '', slot: null });


  // Load branches on mount
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

  // Load schedule when date or branch changes
  useEffect(() => {
    if (!branchId) return;

    const loadSchedule = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const dateStr = formatDateForApi(date);
        const data = await getQuestScheduleGrid(dateStr, branchId);
        setQuests(data);
      } catch (err) {
        setError('Не удалось загрузить расписание');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSchedule();
  }, [date, branchId]);

  const handleDateChange = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const handleSlotClick = useCallback((questId: string, slot: QuestSlot) => {
    const quest = quests.find(q => q.questId === questId);
    if (quest) {
      setBookingModal({
        isOpen: true,
        questId,
        questName: quest.questName,
        slot,
      });
    }
  }, [quests]);

  const handleReservationClick = useCallback((questId: string, slot: QuestSlot) => {
    const quest = quests.find(q => q.questId === questId);
    if (quest) {
      setReservationModal({
        isOpen: true,
        questId,
        questName: quest.questName,
        slot,
      });
    }
  }, [quests]);

  const refreshSchedule = useCallback(() => {
    if (!branchId) return;
    const dateStr = formatDateForApi(date);
    getQuestScheduleGrid(dateStr, branchId).then(setQuests);
  }, [date, branchId]);

  const dateButtons = [
    { label: 'Сегодня', date: new Date() },
    { label: '+1 день', date: addDays(new Date(), 1) },
    { label: '+2 дня', date: addDays(new Date(), 2) },
    { label: '+3 дня', date: addDays(new Date(), 3) },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Сетка квестов</h2>
        
        <div className={styles.controls}>
          {/* Date picker */}
          <div className={styles.datePicker}>
            {dateButtons.map((btn, index) => (
              <button
                key={index}
                className={`${styles.dateButton} ${formatDateForApi(date) === formatDateForApi(btn.date) ? styles.active : ''}`}
                onClick={() => handleDateChange(btn.date)}
              >
                {btn.label}
              </button>
            ))}
            <input
              type="date"
              className={styles.dateInput}
              value={formatDateForApi(date)}
              onChange={(e) => handleDateChange(new Date(e.target.value))}
            />
          </div>

          {/* Branch selector */}
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
        </div>

        {/* View switcher */}
        <div className={styles.viewSwitcher}>
          <Link to="/table-grid" className={styles.viewButton}>
            Столы
          </Link>
          <Link to="/quest-grid" className={`${styles.viewButton} ${styles.active}`}>
            Квесты
          </Link>
        </div>
      </div>

      <div className={styles.gridContainer}>
        {!branchId ? (
          <div className={styles.emptyState}>
            <p>Выберите филиал для просмотра расписания</p>
          </div>
        ) : isLoading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : error ? (
          <div className={styles.error}>
            <p>{error}</p>
            <button className={styles.retryButton} onClick={() => window.location.reload()}>
              Повторить
            </button>
          </div>
        ) : (
          <QuestSlotGrid
            quests={quests}
            onSlotClick={handleSlotClick}
            onReservationClick={handleReservationClick}
          />
        )}
      </div>

      {/* Booking Modal */}
      {bookingModal.isOpen && bookingModal.slot && (
        <QuestBookingModal
          isOpen={true}
          onClose={() => setBookingModal({ isOpen: false, questId: '', questName: '', slot: null })}
          onSuccess={() => {
            setBookingModal({ isOpen: false, questId: '', questName: '', slot: null });
            refreshSchedule();
          }}
          questId={bookingModal.questId}
          questName={bookingModal.questName}
          branchId={branchId}
          eventDate={formatDateForApi(date)}
          startTime={bookingModal.slot.startTime}
          durationMinutes={quests.find(q => q.questId === bookingModal.questId)?.durationMinutes || 60}
          price={bookingModal.slot.finalPrice}
        />
      )}

      {/* Reservation Modal */}
      {reservationModal.isOpen && reservationModal.slot && (
        <QuestReservationModal
          isOpen={true}
          onClose={() => setReservationModal({ isOpen: false, questId: '', questName: '', slot: null })}
          onDeleted={() => {
            setReservationModal({ isOpen: false, questId: '', questName: '', slot: null });
            refreshSchedule();
          }}
          reservation={reservationModal.slot.reservation}
          questName={reservationModal.questName}
          startTime={reservationModal.slot.startTime}
          durationMinutes={quests.find(q => q.questId === reservationModal.questId)?.durationMinutes || 60}
          price={reservationModal.slot.finalPrice}
        />
      )}
    </div>
  );
}
