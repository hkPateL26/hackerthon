import React from 'react';
import styles from './TrackBadge.module.css';

interface TrackBadgeProps {
  isTracking: boolean;
  activeCount: number;
}

export const TrackBadge: React.FC<TrackBadgeProps> = ({
  isTracking,
  activeCount,
}) => {
  if (!isTracking) {
    return (
      <span className={`${styles.badge} ${styles.badgeOff}`} title="Multi-Object Tracking Standby">
        <span className={styles.dot} />
        TRACKS: OFF
      </span>
    );
  }

  return (
    <span
      className={`${styles.badge} ${styles.badgeOn}`}
      title={`Multi-Object Tracking Active (${activeCount} confirmed tracks)`}
    >
      <span className={`${styles.dot} ${styles.dotPulsing}`} />
      <span>TRACKS: ON</span>
      <span className={styles.trackCount}>{activeCount}</span>
    </span>
  );
};
