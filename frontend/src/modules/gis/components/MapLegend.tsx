import React from 'react';
import { STATUS_COLORS } from '../utils/markerIcons';
import type { CameraStatus } from '../../../types/camera';
import styles from './MapLegend.module.css';

interface MapLegendProps {
  statusCounts: Record<CameraStatus, number>;
  totalCount: number;
}

export const MapLegend: React.FC<MapLegendProps> = ({ statusCounts, totalCount }) => {
  const statuses: CameraStatus[] = ['ONLINE', 'OFFLINE', 'MAINTENANCE', 'DISABLED'];

  return (
    <div className={styles.legendContainer} aria-label="Camera Status Legend">
      <div className={styles.legendHeader}>
        <span className={styles.legendTitle}>Camera Status</span>
        <span className={styles.totalBadge}>{totalCount} Total</span>
      </div>
      <div className={styles.legendList}>
        {statuses.map((status) => {
          const config = STATUS_COLORS[status];
          const count = statusCounts[status] || 0;
          return (
            <div key={status} className={styles.legendItem}>
              <span
                className={styles.statusDot}
                style={{ backgroundColor: config.bg }}
                aria-hidden="true"
              />
              <span className={styles.statusSymbol} aria-hidden="true">{config.symbol}</span>
              <span className={styles.statusLabel}>{config.label}</span>
              <span className={styles.countNumber}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
