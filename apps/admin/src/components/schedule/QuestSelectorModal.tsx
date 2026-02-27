import { useState, useEffect } from 'react';
import { getQuestScheduleGrid, QuestWithSlots, QuestSlot } from '../../api/schedule';
import styles from './ItemSelectorModal.module.css';

interface QuestSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (questId: string, questName: string, slot: QuestSlot) => void;
  branchId: string;
  eventDate: string;
  startTime: string;
}

export default function QuestSelectorModal({
  isOpen,
  onClose,
  onSelect,
  branchId,
  eventDate,
  startTime,
}: QuestSelectorModalProps) {
  const [quests, setQuests] = useState<QuestWithSlots[]>([]);
  const [selectedQuestId, setSelectedQuestId] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<QuestSlot | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && branchId && eventDate) {
      loadQuests();
    }
  }, [isOpen, branchId, eventDate]);

  const loadQuests = async () => {
    setLoading(true);
    try {
      const data = await getQuestScheduleGrid(eventDate, branchId);
      // Filter only quests that have available slots from startTime
      const filteredQuests = data.map(quest => ({
        ...quest,
        slots: quest.slots.filter(slot => 
          slot.startTime >= startTime && !slot.reservation
        )
      })).filter(quest => quest.slots.length > 0);
      setQuests(filteredQuests);
    } catch (error) {
      console.error('Failed to load quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    if (!selectedQuestId || !selectedSlot) return;
    const quest = quests.find(q => q.questId === selectedQuestId);
    if (!quest) return;
    onSelect(selectedQuestId, quest.questName, selectedSlot);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>Выбор квеста</h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>Загрузка...</div>
          ) : quests.length === 0 ? (
            <div className={styles.empty}>Нет доступных квестов на это время</div>
          ) : (
            <div className={styles.questList}>
              {quests.map(quest => (
                <div key={quest.questId} className={styles.questSection}>
                  <div className={styles.questHeader}>
                    <div className={styles.questName}>{quest.questName}</div>
                    <div className={styles.questDuration}>{quest.durationMinutes} мин</div>
                  </div>
                  <div className={styles.slotsGrid}>
                    {quest.slots.map(slot => (
                      <button
                        key={slot.slotId}
                        className={`${styles.slotButton} ${
                          selectedQuestId === quest.questId && selectedSlot?.slotId === slot.slotId 
                            ? styles.selected : ''
                        }`}
                        onClick={() => {
                          setSelectedQuestId(quest.questId);
                          setSelectedSlot(slot);
                        }}
                      >
                        <div className={styles.slotTime}>{slot.startTime}</div>
                        <div className={styles.slotPrice}>{slot.finalPrice.toLocaleString()} ₽</div>
                        {slot.hasSpecialPrice && <span className={styles.specialBadge}>★</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onClose}>
            Отмена
          </button>
          <button
            className={styles.confirmButton}
            onClick={handleSelect}
            disabled={!selectedQuestId || !selectedSlot}
          >
            Выбрать
          </button>
        </div>
      </div>
    </>
  );
}
