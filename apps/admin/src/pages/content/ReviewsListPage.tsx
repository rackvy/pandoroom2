import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReviews, deleteReview, type Review } from '../../api/content';
import styles from './QuestsListPage.module.css';

export default function ReviewsListPage() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getReviews();
      setReviews(data);
    } catch (err) {
      setError('Ошибка загрузки отзывов');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleAdd = () => {
    navigate('/content/reviews/new');
  };

  const handleEdit = (id: string) => {
    navigate(`/content/reviews/${id}/edit`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот отзыв?')) return;
    try {
      await deleteReview(id);
      loadReviews();
    } catch (err) {
      alert('Ошибка удаления отзыва');
    }
  };

  const filteredReviews = reviews.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Отзывы</h1>
        <button className={styles.addButton} onClick={handleAdd}>
          <span>+</span>
          <span>Добавить отзыв</span>
        </button>
      </div>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Поиск по имени или тексту..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {filteredReviews.length === 0 ? (
        <div className={styles.empty}>
          {searchQuery ? 'Отзывы не найдены' : 'Нет отзывов'}
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Имя</th>
              <th>Рейтинг</th>
              <th>Источник</th>
              <th>Текст</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredReviews.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{'⭐'.repeat(item.rating)}</td>
                <td>{item.source?.name || '-'}</td>
                <td>
                  <div className={styles.questName} style={{ maxWidth: '300px' }}>
                    {item.text.substring(0, 100)}{item.text.length > 100 ? '...' : ''}
                  </div>
                </td>
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
