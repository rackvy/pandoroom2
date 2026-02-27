import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createSupplier, updateSupplier, getSupplier, type CreateSupplierData } from '../../api/content';
import styles from './Form.module.css';

export default function SupplierForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = id && id !== 'new';

  const [formData, setFormData] = useState<CreateSupplierData>({
    name: '',
    contactName: '',
    phone: '',
    whatsapp: '',
    telegram: '',
    email: '',
    requisites: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit) {
      loadSupplier();
    }
  }, [isEdit, id]);

  const loadSupplier = async () => {
    try {
      setLoading(true);
      const item = await getSupplier(id!);
      setFormData({
        name: item.name,
        contactName: item.contactName || '',
        phone: item.phone || '',
        whatsapp: item.whatsapp || '',
        telegram: item.telegram || '',
        email: item.email || '',
        requisites: item.requisites || '',
      });
    } catch (err) {
      setError('Ошибка загрузки поставщика');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (isEdit) {
        await updateSupplier(id!, formData);
      } else {
        await createSupplier(formData);
      }
      navigate('/content/suppliers');
    } catch (err) {
      setError('Ошибка сохранения поставщика');
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
        <h1 className={styles.title}>{isEdit ? 'Редактировать поставщика' : 'Новый поставщик'}</h1>
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
          <label className={styles.label}>Контактное лицо</label>
          <input
            type="text"
            value={formData.contactName}
            onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Телефон</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>WhatsApp</label>
          <input
            type="text"
            value={formData.whatsapp}
            onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Telegram</label>
          <input
            type="text"
            value={formData.telegram}
            onChange={(e) => setFormData(prev => ({ ...prev, telegram: e.target.value }))}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Реквизиты</label>
          <textarea
            value={formData.requisites}
            onChange={(e) => setFormData(prev => ({ ...prev, requisites: e.target.value }))}
            className={styles.textarea}
            rows={4}
          />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={() => navigate('/content/suppliers')}>
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
