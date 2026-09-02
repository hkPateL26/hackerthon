import React from 'react';
import type { LayoutMode, MonitoringStats } from '../types/monitoring';
import { LayoutSelector } from './LayoutSelector';
import { MonitoringSummary } from './MonitoringSummary';
import styles from './MonitoringToolbar.module.css';

interface MonitoringToolbarProps {
  currentLayout: LayoutMode;
  stats: MonitoringStats;
  concurrencyWarning: string | null;
  onSelectLayout: (layout: LayoutMode) => void;
  onStartAll: () => void;
  onStopAll: () => void;
  onClearAll: () => void;
  onAddCamera: () => void;
  onDismissWarning: () => void;
  hasEmptySlots: boolean;
  onToggleDetectionsFeed?: () => void;
  isDetectionsFeedOpen?: boolean;
}

export const MonitoringToolbar: React.FC<MonitoringToolbarProps> = ({
  currentLayout,
  stats,
  concurrencyWarning,
  onSelectLayout,
  onStartAll,
  onStopAll,
  onClearAll,
  onAddCamera,
  onDismissWarning,
  hasEmptySlots,
  onToggleDetectionsFeed,
  isDetectionsFeedOpen = false,
}) => {
  return (
    <header className={styles.toolbar} aria-label="Monitoring Dashboard Controls">
      {/* Top row: Title + Actions */}
      <div className={styles.topRow}>
        <div className={styles.titleArea}>
          <span className={styles.icon}>🖥️</span>
          <div>
            <h1 className={styles.title}>CCTV Unified Monitoring</h1>
          </div>
        </div>

        <div className={styles.controlsArea}>
          <LayoutSelector
            currentLayout={currentLayout}
            onSelectLayout={onSelectLayout}
          />

          {onToggleDetectionsFeed && (
            <button
              type="button"
              className={`${styles.actionBtn} ${
                isDetectionsFeedOpen ? styles.clearAllBtn : styles.addCameraBtn
              }`}
              onClick={onToggleDetectionsFeed}
              title="Toggle Live Person & Vehicle Detections Feed"
              id="toolbar-detection-feed-btn"
            >
              <span>🚨</span> {isDetectionsFeedOpen ? 'Hide Feed' : 'Live Feed'}
            </button>
          )}

          <button
            type="button"
            className={`${styles.actionBtn} ${styles.addCameraBtn}`}
            onClick={onAddCamera}
            disabled={!hasEmptySlots}
            title={hasEmptySlots ? 'Add camera to an available slot' : 'All slots are occupied'}
            id="toolbar-add-camera-btn"
          >
            <span>+</span> Add Camera
          </button>

          <button
            type="button"
            className={`${styles.actionBtn} ${styles.startAllBtn}`}
            onClick={onStartAll}
            disabled={stats.assignedCount === 0 || stats.runningStreams >= stats.maxConcurrentStreams}
            title="Start all visible stopped streams up to concurrency cap"
            id="toolbar-start-all-btn"
          >
            <span>▶</span> Start Visible
          </button>

          <button
            type="button"
            className={`${styles.actionBtn} ${styles.stopAllBtn}`}
            onClick={onStopAll}
            disabled={stats.runningStreams === 0}
            title="Stop all currently running streams"
            id="toolbar-stop-all-btn"
          >
            <span>⏹</span> Stop All
          </button>

          <button
            type="button"
            className={`${styles.actionBtn} ${styles.clearAllBtn}`}
            onClick={onClearAll}
            disabled={stats.assignedCount === 0}
            title="Clear all cameras from the monitoring grid"
            id="toolbar-clear-all-btn"
          >
            <span>✕</span> Clear All
          </button>
        </div>
      </div>

      {/* Bottom row: Operational summary */}
      <div className={styles.bottomRow}>
        <MonitoringSummary stats={stats} />
      </div>

      {/* Concurrency / Safe Warning Banner */}
      {concurrencyWarning && (
        <div className={styles.warningBanner} role="alert" id="concurrency-warning-banner">
          <div className={styles.warningText}>
            <span>⚠️</span>
            <span>{concurrencyWarning}</span>
          </div>
          <button
            type="button"
            className={styles.dismissWarningBtn}
            onClick={onDismissWarning}
            aria-label="Dismiss warning"
          >
            ✕
          </button>
        </div>
      )}
    </header>
  );
};
