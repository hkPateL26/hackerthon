import React from 'react';
import styles from './PlateResultCard.module.css';
import type { AnprResult } from '../types/anpr';

interface PlateResultCardProps {
  result: AnprResult;
  onClick?: (result: AnprResult) => void;
}

export const PlateResultCard: React.FC<PlateResultCardProps> = ({
  result,
  onClick,
}) => {
  const statusClass =
    result.validationStatus === 'VALID'
      ? styles.statusValid
      : result.validationStatus === 'LOW_CONFIDENCE'
      ? styles.statusLowConf
      : styles.statusInvalid;

  const timeFormatted = new Date(result.occurredAt).toLocaleTimeString();

  return (
    <div
      className={styles.plateCard}
      onClick={() => onClick?.(result)}
      title="Click to view full ANPR details"
    >
      <div className={styles.cardHeader}>
        <span className={styles.plateNumber}>
          {result.plateTextNormalized || result.plateTextRaw}
        </span>
        <span className={`${styles.statusTag} ${statusClass}`}>
          {result.validationStatus}
        </span>
      </div>

      <div className={styles.cardBody}>
        {result.plateSnapshotUrl ? (
          <img
            src={result.plateSnapshotUrl}
            alt="Plate Crop"
            className={styles.cropThumbnail}
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className={styles.cropPlaceholder}>No Crop</div>
        )}

        <div className={styles.metaInfo}>
          <div className={styles.vehicleRow}>
            <span>{result.vehicleClass || 'vehicle'}</span>
            {result.trackId !== null && (
              <span className={styles.trackTag}>Track #{result.trackId}</span>
            )}
          </div>
          <div>{result.cameraCode || 'Camera'}</div>
        </div>
      </div>

      <div className={styles.cardFooter}>
        <span>{timeFormatted}</span>
        {result.finalConfidence !== null && (
          <span className={styles.confidenceScore}>
            Conf: {(result.finalConfidence * 100).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
};
