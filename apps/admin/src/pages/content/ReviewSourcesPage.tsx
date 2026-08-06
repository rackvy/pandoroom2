import { useState, useEffect, useCallback } from 'react';
import { getReviewSources, createReviewSource, updateReviewSource, deleteReviewSource, type ReviewSource } from '../../api/content';
import { type Media } from '../../api/media';
import { getMediaUrl } from '../../utils/media';
import { toast } from '../../components/ui/Toast';
import { confirm } from '../../components/ui/ConfirmDialog';
import MediaPicker from '../../components/ui/MediaPicker';
import styles from './QuestsListPage.module.css';

export default function ReviewSourcesPage() {
  const [sources, setSources] = useState<ReviewSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState<Media | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  // 'create' — выбор логотипа для нового источника, иначе id источника в таблице
  const [pickerTarget, setPickerTarget] = useState<'create' | string | null>(null);

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
      await createReviewSource({ name: newName.trim(), iconId: newIcon?.id ?? null });
      setNewName('');
      setNewIcon(null);
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

  const handleRemoveIcon = async (source: ReviewSource) => {
    try {
      await updateReviewSource(source.id, { iconId: null });
      loadSources();
      toast.success('Логотип удален');
    } catch (err) {
      toast.error('Ошибка удаления логотипа');
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

  const handlePickIcon = (media: Media) => {
    if (pickerTarget === 'create') {
      setNewIcon(media);
      return;
    }
    if (!pickerTarget) return;
    const sourceId = pickerTarget;
    updateReviewSource(sourceId, { iconId: media.id })
      .then(() => {
        loadSources();
        toast.success('Логотип обновлен');
      })
      .catch(() => toast.error('Ошибка обновления логотипа'));
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Источники отзывов</h1>
        <button
          className={styles.addButton}
          onClick={() => {
            setIsAdding(true);
            setNewIcon(null);
          }}
        >
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
            <div>
              <label className={styles.label}>Логотип</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {newIcon ? (
                  <img
                    src={getMediaUrl(newIcon.url)}
                    alt=""
                    style={{ width: '38px', height: '38px', objectFit: 'contain', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fff' }}
                  />
                ) : (
                  <div
                    style={{ width: '38px', height: '38px', border: '1px dashed #d1d5db', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '18px' }}
                  >
                    ?
                  </div>
                )}
                <button type="button" className={styles.cancelButton} onClick={() => setPickerTarget('create')}>
                  Выбрать
                </button>
                {newIcon && (
                  <button type="button" className={styles.cancelButton} onClick={() => setNewIcon(null)} title="Убрать логотип">
                    ✕
                  </button>
                )}
              </div>
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
              <th>Логотип</th>
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
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {source.icon?.url ? (
                      <>
                        <img
                          src={getMediaUrl(source.icon.url)}
                          alt=""
                          title="Нажмите, чтобы заменить"
                          onClick={() => setPickerTarget(source.id)}
                          style={{ width: '32px', height: '32px', objectFit: 'contain', cursor: 'pointer', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fff' }}
                        />
                        <button
                          type="button"
                          className={styles.actionButton}
                          onClick={() => handleRemoveIcon(source)}
                          title="Убрать логотип"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <button type="button" className={styles.cancelButton} onClick={() => setPickerTarget(source.id)}>
                        Выбрать
                      </button>
                    )}
                  </div>
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

      <MediaPicker
        open={pickerTarget !== null}
        title="Выбор логотипа из медиатеки"
        accept="image"
        onSelect={handlePickIcon}
        onClose={() => setPickerTarget(null)}
      />
    </div>
  );
}
