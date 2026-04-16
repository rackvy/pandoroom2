import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNews, deleteNews, type News } from '../../api/content';
import { getMediaUrl } from '../../utils/media';
import { toast } from '../../components/ui/Toast';
import { confirm } from '../../components/ui/ConfirmDialog';
import styles from './QuestsListPage.module.css';

export default function NewsListPage() {
  const navigate = useNavigate();
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadNews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getNews();
      setNews(data);
    } catch (err) {
      setError('Ошибка загрузки новостей');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const handleAdd = () => {
    navigate('/content/news/new');
  };

  const handleEdit = (id: string) => {
    navigate(`/content/news/${id}/edit`);
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await confirm({
      title: 'Удалить новость?',
      message: `Вы уверены, что хотите удалить "${title}"?`,
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await deleteNews(id);
      loadNews();
      toast.success('Новость удалена');
    } catch (err) {
      toast.error('Ошибка удаления новости');
    }
  };

  const filteredNews = news.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Новости</h1>
        <button className={styles.addButton} onClick={handleAdd}>
          <span>+</span>
          <span>Добавить новость</span>
        </button>
      </div>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Поиск по заголовку..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {filteredNews.length === 0 ? (
        <div className={styles.empty}>
          {searchQuery ? 'Новости не найдены' : 'Нет новостей'}
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Изображение</th>
              <th>Заголовок</th>
              <th>Содержание</th>
              <th>Дата</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredNews.map((item) => (
              <tr key={item.id}>
                <td>
                  <img
                    src={getMediaUrl(item.image?.url)}
                    alt={item.title}
                    className={styles.questImage}
                  />
                </td>
                <td>
                  <div className={styles.questName}>{item.title}</div>
                </td>
                <td>
                  <div style={{ maxWidth: '300px', maxHeight: '60px', overflow: 'hidden' }}>
                    {item.content.replace(/<[^>]*>/g, '').substring(0, 100)}
                    {item.content.length > 100 ? '...' : ''}
                  </div>
                </td>
                <td>{new Date(item.date).toLocaleDateString('ru-RU')}</td>
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
                      onClick={() => handleDelete(item.id, item.title)}
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
