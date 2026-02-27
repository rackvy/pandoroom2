import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createCake, updateCake, getCake, getSuppliers, type CreateCakeData, type Supplier } from '../../api/content';
import { uploadMedia } from '../../api/media';
import styles from './Form.module.css';

export default function CakeForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = id && id !== 'new';

  const [formData, setFormData] = useState<CreateCakeData>({
    name: '',
    priceRub: 0,
    weightGrams: 0,
    supplierId: null,
    imageId: null,
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSuppliers();
    if (isEdit) {
      loadCake();
    }
  }, [isEdit, id]);

  const loadSuppliers = async () => {
    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error('Ошибка загрузки поставщиков');
    }
  };

  const loadCake = async () => {
    try {
      setLoading(true);
      const item = await getCake(id!);
      setFormData({
        name: item.name,
        priceRub: item.priceRub,
        weightGrams: item.weightGrams,
        supplierId: item.supplierId,
        imageId: item.imageId,
      });
      setImagePreview(item.image?.url || null);
    } catch (err) {
      setError('Ошибка загрузки торта');
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
        await updateCake(id!, formData);
      } else {
        await createCake(formData);
      }
      navigate('/content/cakes');
    } catch (err) {
      setError('Ошибка сохранения торта');
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
        <h1 className={styles.title}>{isEdit ? 'Редактировать торт' : 'Новый торт'}</h1>
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

        <div className={styles.formRow}>
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

          <div className={styles.formGroup}>
            <label className={styles.label}>Вес (г) *</label>
            <input
              type="number"
              min="0"
              value={formData.weightGrams}
              onChange={(e) => setFormData(prev => ({ ...prev, weightGrams: Number(e.target.value) }))}
              className={styles.input}
              required
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Поставщик</label>
          <select
            value={formData.supplierId || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, supplierId: e.target.value || null }))}
            className={styles.input}
          >
            <option value="">Без поставщика</option>
            {suppliers.map(supplier => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={() => navigate('/content/cakes')}>
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
