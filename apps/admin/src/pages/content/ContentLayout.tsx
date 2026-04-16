import { NavLink, Outlet, useLocation } from 'react-router-dom';
import styles from './ContentLayout.module.css';

interface EntityItem {
  id: string;
  name: string;
  path: string;
  icon: string;
}

const contentEntities: EntityItem[] = [
  { id: 'quests', name: 'Квесты', path: '/content/quests', icon: '🎮' },
  { id: 'news', name: 'Новости', path: '/content/news', icon: '📰' },
  { id: 'reviews', name: 'Отзывы', path: '/content/reviews', icon: '⭐' },
  { id: 'review-sources', name: 'Источники отзывов', path: '/content/review-sources', icon: '📡' },
  { id: 'about', name: 'О нас (факты)', path: '/content/about', icon: 'ℹ️' },
  { id: 'pages', name: 'Страницы', path: '/content/pages', icon: '📄' },

];

export default function ContentLayout() {
  useLocation(); // Used for NavLink active state

  return (
    <div className={styles.contentLayout}>
      {/* Entity Sidebar */}
      <aside className={styles.entitySidebar}>
        <div className={styles.entitySidebarHeader}>
          <div className={styles.entitySidebarTitle}>Контент</div>
        </div>
        <nav className={styles.entityList}>
          {contentEntities.map((entity) => (
            <NavLink
              key={entity.id}
              to={entity.path}
              className={({ isActive }) =>
                `${styles.entityItem} ${isActive ? styles.active : ''}`
              }
            >
              <span className={styles.entityIcon}>{entity.icon}</span>
              <span className={styles.entityName}>{entity.name}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  );
}
