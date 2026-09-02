import React from 'react';
import styles from './ANPRDetailsDrawer.module.css';
import type { AnprResult } from '../types/anpr';

interface ANPRDetailsDrawerProps {
  result: AnprResult | null;
  onClose: () => void;
}

export const ANPRDetailsDrawer: React.FC<ANPRDetailsDrawerProps> = ({
  result,
  onClose,
}) => {
  if (!result) return null;

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <div
        className={styles.drawerContainer}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>License Plate Observation</span>
          <button className={styles.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={styles.drawerBody}>
          {/* Plate crop preview */}
          <div className={styles.snapshotBlock}>
            <span className={styles.sectionLabel}>Plate Crop</span>
            {result.plateSnapshotUrl ? (
              <img
                src={result.plateSnapshotUrl}
                alt="License Plate"
                className={styles.plateImageLarge}
              />
            ) : (
              <div
                style={{
                  height: '70px',
                  background: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  fontSize: '11px',
                  borderRadius: '6px',
                }}
              >
                No Plate Crop Available
              </div>
            )}
          </div>

          {/* Vehicle snapshot preview */}
          {result.vehicleSnapshotUrl && (
            <div className={styles.snapshotBlock}>
              <span className={styles.sectionLabel}>Vehicle Snapshot</span>
              <img
                src={result.vehicleSnapshotUrl}
                alt="Vehicle Snapshot"
                className={styles.vehicleImageLarge}
              />
            </div>
          )}

          {/* Details Table */}
          <div className={styles.snapshotBlock}>
            <span className={styles.sectionLabel}>Observation Details</span>
            <table className={styles.detailsTable}>
              <tbody>
                <tr>
                  <td>Normalized Plate</td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#38bdf8' }}>
                      {result.plateTextNormalized || 'N/A'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Raw OCR Output</td>
                  <td>
                    <span className={styles.rawTextValue}>{result.plateTextRaw}</span>
                  </td>
                </tr>
                <tr>
                  <td>Validation Status</td>
                  <td>
                    <span
                      style={{
                        color:
                          result.validationStatus === 'VALID'
                            ? '#10b981'
                            : result.validationStatus === 'LOW_CONFIDENCE'
                            ? '#f59e0b'
                            : '#ef4444',
                      }}
                    >
                      {result.validationStatus}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Final Confidence</td>
                  <td>
                    {result.finalConfidence !== null
                      ? `${(result.finalConfidence * 100).toFixed(1)}%`
                      : 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td>OCR Text Confidence</td>
                  <td>
                    {result.ocrConfidence !== null
                      ? `${(result.ocrConfidence * 100).toFixed(1)}%`
                      : 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td>Plate Detection Conf</td>
                  <td>
                    {result.plateDetectionConfidence !== null
                      ? `${(result.plateDetectionConfidence * 100).toFixed(1)}%`
                      : 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td>Associated Track ID</td>
                  <td>
                    {result.trackId !== null ? `Track #${result.trackId}` : 'None'}
                  </td>
                </tr>
                <tr>
                  <td>Vehicle Class</td>
                  <td>{result.vehicleClass || 'N/A'}</td>
                </tr>
                <tr>
                  <td>Camera</td>
                  <td>{result.cameraCode || result.cameraId}</td>
                </tr>
                <tr>
                  <td>Timestamp</td>
                  <td>{new Date(result.occurredAt).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Session UUID</td>
                  <td style={{ fontSize: '10px', wordBreak: 'break-all' }}>
                    {result.sessionId || 'N/A'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
