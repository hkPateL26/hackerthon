import styles from './PlaceholderPage.module.css'

interface PlaceholderPageProps {
  title: string
  icon: string
  description: string
  phase: string
}

/**
 * Generic placeholder component for stub pages.
 * Each Phase 1 page uses this until real implementation.
 */
export function PlaceholderPage({ title, icon, description, phase }: PlaceholderPageProps) {
  return (
    <div className={styles.container}>
      <div className={styles.icon}>{icon}</div>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
      <div className={styles.badge}>{phase}</div>
    </div>
  )
}
