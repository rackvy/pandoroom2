import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClients, deleteClient, Client } from '../api/clients';
import { confirm } from '../components/ui/ConfirmDialog';
import { toast } from '../components/ui/Toast';
import styles from './ClientsPage.module.css';

export default function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadClients();
  }, [debouncedSearch]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await getClients(debouncedSearch || undefined);
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
      toast.error('Ошибка загрузки клиентов');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (client: Client) => {
    const confirmed = await confirm({
      title: 'Удалить клиента?',
      message: `Вы уверены, что хотите удалить клиента "${client.name}"?`,
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await deleteClient(client.id);
      toast.success('Клиент удален');
      loadClients();
    } catch (error) {
      console.error('Failed to delete client:', error);
      toast.error('Ошибка удаления клиента');
    }
  };

  const formatPhone = (phone: string) => {
    // Format: +7 (999) 123-45-67
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('7')) {
      return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`;
    }
    return phone;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Клиенты</h1>
        <button 
          className={styles.addButton}
          onClick={() => navigate('/clients/new')}
        >
          + Новый клиент
        </button>
      </div>

      <div className={styles.searchBox}>
        <input
          type="text"
          placeholder="Поиск по имени, телефону или email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {loading ? (
        <div className={styles.loading}>Загрузка...</div>
      ) : clients.length === 0 ? (
        <div className={styles.empty}>
          {search ? 'Клиенты не найдены' : 'Нет клиентов'}
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Имя</th>
                <th>Телефон</th>
                <th>Email</th>
                <th>Бронирований</th>
                <th>Квестов</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr 
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className={styles.row}
                >
                  <td className={styles.nameCell}>{client.name}</td>
                  <td>{formatPhone(client.phone)}</td>
                  <td>{client.email || '—'}</td>
                  <td>{client._count?.bookings || 0}</td>
                  <td>{client._count?.questReservations || 0}</td>
                  <td>
                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(client);
                      }}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
