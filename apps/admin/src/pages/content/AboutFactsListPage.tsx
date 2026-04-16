import { useState, useEffect, useCallback } from 'react';
import { getAboutFacts, createAboutFact, updateAboutFact, deleteAboutFact, type AboutFact } from '../../api/content';
import { toast } from '../../components/ui/Toast';
import { confirm } from '../../components/ui/ConfirmDialog';
import styles from './QuestsListPage.module.css';

export default function AboutFactsListPage() {
  const [facts, setFacts] = useState<AboutFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newFactText, setNewFactText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFactText.trim()) return;

    try {
      await createAboutFact({
        text: newFactText.trim(),
        sortOrder: facts.length,
      });
      setNewFactText('');
      setIsCreating(false);
      loadFacts();
      toast.success('Факт создан');
    } catch (err) {
      setError('Ошибка создания факта');
      toast.error('Ошибка создания факта');
    }
  };

  const handleEdit = (fact: AboutFact) => {
    setEditingId(fact.id);
    setEditText(fact.text);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editText.trim()) return;

    try {
      await updateAboutFact(editingId, { text: editText.trim() });
      setEditingId(null);
      loadFacts();
      toast.success('Факт обновлен');
    } catch (err) {
      toast.error('Ошибка обновления факта');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Удалить факт?',
      message: 'Вы уверены, что хотите удалить этот факт?',
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await deleteAboutFact(id);
      loadFacts();
      toast.success('Факт удален');
    } catch (err) {
      toast.error('Ошибка удаления факта');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === facts.length - 1) return;

    const newFacts = [...facts];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    [newFacts[index], newFacts[targetIndex]] = [newFacts[targetIndex], newFacts[index]];
    
    try {
      await Promise.all(
        newFacts.map((fact, i) => 
          updateAboutFact(fact.id, { sortOrder: i })
        )
      );
      loadFacts();
      toast.success('Порядок обновлен');
    } catch (err) {
      toast.error('Ошибка обновления порядка');
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Факты "О нас"</h1>
        <button className={styles.addButton} onClick={() => setIsCreating(true)} disabled={isCreating}>
          <span>+</span>
          <span>Добавить факт</span>
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleAdd} className={styles.form} style={{ marginBottom: '20px' }}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Текст факта</label>
            <textarea
              value={newFactText}
              onChange={(e) => setNewFactText(e.target.value)}
              className={styles.textarea}
              rows={3}
              placeholder="Введите текст факта..."
              autoFocus
            />
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={() => setIsCreating(false)}>
              Отмена
            </button>
            <button type="submit" className={styles.saveButton} disabled={!newFactText.trim()}>
              Создать
            </button>
          </div>
        </form>
      )}

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
                  {editingId === item.id ? (
                    <form onSubmit={handleSaveEdit} style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className={styles.input}
                        style={{ flex: 1 }}
                        autoFocus
                      />
                      <button type="submit" className={styles.actionButton} title="Сохранить">
                        ✓
                      </button>
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => setEditingId(null)}
                        title="Отмена"
                      >
                        ✕
                      </button>
                    </form>
                  ) : (
                    <div className={styles.questName}>{item.text}</div>
                  )}
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleMove(index, 'up')}
                      title="Вверх"
                      disabled={index === 0}
                    >
                      ⬆️
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleMove(index, 'down')}
                      title="Вниз"
                      disabled={index === facts.length - 1}
                    >
                      ⬇️
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleEdit(item)}
                      title="Редактировать"
                    >
                      ✏️
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
