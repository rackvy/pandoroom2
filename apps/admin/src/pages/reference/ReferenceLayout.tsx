import { NavLink, Outlet, useLocation } from 'react-router-dom';
import styles from './ReferenceLayout.module.css';

interface EntityItem {
  id: string;
  name: string;
  path: string;
  icon: string;
}

// Поставщики, Торты, Шоу-программы и Декорации скрыты: данные ведутся в iiko.
// Страницы и роуты оставлены намеренно, скрыто только меню.
const referenceEntities: EntityItem[] = [
  { id: 'iiko-menu', name: 'Меню iiko', path: '/reference/iiko-menu', icon: '🍽️' },
  { id: 'notification-templates', name: 'Шаблоны уведомлений', path: '/reference/notification-templates', icon: '📨' },
  { id: 'age-restrictions', name: 'Возрастные ограничения', path: '/reference/age-restrictions', icon: '🔞' },
  { id: 'difficulties', name: 'Сложности', path: '/reference/difficulties', icon: '🔥' },
  { id: 'review-sources', name: 'Источники отзывов', path: '/reference/review-sources', icon: '📡' },
];

export default function ReferenceLayout() {
  useLocation(); // Used for NavLink active state

  return (
    <div className={styles.contentLayout}>
      {/* Entity Sidebar */}
      <aside className={styles.entitySidebar}>
        <div className={styles.entitySidebarHeader}>
          <div className={styles.entitySidebarTitle}>Справочники</div>
        </div>
        <nav className={styles.entityList}>
          {referenceEntities.map((entity) => (
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
