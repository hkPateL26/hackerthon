import React from 'react';
import type { Stream } from '../../../types/stream';
import { useAuthStore } from '../../../store/authStore';
import { StreamStatusBadge } from './StreamStatusBadge';
import styles from './StreamControlPanel.module.css';

interface StreamControlPanelProps {
  stream: Stream | null;
  isLoading: boolean;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onRefresh: () => void;
}

export const StreamControlPanel: React.FC<StreamControlPanelProps> = ({
  stream,
  isLoading,
  onStart,
  onStop,
  onRestart,
  onRefresh,
}) => {
  const { user } = useAuthStore();
  const role = user?.role;

  const canOperate = role === 'ADMIN' || role === 'SUPERVISOR' || role === 'OPERATOR';
  const canRestart = role === 'ADMIN' || role === 'SUPERVISOR';

  const isRunning = stream?.status === 'RUNNING';
  const isStarting = stream?.status === 'STARTING';
  const isStopping = stream?.status === 'STOPPING';

  return (
    <div className={styles.panelCard} aria-label="Live Stream Ingestion Controls">
      <div className={styles.panelHeader}>
        <div className={styles.statusArea}>
          <span className={styles.sectionLabel}>STREAM STATUS</span>
          <StreamStatusBadge status={stream?.status || 'STOPPED'} />
        </div>

        <div className={styles.buttonGroup}>
          {!isRunning && !isStarting && (
            <button
              type="button"
              className={styles.startBtn}
              onClick={onStart}
              disabled={isLoading || !canOperate}
              id="stream-start-btn"
            >
              <span>▶</span> Start Stream
            </button>
          )}

          {(isRunning || isStarting) && (
            <button
              type="button"
              className={styles.stopBtn}
              onClick={onStop}
              disabled={isLoading || isStopping || !canOperate}
              id="stream-stop-btn"
            >
              <span>⏹</span> Stop Stream
            </button>
          )}

          {canRestart && (
            <button
              type="button"
              className={styles.restartBtn}
              onClick={onRestart}
              disabled={isLoading}
              title="Restart FFmpeg pipeline (Admin/Supervisor)"
              id="stream-restart-btn"
            >
              <span>🔄</span> Restart
            </button>
          )}

          <button
            type="button"
            className={styles.refreshBtn}
            onClick={onRefresh}
            disabled={isLoading}
            title="Poll current status"
            aria-label="Refresh stream status"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Stream Telemetry Info */}
      {stream && (
        <div className={styles.telemetryGrid}>
          <div className={styles.telemetryItem}>
            <span className={styles.telemetryKey}>Source Type</span>
            <span className={styles.telemetryVal}>{stream.sourceType}</span>
          </div>
          <div className={styles.telemetryItem}>
            <span className={styles.telemetryKey}>Output Format</span>
            <span className={styles.telemetryVal}>{stream.outputType}</span>
          </div>
          <div className={styles.telemetryItem}>
            <span className={styles.telemetryKey}>Started At</span>
            <span className={styles.telemetryVal}>
              {stream.startedAt ? new Date(stream.startedAt).toLocaleTimeString() : 'N/A'}
            </span>
          </div>
          <div className={styles.telemetryItem}>
            <span className={styles.telemetryKey}>Endpoint</span>
            <span className={styles.endpointVal} title={stream.playbackUrl || 'N/A'}>
              {stream.playbackUrl || 'None'}
            </span>
          </div>
        </div>
      )}

      {/* Error Message banner if stream is in error */}
      {stream?.lastError && (
        <div className={styles.errorNotice} role="alert">
          <span className={styles.errorIcon}>⚠️</span>
          <span>{stream.lastError}</span>
        </div>
      )}
    </div>
  );
};
