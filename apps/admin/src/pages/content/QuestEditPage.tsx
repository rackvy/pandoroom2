import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Quest, UpdateQuestData, getQuest, updateQuest } from '../../api/catalog';
import QuestForm from '../../components/QuestForm';
import styles from './QuestEditPage.module.css';

export default function QuestEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quest, setQuest] = useState<Quest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadQuest(id);
    }
  }, [id]);

  const loadQuest = async (questId: string) => {
    try {
      setIsLoading(true);
      const data = await getQuest(questId);
      setQuest(data);
    } catch (error) {
      console.error('Failed to load quest:', error);
      alert('Ошибка загрузки квеста');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: UpdateQuestData) => {
    if (!id) return;
    
    try {
      await updateQuest(id, data);
      navigate('/content/quests');
    } catch (error) {
      console.error('Failed to update quest:', error);
      alert('Ошибка обновления квеста');
    }
  };

  const handleCancel = () => {
    navigate('/content/quests');
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  if (!quest) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Квест не найден</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Редактирование квеста</h1>
      </div>
      <div className={styles.formContainer}>
        <QuestForm 
          initialData={quest} 
          onSubmit={handleSubmit} 
          onCancel={handleCancel} 
        />
      </div>
    </div>
  );
}
