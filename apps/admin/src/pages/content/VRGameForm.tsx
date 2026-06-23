import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getVRGame, createVRGame, updateVRGame, type CreateVRGameData } from '../../api/catalog';
import { uploadMedia } from '../../api/media';
import { getMediaUrl } from '../../utils/media';
import { toast } from '../../components/ui/Toast';
import RichTextEditor from '../../components/ui/RichTextEditor';
import styles from './Form.module.css';

export default function VRGameForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = id && id !== 'new';

  const [formData, setFormData] = useState<CreateVRGameData>({
    name: '',
    description: null,
    genre: null,
    minPlayers: 1,
    maxPlayers: 4,
    durationMinutes: null,
    previewImageId: null,
    isActive: true,
    sortOrder: 0,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit) {
      loadGame();
    }
  }, [isEdit, id]);

  const loadGame = async () => {
    try {
      setLoading(true);
      const game = await getVRGame(id!);
      setFormData({
        name: game.name,
        description: game.description,
        genre: game.genre,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        durationMinutes: game.durationMinutes,
        previewImageId: game.previewImageId,
        isActive: game.isActive,
        sortOrder: game.sortOrder,
      });
      setImagePreview(game.previewImage?.url || null);
    } catch (err) {
      setError('Ошибка загрузки VR игры');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const media = await uploadMedia(file);
      setFormData(prev => ({ ...prev, previewImageId: media.id }));
      setImagePreview(media.url);
      toast.success('Изображение загружено');
    } catch (err) {
      toast.error('Ошибка загрузки изображения');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (isEdit) {
        await updateVRGame(id!, formData);
        toast.success('VR игра обновлена');
      } else {
        await createVRGame(formData);
        toast.success('VR игра создана');
      }
      navigate('/content/vr-games');
    } catch (err) {
      setError('Ошибка сохранения VR игры');
      toast.error('Ошибка сохранения VR игры');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{isEdit ? 'Редактировать VR игру' : 'Новая VR игра'}</h1>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Название *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Описание</label>
          <RichTextEditor
            value={formData.description || ''}
            onChange={(val) => setFormData(prev => ({ ...prev, description: val }))}
            minHeight={200}
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Жанр</label>
            <input
              type="text"
              value={formData.genre || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value || null }))}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Длительность (мин)</label>
            <input
              type="number"
              min="0"
              value={formData.durationMinutes ?? ''}
              onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: e.target.value ? Number(e.target.value) : null }))}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Мин. игроков *</label>
            <input
              type="number"
              min="1"
              value={formData.minPlayers}
              onChange={(e) => setFormData(prev => ({ ...prev, minPlayers: Number(e.target.value) }))}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Макс. игроков *</label>
            <input
              type="number"
              min="1"
              value={formData.maxPlayers}
              onChange={(e) => setFormData(prev => ({ ...prev, maxPlayers: Number(e.target.value) }))}
              className={styles.input}
              required
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Изображение</label>
          <div className={styles.imageUpload}>
            {imagePreview && (
              <img src={getMediaUrl(imagePreview)} alt="Preview" className={styles.imagePreview} />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className={styles.fileInput}
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              />
              {' '}Активна
            </label>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Порядок сортировки</label>
            <input
              type="number"
              min="0"
              value={formData.sortOrder}
              onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: Number(e.target.value) }))}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={() => navigate('/content/vr-games')}>
            Отмена
          </button>
          <button type="submit" className={styles.saveButton} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  );
}
