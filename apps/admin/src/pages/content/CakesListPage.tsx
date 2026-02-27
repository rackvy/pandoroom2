import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCakes, deleteCake, type Cake } from '../../api/content';
import { getMediaUrl } from '../../utils/media';
import styles from './QuestsListPage.module.css';

export default function CakesListPage() {
  const navigate = useNavigate();
  const [cakes, setCakes] = useState<Cake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadCakes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCakes();
      setCakes(data);
    } catch (err) {
      setError('Ошибка загрузки тортов');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCakes();
  }, [loadCakes]);

  const handleAdd = () => {
    navigate('/content/cakes/new');
  };

  const handleEdit = (id: string) => {
    navigate(`/content/cakes/${id}/edit`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот торт?')) return;
    try {
      await deleteCake(id);
      loadCakes();
    } catch (err) {
      alert('Ошибка удаления торта');
    }
  };

  const filteredCakes = cakes.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Торты</h1>
        <button className={styles.addButton} onClick={handleAdd}>
          <span>+</span>
          <span>Добавить торт</span>
        </button>
      </div>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Поиск по названию..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {filteredCakes.length === 0 ? (
        <div className={styles.empty}>
          {searchQuery ? 'Торты не найдены' : 'Нет тортов'}
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Изображение</th>
              <th>Название</th>
              <th>Цена</th>
              <th>Вес</th>
              <th>Поставщик</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredCakes.map((item) => (
              <tr key={item.id}>
                <td>
                  <img
                    src={getMediaUrl(item.image?.url)}
                    alt={item.name}
                    className={styles.questImage}
                  />
                </td>
                <td>
                  <div className={styles.questName}>{item.name}</div>
                </td>
                <td>{item.priceRub.toLocaleString()} ₽</td>
                <td>{item.weightGrams} г</td>
                <td>{item.supplier?.name || '-'}</td>
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
                      onClick={() => handleDelete(item.id)}
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
