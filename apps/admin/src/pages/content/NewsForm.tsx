import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createNews, updateNews, getNewsItem, type CreateNewsData } from '../../api/content';
import { uploadMedia } from '../../api/media';
import { getMediaUrl } from '../../utils/media';
import styles from './Form.module.css';

export default function NewsForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = id && id !== 'new';

  const [formData, setFormData] = useState<CreateNewsData>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    content: '',
    imageId: null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit) {
      loadNewsItem();
    }
  }, [isEdit, id]);

  const loadNewsItem = async () => {
    try {
      setLoading(true);
      const item = await getNewsItem(id!);
      setFormData({
        title: item.title,
        date: item.date.split('T')[0],
        content: item.content,
        imageId: item.imageId,
      });
      setImagePreview(item.image?.url || null);
    } catch (err) {
      setError('Ошибка загрузки новости');
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
        await updateNews(id!, formData);
      } else {
        await createNews(formData);
      }
      navigate('/content/news');
    } catch (err) {
      setError('Ошибка сохранения новости');
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
        <h1 className={styles.title}>{isEdit ? 'Редактировать новость' : 'Новая новость'}</h1>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Заголовок *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Дата *</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            className={styles.input}
            required
          />
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

        <div className={styles.formGroup}>
          <label className={styles.label}>Содержание *</label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            className={styles.textarea}
            rows={10}
            required
          />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={() => navigate('/content/news')}>
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
