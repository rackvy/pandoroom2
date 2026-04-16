import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getShowPrograms, deleteShowProgram, type ShowProgram } from '../../api/content';
import { getMediaUrl } from '../../utils/media';
import { toast } from '../../components/ui/Toast';
import { confirm } from '../../components/ui/ConfirmDialog';
import styles from './QuestsListPage.module.css';

export default function ShowProgramsListPage() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<ShowProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadPrograms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getShowPrograms();
      setPrograms(data);
    } catch (err) {
      setError('Ошибка загрузки шоу-программ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  const handleAdd = () => {
    navigate('/content/show-programs/new');
  };

  const handleEdit = (id: string) => {
    navigate(`/content/show-programs/${id}/edit`);
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: 'Удалить шоу-программу?',
      message: `Вы уверены, что хотите удалить "${name}"?`,
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await deleteShowProgram(id);
      loadPrograms();
      toast.success('Шоу-программа удалена');
    } catch (err) {
      toast.error('Ошибка удаления шоу-программы');
    }
  };

  const filteredPrograms = programs.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Шоу-программы</h1>
        <button className={styles.addButton} onClick={handleAdd}>
          <span>+</span>
          <span>Добавить программу</span>
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

      {filteredPrograms.length === 0 ? (
        <div className={styles.empty}>
          {searchQuery ? 'Программы не найдены' : 'Нет шоу-программ'}
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Изображение</th>
              <th>Название</th>
              <th>Цена</th>
              <th>Поставщик</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredPrograms.map((item) => (
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
