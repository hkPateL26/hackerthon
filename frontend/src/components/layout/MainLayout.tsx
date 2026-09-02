import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import styles from './MainLayout.module.css';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/cameras', label: 'Cameras', icon: '📷' },
  { path: '/alerts', label: 'Alerts', icon: '🚨' },
  { path: '/incidents', label: 'Incidents', icon: '📋' },
];

export function MainLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const getRoleBadgeClass = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return styles.roleAdmin;
      case 'SUPERVISOR':
        return styles.roleSupervisor;
      default:
        return styles.roleOperator;
    }
  };

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
          <div className={styles.phase}>Phase 2 — Auth & RBAC</div>
        </div>
      </aside>

      {/* Main content */}
      <div className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>Gujarat Police CCTV Command Center</h1>
          <div className={styles.headerRight}>
            <div className={styles.systemStatus}>
              <span className={styles.statusDot} title="API Online" />
              <span className={styles.statusText}>System Online</span>
            </div>

            {user && (
              <div className={styles.userProfile}>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user.fullName}</span>
                  <span className={styles.userEmail}>{user.email}</span>
                </div>
                <span className={`${styles.roleBadge} ${getRoleBadgeClass(user.role)}`}>
                  {user.role}
                </span>
              </div>
            )}

            <button
              type="button"
              className={styles.logoutBtn}
              onClick={handleLogout}
              title="Sign Out of Session"
              id="logout-btn"
            >
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
