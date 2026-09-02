import React from 'react';
import styles from './ANPRBadge.module.css';
import type { AnprResult } from '../types/anpr';

interface ANPRBadgeProps {
  active?: boolean;
  latestResult?: AnprResult | null;
  onClick?: () => void;
}

export const ANPRBadge: React.FC<ANPRBadgeProps> = ({
  active = true,
  latestResult,
  onClick,
}) => {
  return (
    <div
      className={styles.anprBadgeContainer}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      title={latestResult ? `Latest plate: ${latestResult.plateTextNormalized || latestResult.plateTextRaw}` : 'ANPR Active'}
    >
      <div className={`${styles.anprIndicator} ${!active ? styles.anprOff : ''}`}>
        {active && <span className={styles.pulseDot} />}
        <span>ANPR: {active ? 'ON' : 'OFF'}</span>
      </div>

      {active && latestResult && (
        <div className={styles.recentPlateBadge}>
          <span>{latestResult.plateTextNormalized || latestResult.plateTextRaw}</span>
          {latestResult.finalConfidence !== null && (
            <span className={styles.confTag}>
              {(latestResult.finalConfidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
};
