import React from 'react';
import type { MonitoringStats } from '../types/monitoring';
import styles from './MonitoringSummary.module.css';

interface MonitoringSummaryProps {
  stats: MonitoringStats;
}

export const MonitoringSummary: React.FC<MonitoringSummaryProps> = ({ stats }) => {
  const isAtCapacity = stats.runningStreams >= stats.maxConcurrentStreams;

  return (
    <div className={styles.summaryRow} aria-label="Monitoring Operational Counters">
      <div className={styles.chip} title="Total camera slots currently monitored">
        <span>Monitored:</span>
        <span className={styles.chipValue} id="monitored-count">
          {stats.assignedCount} / {stats.totalSlots}
        </span>
      </div>

      <div className={`${styles.chip} ${styles.chipRunning}`} title="Streams currently active and playing">
        <span>● Running:</span>
        <span className={styles.chipValue} id="running-count">
          {stats.runningStreams}
        </span>
      </div>

      <div className={`${styles.chip} ${styles.chipStopped}`} title="Monitored cameras in stopped state">
        <span>○ Stopped:</span>
        <span className={styles.chipValue} id="stopped-count">
          {stats.stoppedStreams}
        </span>
      </div>

      {stats.errorStreams > 0 && (
        <div className={`${styles.chip} ${styles.chipError}`} title="Streams with errors or offline cameras">
          <span>⚠️ Errors:</span>
          <span className={styles.chipValue} id="error-count">
            {stats.errorStreams}
          </span>
        </div>
      )}

      <div
        className={`${styles.concurrencyMeter} ${isAtCapacity ? styles.meterFull : ''}`}
        title={`Concurrency cap: max ${stats.maxConcurrentStreams} active streams supported on prototype`}
      >
        <span>Concurrency:</span>
        <span>
          {stats.runningStreams} / {stats.maxConcurrentStreams} Max
        </span>
      </div>
    </div>
  );
};
