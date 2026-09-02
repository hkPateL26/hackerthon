import styles from './LoginPage.module.css'

/**
 * Login page — Phase 1 stub.
 * Real authentication (JWT, form validation, error handling)
 * will be implemented in Phase 2.
 */
export function LoginPage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>🛡️</div>
        <h1 className={styles.title}>Gujarat Police</h1>
        <p className={styles.subtitle}>CCTV Command Center</p>

        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              className={styles.input}
              placeholder="officer@police.gujarat.gov.in"
              disabled
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              className={styles.input}
              placeholder="••••••••"
              disabled
            />
          </div>

          <div className={styles.notice}>
            ⚠️ Authentication coming in Phase 2
          </div>

          <button type="submit" className={styles.button} disabled>
            Sign In (Phase 2)
          </button>
        </form>

        <p className={styles.version}>v1.0.0 — Phase 1 Foundation</p>
      </div>
    </div>
  )
}
