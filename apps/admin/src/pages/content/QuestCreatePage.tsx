import { useNavigate } from 'react-router-dom';
import { CreateQuestData, createQuest } from '../../api/catalog';
import { createQuestScheduleSlot } from '../../api/questSchedule';
import QuestForm from '../../components/QuestForm';
import { ScheduleSlot } from '../../components/QuestScheduleEditor';
import styles from './QuestCreatePage.module.css';

export default function QuestCreatePage() {
  const navigate = useNavigate();

  const handleSubmit = async (data: CreateQuestData, scheduleSlots?: ScheduleSlot[]) => {
    try {
      // Create quest first
      const quest = await createQuest(data);
      
      // Create schedule slots if provided
      if (scheduleSlots && scheduleSlots.length > 0) {
        await Promise.all(
          scheduleSlots.map(slot => 
            createQuestScheduleSlot({
              questId: quest.id,
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              basePrice: slot.basePrice,
              isActive: true,
            })
          )
        );
      }
      
      navigate('/content/quests');
    } catch (error) {
      console.error('Failed to create quest:', error);
      alert('Ошибка создания квеста');
    }
  };

  const handleCancel = () => {
    navigate('/content/quests');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Создание квеста</h1>
      </div>
      <div className={styles.formContainer}>
        <QuestForm onSubmit={handleSubmit} onCancel={handleCancel} />
      </div>
    </div>
  );
}
