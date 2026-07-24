import { useState, useEffect, useCallback } from 'react';
import {
  getAgeRestrictions,
  createAgeRestriction,
  updateAgeRestriction,
  deleteAgeRestriction,
  type AgeRestriction,
} from '../../api/content';
import { toast } from '../../components/ui/Toast';
import { confirm } from '../../components/ui/ConfirmDialog';
import styles from './AgeRestrictionsPage.module.css';

function extractError(err: any, fallback: string): string {
  const msg = err?.response?.data?.message;
  if (typeof msg === 'string' && msg.trim()) return msg;
  if (Array.isArray(msg) && msg.length) return msg[0];
  return fallback;
}

export default function AgeRestrictionsPage() {
  const [items, setItems] = useState<AgeRestriction[]>([]);
  const [loading, setLoading] = useState(true);
  const [newValue, setNewValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAgeRestrictions();
      setItems(data);
      const nextDrafts: Record<string, string> = {};
      data.forEach((item) => {
        nextDrafts[item.id] = item.value;
      });
      setDrafts(nextDrafts);
    } catch {
      toast.error('Ошибка загрузки справочника');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    const value = newValue.trim();
    if (!value) {
      toast.error('Введите значение');
      return;
    }
    try {
      setAdding(true);
      await createAgeRestriction({ value });
      setNewValue('');
      await load();
      toast.success('Значение добавлено');
    } catch (err) {
      toast.error(extractError(err, 'Ошибка добавления'));
    } finally {
      setAdding(false);
    }
  };

  const handleSaveValue = async (item: AgeRestriction) => {
    const value = (drafts[item.id] ?? '').trim();
    if (!value) {
      toast.error('Значение не может быть пустым');
      setDrafts((prev) => ({ ...prev, [item.id]: item.value }));
      return;
    }
    if (value === item.value) return;

    try {
      setSavingId(item.id);
      await updateAgeRestriction(item.id, { value });
      await load();
      toast.success('Значение сохранено');
    } catch (err) {
      toast.error(extractError(err, 'Ошибка сохранения'));
      setDrafts((prev) => ({ ...prev, [item.id]: item.value }));
    } finally {
      setSavingId(null);
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    const reordered = [...items];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    try {
      await Promise.all(
        reordered.map((item, i) => updateAgeRestriction(item.id, { sortOrder: i }))
      );
      await load();
    } catch {
      toast.error('Не удалось изменить порядок');
    }
  };

  const handleDelete = async (item: AgeRestriction) => {
    const confirmed = await confirm({
      title: 'Удалить значение?',
      message: `Удалить "${item.value}" из списка возрастных ограничений?`,
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await deleteAgeRestriction(item.id);
      await load();
      toast.success('Значение удалено');
    } catch (err) {
      toast.error(extractError(err, 'Ошибка удаления'));
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Возрастные ограничения</h1>
      </div>
      <p className={styles.subtitle}>
        Эти значения доступны в выпадающем списке «Возрастное ограничение» в форме квеста.
        Порядок в списке соответствует порядку в выпадающем меню.
      </p>

      <div className={styles.addRow}>
        <input
          type="text"
          className={styles.addInput}
          placeholder="Например, 16+"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
        />
        <button
          type="button"
          className={styles.addButton}
          onClick={handleAdd}
          disabled={adding}
        >
          {adding ? 'Добавление...' : 'Добавить'}
        </button>
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>Нет значений</div>
      ) : (
        <div className={styles.list}>
          {items.map((item, index) => {
            const draft = drafts[item.id] ?? item.value;
            const dirty = draft.trim() !== item.value;
            return (
              <div key={item.id} className={styles.row}>
                <div className={styles.orderControls}>
                  <button
                    type="button"
                    className={styles.orderButton}
                    onClick={() => handleMove(index, -1)}
                    disabled={index === 0}
                    title="Выше"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.orderButton}
                    onClick={() => handleMove(index, 1)}
                    disabled={index === items.length - 1}
                    title="Ниже"
                  >
                    ↓
                  </button>
                </div>

                <input
                  type="text"
                  className={`${styles.valueInput} ${dirty ? styles.valueInputDirty : ''}`}
                  value={draft}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                  onBlur={() => handleSaveValue(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                />

                {dirty && (
                  <button
                    type="button"
                    className={styles.saveButton}
                    onClick={() => handleSaveValue(item)}
                    disabled={savingId === item.id}
                  >
                    {savingId === item.id ? '...' : 'Сохранить'}
                  </button>
                )}

                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => handleDelete(item)}
                  title="Удалить"
                >
                  🗑️
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
