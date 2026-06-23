import { useState, useEffect, useCallback, useMemo } from 'react';
import { getIikoMenu, syncIikoMenu, type IikoMenuItem } from '../../api/iiko';
import { toast } from '../../components/ui/Toast';
import styles from './IikoMenuPage.module.css';

export default function IikoMenuPage() {
  const [menuItems, setMenuItems] = useState<IikoMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadMenu = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getIikoMenu();
      setMenuItems(data);
    } catch (err) {
      toast.error('Ошибка загрузки меню iiko');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await syncIikoMenu();
      setSyncMessage(result.message);
      toast.success(result.message);
      // Reload menu after sync
      await loadMenu();
    } catch (err) {
      toast.error('Ошибка синхронизации с iiko');
    } finally {
      setSyncing(false);
    }
  };

  // Group items by category
  const groupedItems = useMemo(() => {
    const filtered = menuItems.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    const groups: Record<string, IikoMenuItem[]> = {};
    for (const item of filtered) {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    }
    return groups;
  }, [menuItems, searchQuery]);

  const categoryNames = useMemo(() => Object.keys(groupedItems).sort(), [groupedItems]);

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Меню iiko</h1>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            className={styles.syncButton}
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? 'Синхронизация...' : 'Синхронизировать с iiko'}
          </button>
          {syncMessage && (
            <span className={styles.syncStatus}>{syncMessage}</span>
          )}
        </div>
      </div>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Поиск по названию или категории..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {categoryNames.length === 0 ? (
        <div className={styles.empty}>
          {searchQuery ? 'Позиции не найдены' : 'Меню пусто. Нажмите "Синхронизировать с iiko"'}
        </div>
      ) : (
        categoryNames.map((category) => (
          <div key={category} className={styles.categoryGroup}>
            <h2 className={styles.categoryTitle}>{category}</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Департамент</th>
                  <th>Цена</th>
                </tr>
              </thead>
              <tbody>
                {groupedItems[category].map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.itemName}>{item.name}</div>
                      <div className={styles.itemIikoId}>{item.iikoId}</div>
                    </td>
                    <td>
                      {item.department ? (
                        <span className={styles.department}>{item.department}</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <span className={styles.price}>
                        {Number(item.price).toLocaleString('ru-RU')} &#8381;
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
