import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDecorations, deleteDecoration, type Decoration } from '../../api/content';
import { getMediaUrl } from '../../utils/media';
import { toast } from '../../components/ui/Toast';
import { confirm } from '../../components/ui/ConfirmDialog';
import styles from './QuestsListPage.module.css';

export default function DecorationsListPage() {
  const navigate = useNavigate();
  const [decorations, setDecorations] = useState<Decoration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadDecorations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDecorations();
      setDecorations(data);
    } catch (err) {
      setError('Ошибка загрузки декораций');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDecorations();
  }, [loadDecorations]);

  const handleAdd = () => {
    navigate('/content/decorations/new');
  };

  const handleEdit = (id: string) => {
    navigate(`/content/decorations/${id}/edit`);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Удаление декорации',
      message: 'Вы уверены, что хотите удалить эту декорацию?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteDecoration(id);
      toast.success('Декорация удалена');
      loadDecorations();
    } catch (err) {
      toast.error('Ошибка удаления декорации');
    }
  };

  const filteredDecorations = decorations.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Декорации</h1>
        <button className={styles.addButton} onClick={handleAdd}>
          <span>+</span>
          <span>Добавить декорацию</span>
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

      {filteredDecorations.length === 0 ? (
        <div className={styles.empty}>
          {searchQuery ? 'Декорации не найдены' : 'Нет декораций'}
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Изображение</th>
              <th>Название</th>
              <th>Цена</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredDecorations.map((item) => (
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
