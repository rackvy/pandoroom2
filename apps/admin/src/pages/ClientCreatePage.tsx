import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '../api/clients';
import { toast } from '../components/ui/Toast';
import PhoneInput from '../components/shared/PhoneInput';
import { isPhoneComplete, phoneToDigits } from '../utils/phone';
import styles from './ClientDetailPage.module.css';

export default function ClientCreatePage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    birthday: '',
    notes: '',
  });

  const handleSave = async () => {
    if (!formData.name.trim() || !isPhoneComplete(formData.phone)) {
      toast.error('Укажите имя и телефон клиента');
      return;
    }

    setSaving(true);
    try {
      const client = await createClient({
        name: formData.name.trim(),
        phone: phoneToDigits(formData.phone),
        email: formData.email.trim() || undefined,
        birthday: formData.birthday || undefined,
        notes: formData.notes.trim() || undefined,
      });
      toast.success('Клиент создан');
      navigate(`/clients/${client.id}`);
    } catch (error: any) {
      if (error?.response?.status === 409) {
        toast.error('Клиент с таким телефоном уже существует');
      } else {
        toast.error('Ошибка создания клиента');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/clients')}>
          ← Назад к списку
        </button>
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Сохранение...' : 'Создать'}
        </button>
      </div>

      <div className={styles.card}>
        <h2>Новый клиент</h2>

        <div className={styles.form}>
          <div className={styles.field}>
            <label>Имя *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Введите имя клиента"
            />
          </div>
          <div className={styles.field}>
            <label>Телефон *</label>
            <PhoneInput
              value={formData.phone}
              onChange={(phone) => setFormData({ ...formData, phone })}
            />
          </div>
          <div className={styles.field}>
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>
          <div className={styles.field}>
            <label>День рождения</label>
            <input
              type="date"
              value={formData.birthday}
              onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label>Примечания</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Заметки о клиенте..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
