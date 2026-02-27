import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClient, updateClient, ClientWithHistory } from '../api/clients';
import { toast } from '../components/ui/Toast';
import styles from './ClientDetailPage.module.css';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientWithHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    birthday: '',
    notes: '',
  });

  useEffect(() => {
    if (id) {
      loadClient();
    }
  }, [id]);

  const loadClient = async () => {
    setLoading(true);
    try {
      const data = await getClient(id!);
      setClient(data);
      setFormData({
        name: data.name,
        phone: data.phone,
        email: data.email || '',
        birthday: data.birthday || '',
        notes: data.notes || '',
      });
    } catch (error) {
      console.error('Failed to load client:', error);
      toast.error('Ошибка загрузки клиента');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateClient(id!, formData);
      toast.success('Клиент обновлен');
      setEditing(false);
      loadClient();
    } catch (error) {
      console.error('Failed to update client:', error);
      toast.error('Ошибка обновления клиента');
    }
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('7')) {
      return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`;
    }
    return phone;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU');
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (!client) {
    return <div className={styles.error}>Клиент не найден</div>;
  }

  const totalVisits = client.bookings.length + client.questReservations.length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/clients')}>
          ← Назад к списку
        </button>
        {!editing ? (
          <button className={styles.editBtn} onClick={() => setEditing(true)}>
            Редактировать
          </button>
        ) : (
          <div className={styles.editActions}>
            <button className={styles.cancelBtn} onClick={() => setEditing(false)}>
              Отмена
            </button>
            <button className={styles.saveBtn} onClick={handleSave}>
              Сохранить
            </button>
          </div>
        )}
      </div>

      <div className={styles.card}>
        <h2>{editing ? 'Редактирование клиента' : client.name}</h2>
        
        {editing ? (
          <div className={styles.form}>
            <div className={styles.field}>
              <label>Имя</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label>Телефон</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
              />
            </div>
          </div>
        ) : (
          <div className={styles.info}>
            <div className={styles.infoRow}>
              <span className={styles.label}>Телефон:</span>
              <span className={styles.value}>{formatPhone(client.phone)}</span>
            </div>
            {client.email && (
              <div className={styles.infoRow}>
                <span className={styles.label}>Email:</span>
                <span className={styles.value}>{client.email}</span>
              </div>
            )}
            {client.birthday && (
              <div className={styles.infoRow}>
                <span className={styles.label}>День рождения:</span>
                <span className={styles.value}>{formatDate(client.birthday)}</span>
              </div>
            )}
            {client.notes && (
              <div className={styles.infoRow}>
                <span className={styles.label}>Примечания:</span>
                <span className={styles.value}>{client.notes}</span>
              </div>
            )}
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{client.bookings.length}</span>
                <span className={styles.statLabel}>Бронирований</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{client.questReservations.length}</span>
                <span className={styles.statLabel}>Квестов</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{totalVisits}</span>
                <span className={styles.statLabel}>Всего посещений</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Booking History */}
      {client.bookings.length > 0 && (
        <div className={styles.section}>
          <h3>История бронирований</h3>
          <div className={styles.historyList}>
            {client.bookings.map((booking) => (
              <div 
                key={booking.id} 
                className={styles.historyItem}
                onClick={() => navigate(`/registry/${booking.id}`)}
              >
                <div className={styles.historyDate}>{formatDate(booking.eventDate)}</div>
                <div className={styles.historyBranch}>{booking.branch.name}</div>
                <div className={styles.historyStatus} data-status={booking.status}>
                  {booking.status}
                </div>
                {booking.tableReservations.length > 0 && (
                  <div className={styles.historyDetails}>
                    Столы: {booking.tableReservations.map(r => 
                      `${r.table.zone.name} ${r.table.title}`
                    ).join(', ')}
                  </div>
                )}
                {booking.questReservations.length > 0 && (
                  <div className={styles.historyDetails}>
                    Квесты: {booking.questReservations.map(r => r.quest.name).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quest History */}
      {client.questReservations.length > 0 && (
        <div className={styles.section}>
          <h3>История квестов</h3>
          <div className={styles.historyList}>
            {client.questReservations.map((reservation) => (
              <div key={reservation.id} className={styles.historyItem}>
                <div className={styles.historyDate}>{formatDate(reservation.eventDate)}</div>
                <div className={styles.historyQuest}>{reservation.quest.name}</div>
                <div className={styles.historyBranch}>{reservation.branch.name}</div>
                <div className={styles.historyTime}>
                  {reservation.startTime.slice(0, 5)} - {reservation.endTime.slice(0, 5)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalVisits === 0 && (
        <div className={styles.emptyHistory}>
          У клиента пока нет истории посещений
        </div>
      )}
    </div>
  );
}
