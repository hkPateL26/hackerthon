import React, { useState, useEffect } from 'react';
import type { TrackedObjectItem } from '../types/tracking';
import { anprService } from '../../anpr';
import styles from './TrackDetailsDrawer.module.css';

interface TrackDetailsDrawerProps {
  track: TrackedObjectItem | null;
  onClose: () => void;
}

export const TrackDetailsDrawer: React.FC<TrackDetailsDrawerProps> = ({
  track,
  onClose,
}) => {
  const [anprResult, setAnprResult] = useState<any>(null);

  useEffect(() => {
    if (track && track.category === 'VEHICLE' && track.trackId) {
      anprService
        .getRecentAnpr({
          trackId: track.trackId,
          sessionId: track.sessionId || undefined,
        })
        .then((res) => {
          if (res.items && res.items.length > 0) {
            setAnprResult(res.items[0]);
          } else {
            setAnprResult(null);
          }
        })
        .catch(() => setAnprResult(null));
    } else {
      setAnprResult(null);
    }
  }, [track]);

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

          {track.category === 'VEHICLE' && (
            <div
              className={styles.detailRow}
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              <span className={styles.label}>ANPR Plate:</span>
              <span
                className={styles.value}
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: '#38bdf8',
                }}
              >
                {anprResult
                  ? `${anprResult.plateTextNormalized || anprResult.plateTextRaw} (${Math.round((anprResult.finalConfidence || 0) * 100)}%)`
                  : 'Pending / Not observed'}
              </span>
            </div>
          )}

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
