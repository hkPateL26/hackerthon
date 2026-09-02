import React from 'react';
import type { StreamStatus } from '../../../types/stream';
import styles from './StreamStatusBadge.module.css';

interface StreamStatusBadgeProps {
  status: StreamStatus;
}

export const StreamStatusBadge: React.FC<StreamStatusBadgeProps> = ({ status }) => {
  const getBadgeConfig = (s: StreamStatus) => {
    switch (s) {
      case 'RUNNING':
        return {
          label: 'Live Streaming',
          className: styles.statusRunning,
          dotClass: styles.pulseDot,
          icon: '🔴',
        };
      case 'STARTING':
        return {
          label: 'Starting Stream...',
          className: styles.statusStarting,
          dotClass: styles.spinDot,
          icon: '⏳',
        };
      case 'STOPPING':
        return {
          label: 'Stopping...',
          className: styles.statusStopping,
          dotClass: styles.staticDot,
          icon: '⏸️',
        };
      case 'ERROR':
        return {
          label: 'Stream Error',
          className: styles.statusError,
          dotClass: styles.staticDot,
          icon: '⚠️',
        };
      case 'STOPPED':
      default:
        return {
          label: 'Stream Inactive',
          className: styles.statusStopped,
          dotClass: styles.staticDot,
          icon: '⏹️',
        };
    }
  };

  const config = getBadgeConfig(status);

  return (
    <span className={`${styles.badge} ${config.className}`} aria-label={`Stream status: ${config.label}`}>
      <span className={config.dotClass} aria-hidden="true" />
      <span className={styles.label}>{config.label}</span>
    </span>
  );
};
