import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuests, deleteQuest, updateQuest, type Quest } from '../../api/catalog';
import { getMediaUrl } from '../../utils/media';
import { toast } from '../../components/ui/Toast';
import { confirm } from '../../components/ui/ConfirmDialog';
import styles from './QuestsListPage.module.css';

const difficultyLabels: Record<string, string> = {
  easy: 'Легкий',
  medium: 'Средний',
  hard: 'Сложный',
};

const difficultyClasses: Record<string, string> = {
  easy: styles['difficulty-easy'],
  medium: styles['difficulty-medium'],
  hard: styles['difficulty-hard'],
};

export default function QuestsListPage() {
  const navigate = useNavigate();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getQuests();
      setQuests(data);
    } catch (err) {
      setError('Ошибка загрузки квестов');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  const handleAdd = () => {
    navigate('/content/quests/new');
  };

  const handleEdit = (id: string) => {
    navigate(`/content/quests/${id}/edit`);
  };

  const handleSchedule = (id: string) => {
    navigate(`/content/quests/${id}/schedule`);
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: 'Удалить квест?',
      message: `Вы уверены, что хотите удалить "${name}"?`,
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await deleteQuest(id);
      loadQuests();
      toast.success('Квест удален');
    } catch (err) {
      toast.error('Ошибка удаления квеста');
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= quests.length) return;

    const reordered = [...quests];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    try {
      await Promise.all(
        reordered.map((q, i) => updateQuest(q.id, { sortOrder: i }))
      );
      await loadQuests();
    } catch (err) {
      toast.error('Не удалось изменить порядок');
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Квесты</h1>
        <button className={styles.addButton} onClick={handleAdd}>
          <span>+</span>
          <span>Добавить квест</span>
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {quests.length === 0 ? (
        <div className={styles.empty}>Нет квестов</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Порядок</th>
              <th>Квест</th>
              <th>Филиал</th>
              <th>Сложность</th>
              <th>Игроки</th>
              <th>Доп.</th>
              <th>Длительность</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {quests.map((quest, index) => (
              <tr key={quest.id}>
                <td>
                  <div className={styles.orderControls}>
                    <button
                      className={styles.orderButton}
                      onClick={() => handleMove(index, -1)}
                      disabled={index === 0}
                      title="Выше"
                    >
                      ↑
                    </button>
                    <button
                      className={styles.orderButton}
                      onClick={() => handleMove(index, 1)}
                      disabled={index === quests.length - 1}
                      title="Ниже"
                    >
                      ↓
                    </button>
                  </div>
                </td>
                <td>
                  <div className={styles.questInfo}>
                    <img
                      src={getMediaUrl(quest.previewImage?.url)}
                      alt={quest.name}
                      className={styles.questImage}
                    />
                    <div>
                      <div className={styles.questName}>{quest.name}</div>
                      <div className={styles.questGenre}>{quest.genre}</div>
                    </div>
                  </div>
                </td>
                <td>{quest.branch?.name || '-'}</td>
                <td>
                  <span className={`${styles.difficulty} ${difficultyClasses[quest.difficulty]}`}>
                    {difficultyLabels[quest.difficulty]}
                  </span>
                </td>
                <td className={styles.players}>
                  {quest.minPlayers}-{quest.maxPlayers}
                </td>
                <td>{quest.maxExtraPlayers ?? 2}</td>
                <td>{quest.durationMinutes} мин</td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleSchedule(quest.id)}
                      title="Расписание и цена"
                    >
                      📅
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleEdit(quest.id)}
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.delete}`}
                      onClick={() => handleDelete(quest.id, quest.name)}
                      title="Удалить"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
