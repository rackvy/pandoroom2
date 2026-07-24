import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBlog, deleteBlog, type BlogPost } from '../../api/content';
import { getMediaUrl } from '../../utils/media';
import { toast } from '../../components/ui/Toast';
import { confirm } from '../../components/ui/ConfirmDialog';
import styles from './QuestsListPage.module.css';

export default function BlogListPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadBlog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBlog();
      setPosts(data);
    } catch (err) {
      setError('Ошибка загрузки статей');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBlog(); }, [loadBlog]);

  const handleAdd = () => { navigate('/content/blog/new'); };
  const handleEdit = (id: string) => { navigate(`/content/blog/${id}/edit`); };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await confirm({
      title: 'Удалить статью?',
      message: `Вы уверены, что хотите удалить "${title}"?`,
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteBlog(id);
      loadBlog();
      toast.success('Статья удалена');
    } catch (err) {
      toast.error('Ошибка удаления статьи');
    }
  };

  const filteredPosts = posts.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className={styles.loading}>Загрузка...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Блог</h1>
        <button className={styles.addButton} onClick={handleAdd}>
          <span>+</span><span>Добавить статью</span>
        </button>
      </div>
      <div className={styles.searchBar}>
        <input type="text" placeholder="Поиск по заголовку..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} className={styles.searchInput} />
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {filteredPosts.length === 0 ? (
        <div className={styles.empty}>{searchQuery ? 'Статьи не найдены' : 'Нет статей'}</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr><th>Изображение</th><th>Заголовок</th><th>Краткое описание</th><th>Дата</th><th>Действия</th></tr>
          </thead>
          <tbody>
            {filteredPosts.map((item) => (
              <tr key={item.id}>
                <td><img src={getMediaUrl(item.image?.url)} alt={item.title} className={styles.questImage} /></td>
                <td><div className={styles.questName}>{item.title}</div></td>
                <td>
                  <div style={{ maxWidth: '300px', maxHeight: '60px', overflow: 'hidden' }}>
                    {item.excerpt || item.content.replace(/<[^>]*>/g, '').substring(0, 100)}
                    {(item.excerpt || item.content).length > 100 ? '...' : ''}
                  </div>
                </td>
                <td>{new Date(item.date).toLocaleDateString('ru-RU')}</td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.actionButton} onClick={() => handleEdit(item.id)} title="Редактировать">✏️</button>
                    <button className={`${styles.actionButton} ${styles.delete}`} onClick={() => handleDelete(item.id, item.title)} title="Удалить">🗑️</button>
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
