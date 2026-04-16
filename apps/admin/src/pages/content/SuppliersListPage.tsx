import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSuppliers, deleteSupplier, type Supplier } from '../../api/content';
import { toast } from '../../components/ui/Toast';
import { confirm } from '../../components/ui/ConfirmDialog';
import styles from './QuestsListPage.module.css';

export default function SuppliersListPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (err) {
      setError('Ошибка загрузки поставщиков');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleAdd = () => {
    navigate('/content/suppliers/new');
  };

  const handleEdit = (id: string) => {
    navigate(`/content/suppliers/${id}/edit`);
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: 'Удалить поставщика?',
      message: `Вы уверены, что хотите удалить "${name}"?`,
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await deleteSupplier(id);
      loadSuppliers();
      toast.success('Поставщик удален');
    } catch (err) {
      toast.error('Ошибка удаления поставщика');
    }
  };

  const filteredSuppliers = suppliers.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.contactName && item.contactName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Поставщики</h1>
        <button className={styles.addButton} onClick={handleAdd}>
          <span>+</span>
          <span>Добавить поставщика</span>
        </button>
      </div>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Поиск по названию или контакту..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {filteredSuppliers.length === 0 ? (
        <div className={styles.empty}>
          {searchQuery ? 'Поставщики не найдены' : 'Нет поставщиков'}
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Название</th>
              <th>Контактное лицо</th>
              <th>Телефон</th>
              <th>Email</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className={styles.questName}>{item.name}</div>
                </td>
                <td>{item.contactName || '-'}</td>
                <td>{item.phone || '-'}</td>
                <td>{item.email || '-'}</td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleEdit(item.id)}
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.delete}`}
                      onClick={() => handleDelete(item.id, item.name)}
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
    </div>
  );
}
