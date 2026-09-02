import { Outlet, NavLink } from 'react-router-dom'
import styles from './MainLayout.module.css'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/cameras', label: 'Cameras', icon: '📷' },
  { path: '/alerts', label: 'Alerts', icon: '🚨' },
  { path: '/incidents', label: 'Incidents', icon: '📋' },
]

export function MainLayout() {
  return (
    <div className={styles.shell}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🛡️</span>
          <div>
            <div className={styles.logoTitle}>Gujarat Police</div>
            <div className={styles.logoSubtitle}>CCTV Analytics</div>
          </div>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.phase}>Phase 1 — Foundation</div>
        </div>
      </aside>

      {/* Main content */}
      <div className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>Gujarat Police CCTV Command Center</h1>
          <div className={styles.headerRight}>
            <span className={styles.statusDot} title="API Online" />
            <span className={styles.statusText}>System Online</span>
          </div>
        </header>

        {/* Page content */}
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
