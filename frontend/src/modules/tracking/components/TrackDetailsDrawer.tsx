import React from 'react';
import type { TrackedObjectItem } from '../types/tracking';
import styles from './TrackDetailsDrawer.module.css';

interface TrackDetailsDrawerProps {
  track: TrackedObjectItem | null;
  onClose: () => void;
}

export const TrackDetailsDrawer: React.FC<TrackDetailsDrawerProps> = ({
  track,
  onClose,
}) => {
  if (!track) return null;

  const history = track.metadata?.history || [];

  return (
    <div className={styles.drawerOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>
            Track #{track.trackId} ({track.category})
          </span>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close track details"
          >
            ✕
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.detailRow}>
            <span className={styles.label}>Category:</span>
            <span className={styles.value}>{track.category}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.label}>Detected Class:</span>
            <span className={styles.value}>{track.detectedClass}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.label}>Status:</span>
            <span className={styles.value}>{track.status}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.label}>Confidence:</span>
            <span className={styles.value}>
              {track.confidence !== null
                ? `${Math.round(track.confidence * 100)}%`
                : '—'}
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.label}>Detection Count:</span>
            <span className={styles.value}>{track.detectionCount} frames</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.label}>First Seen:</span>
            <span className={styles.value}>
              {new Date(track.firstSeenAt).toLocaleTimeString()}
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.label}>Last Seen:</span>
            <span className={styles.value}>
              {new Date(track.lastSeenAt).toLocaleTimeString()}
            </span>
          </div>

          {track.sessionId && (
            <div className={styles.detailRow}>
              <span className={styles.label}>Session UUID:</span>
              <span className={styles.value} style={{ fontSize: '0.7rem' }}>
                {track.sessionId}
              </span>
            </div>
          )}

          {track.bbox && (
            <div className={styles.detailRow}>
              <span className={styles.label}>Bounding Box:</span>
              <span className={styles.value}>
                [{track.bbox.x}, {track.bbox.y}, {track.bbox.width}, {track.bbox.height}]
              </span>
            </div>
          )}

          <div className={styles.historySection}>
            <div className={styles.label} style={{ marginBottom: '0.4rem' }}>
              Trajectory History ({history.length} center pts):
            </div>
            {history.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.75rem' }}>No history points</div>
            ) : (
              <div className={styles.historyList}>
                {history.map((pt, idx) => (
                  <div key={idx}>
                    pt #{idx + 1}: ({pt[0]}, {pt[1]})
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
