import { NavLink, Outlet, useLocation } from 'react-router-dom';
import styles from './ReferenceLayout.module.css';

interface EntityItem {
  id: string;
  name: string;
  path: string;
  icon: string;
}

const referenceEntities: EntityItem[] = [
  { id: 'suppliers', name: 'Поставщики', path: '/reference/suppliers', icon: '🚚' },
  { id: 'cakes', name: 'Торты', path: '/reference/cakes', icon: '🎂' },
  { id: 'show-programs', name: 'Шоу-программы', path: '/reference/show-programs', icon: '🎭' },
  { id: 'decorations', name: 'Декорации', path: '/reference/decorations', icon: '🎨' },
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
