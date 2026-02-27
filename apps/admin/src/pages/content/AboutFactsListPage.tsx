import { useState, useEffect, useCallback } from 'react';
import { getAboutFacts, deleteAboutFact, type AboutFact } from '../../api/content';
import styles from './QuestsListPage.module.css';

export default function AboutFactsListPage() {
  const [facts, setFacts] = useState<AboutFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFacts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAboutFacts();
      setFacts(data.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (err) {
      setError('Ошибка загрузки фактов');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFacts();
  }, [loadFacts]);

  const handleAdd = () => {
    // For simplicity, inline add
    const text = prompt('Введите текст факта:');
    if (!text) return;
    
    // This would need a proper form, but for now just alert
    alert('Используйте API для создания факта');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот факт?')) return;
    try {
      await deleteAboutFact(id);
      loadFacts();
    } catch (err) {
      alert('Ошибка удаления факта');
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    // Would need update API call
    alert('Изменение порядка - в разработке');
  };

  const handleMoveDown = async (index: number) => {
    if (index === facts.length - 1) return;
    alert('Изменение порядка - в разработке');
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Факты "О нас"</h1>
        <button className={styles.addButton} onClick={handleAdd}>
          <span>+</span>
          <span>Добавить факт</span>
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {facts.length === 0 ? (
        <div className={styles.empty}>Нет фактов</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Порядок</th>
              <th>Иконка</th>
              <th>Текст</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {facts.map((item, index) => (
              <tr key={item.id}>
                <td>{item.sortOrder}</td>
                <td>
                  {item.icon?.url ? (
                    <img src={item.icon.url} alt="" className={styles.questImage} style={{ width: '40px', height: '40px' }} />
                  ) : (
                    '-'
                  )}
                </td>
                <td>
                  <div className={styles.questName}>{item.text}</div>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleMoveUp(index)}
                      title="Вверх"
                      disabled={index === 0}
                    >
                      ⬆️
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleMoveDown(index)}
                      title="Вниз"
                      disabled={index === facts.length - 1}
                    >
                      ⬇️
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.delete}`}
                      onClick={() => handleDelete(item.id)}
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
