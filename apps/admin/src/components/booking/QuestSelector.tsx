import { useState, useEffect } from 'react';
import { getQuestScheduleGrid, type QuestWithSlots } from '../../api/schedule';
import styles from './QuestSelector.module.css';

interface QuestSelectorProps {
  branchId: string;
  eventDate: string;
  selectedQuestId?: string;
  onSelect: (questId: string, questName: string) => void;
}

export default function QuestSelector({ branchId, eventDate, selectedQuestId, onSelect }: QuestSelectorProps) {
  const [quests, setQuests] = useState<QuestWithSlots[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!branchId || !eventDate) return;

    const loadQuests = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getQuestScheduleGrid(eventDate, branchId);
        setQuests(data);
      } catch (err) {
        setError('Не удалось загрузить квесты');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuests();
  }, [branchId, eventDate]);

  if (isLoading) return <div className={styles.loading}>Загрузка квестов...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (quests.length === 0) {
    return <div className={styles.empty}>Нет доступных квестов</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.questsGrid}>
        {quests.map((quest) => {
          const isSelected = quest.questId === selectedQuestId;
          const availableSlots = quest.slots.filter((s) => s.isAvailable).length;
          const totalSlots = quest.slots.length;

          return (
            <button
              key={quest.questId}
              className={`${styles.questButton} ${isSelected ? styles.selected : ''}`}
              onClick={() => onSelect(quest.questId, quest.questName)}
            >
              <span className={styles.questName}>{quest.questName}</span>
              <span className={styles.duration}>{quest.durationMinutes} мин</span>
              <span className={styles.slots}>
                Свободно: {availableSlots}/{totalSlots}
              </span>

            </button>
          );
        })}
      </div>
    </div>
  );
}
