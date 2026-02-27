import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createDecoration, updateDecoration, getDecoration, type CreateDecorationData } from '../../api/content';
import { uploadMedia } from '../../api/media';
import styles from './Form.module.css';

export default function DecorationForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = id && id !== 'new';

  const [formData, setFormData] = useState<CreateDecorationData>({
    name: '',
    priceRub: 0,
    imageId: null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit) {
      loadDecoration();
    }
  }, [isEdit, id]);

  const loadDecoration = async () => {
    try {
      setLoading(true);
      const item = await getDecoration(id!);
      setFormData({
        name: item.name,
        priceRub: item.priceRub,
        imageId: item.imageId,
      });
      setImagePreview(item.image?.url || null);
    } catch (err) {
      setError('Ошибка загрузки декорации');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const media = await uploadMedia(file);
      setFormData(prev => ({ ...prev, imageId: media.id }));
      setImagePreview(media.url);
    } catch (err) {
      alert('Ошибка загрузки изображения');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (isEdit) {
        await updateDecoration(id!, formData);
      } else {
        await createDecoration(formData);
      }
      navigate('/content/decorations');
    } catch (err) {
      setError('Ошибка сохранения декорации');
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
        <h1 className={styles.title}>{isEdit ? 'Редактировать декорацию' : 'Новая декорация'}</h1>
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
          <label className={styles.label}>Изображение</label>
          <div className={styles.imageUpload}>
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className={styles.imagePreview} />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className={styles.fileInput}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Цена (₽) *</label>
          <input
            type="number"
            min="0"
            value={formData.priceRub}
            onChange={(e) => setFormData(prev => ({ ...prev, priceRub: Number(e.target.value) }))}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={() => navigate('/content/decorations')}>
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
