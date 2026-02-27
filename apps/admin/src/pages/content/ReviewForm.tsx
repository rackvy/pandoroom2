import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createReview, updateReview, getReview, getReviewSources, type CreateReviewData, type ReviewSource } from '../../api/content';
import styles from './Form.module.css';

export default function ReviewForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = id && id !== 'new';

  const [formData, setFormData] = useState<CreateReviewData>({
    name: '',
    rating: 5,
    sourceId: '',
    text: '',
  });
  const [sources, setSources] = useState<ReviewSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSources();
    if (isEdit) {
      loadReview();
    }
  }, [isEdit, id]);

  const loadSources = async () => {
    try {
      const data = await getReviewSources();
      setSources(data);
      if (data.length > 0 && !isEdit) {
        setFormData(prev => ({ ...prev, sourceId: data[0].id }));
      }
    } catch (err) {
      console.error('Ошибка загрузки источников');
    }
  };

  const loadReview = async () => {
    try {
      setLoading(true);
      const item = await getReview(id!);
      setFormData({
        name: item.name,
        rating: item.rating,
        sourceId: item.sourceId,
        text: item.text,
      });
    } catch (err) {
      setError('Ошибка загрузки отзыва');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (isEdit) {
        await updateReview(id!, formData);
      } else {
        await createReview(formData);
      }
      navigate('/content/reviews');
    } catch (err) {
      setError('Ошибка сохранения отзыва');
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
        <h1 className={styles.title}>{isEdit ? 'Редактировать отзыв' : 'Новый отзыв'}</h1>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Имя *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Рейтинг *</label>
          <select
            value={formData.rating}
            onChange={(e) => setFormData(prev => ({ ...prev, rating: Number(e.target.value) }))}
            className={styles.input}
            required
          >
            {[5, 4, 3, 2, 1].map(r => (
              <option key={r} value={r}>{r} {'⭐'.repeat(r)}</option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Источник *</label>
          <select
            value={formData.sourceId}
            onChange={(e) => setFormData(prev => ({ ...prev, sourceId: e.target.value }))}
            className={styles.input}
            required
          >
            <option value="">Выберите источник</option>
            {sources.map(source => (
              <option key={source.id} value={source.id}>{source.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Текст отзыва *</label>
          <textarea
            value={formData.text}
            onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
            className={styles.textarea}
            rows={6}
            required
          />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={() => navigate('/content/reviews')}>
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
