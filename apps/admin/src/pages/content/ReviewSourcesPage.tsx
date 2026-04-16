import { useState, useEffect, useCallback } from 'react';
import { getReviewSources, createReviewSource, updateReviewSource, deleteReviewSource, type ReviewSource } from '../../api/content';
import { toast } from '../../components/ui/Toast';
import { confirm } from '../../components/ui/ConfirmDialog';
import styles from './QuestsListPage.module.css';

export default function ReviewSourcesPage() {
  const [sources, setSources] = useState<ReviewSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const loadSources = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getReviewSources();
      setSources(data);
    } catch (err) {
      toast.error('Ошибка загрузки источников');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      await createReviewSource({ name: newName.trim() });
      setNewName('');
      setIsAdding(false);
      loadSources();
      toast.success('Источник создан');
    } catch (err) {
      toast.error('Ошибка создания источника');
    }
  };

  const handleEdit = (source: ReviewSource) => {
    setEditingId(source.id);
    setEditName(source.name);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editName.trim()) return;

    try {
      await updateReviewSource(editingId, { name: editName.trim() });
      setEditingId(null);
      loadSources();
      toast.success('Источник обновлен');
    } catch (err) {
      toast.error('Ошибка обновления источника');
    }
  };

  const handleDelete = async (source: ReviewSource) => {
    const confirmed = await confirm({
      title: 'Удалить источник?',
      message: `Вы уверены, что хотите удалить "${source.name}"?`,
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await deleteReviewSource(source.id);
      loadSources();
      toast.success('Источник удален');
    } catch (err) {
      toast.error('Ошибка удаления источника');
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Источники отзывов</h1>
        <button className={styles.addButton} onClick={() => setIsAdding(true)}>
          <span>+</span>
          <span>Добавить источник</span>
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className={styles.form} style={{ marginBottom: '20px' }}>
          <div className={styles.formGroup} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label className={styles.label}>Название источника</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={styles.input}
                placeholder="Например: Яндекс.Карты"
                autoFocus
              />
            </div>
            <button type="button" className={styles.cancelButton} onClick={() => setIsAdding(false)}>
              Отмена
            </button>
            <button type="submit" className={styles.saveButton}>
              Добавить
            </button>
          </div>
        </form>
      )}

      {sources.length === 0 ? (
        <div className={styles.empty}>Нет источников отзывов</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Название</th>
              <th>Иконка</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id}>
                <td>
                  {editingId === source.id ? (
                    <form onSubmit={handleSaveEdit} style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={styles.input}
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
                    source.name
                  )}
                </td>
                <td>
                  {source.icon?.url ? (
                    <img src={source.icon.url} alt="" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                  ) : (
                    '-'
                  )}
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleEdit(source)}
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.delete}`}
                      onClick={() => handleDelete(source)}
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
