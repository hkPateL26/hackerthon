import React, { useState, useMemo } from 'react';
import styles from './RecentANPRPanel.module.css';
import { useRecentANPR } from '../hooks/useRecentANPR';
import { PlateResultCard } from './PlateResultCard';
import type { AnprResult } from '../types/anpr';

interface RecentANPRPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (result: AnprResult) => void;
  selectedCameraId?: string;
}

export const RecentANPRPanel: React.FC<RecentANPRPanelProps> = ({
  isOpen,
  onClose,
  onSelectResult,
  selectedCameraId,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { results, loading, error } = useRecentANPR(
    selectedCameraId ? { cameraId: selectedCameraId } : undefined,
    isOpen ? 3000 : 0,
  );

  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      // Filter by validation status
      if (filterStatus !== 'ALL' && item.validationStatus !== filterStatus) {
        return false;
      }
      // Filter by search query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toUpperCase();
        const norm = (item.plateTextNormalized || '').toUpperCase();
        const raw = (item.plateTextRaw || '').toUpperCase();
        const cam = (item.cameraCode || '').toUpperCase();
        if (!norm.includes(q) && !raw.includes(q) && !cam.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [results, filterStatus, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className={styles.panelOverlay} onClick={onClose}>
      <div
        className={styles.panelContainer}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <span>ANPR Recognition Feed</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              ({filteredResults.length} records)
            </span>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={styles.searchSection}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search plate or camera..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className={styles.filterPills}>
            {['ALL', 'VALID', 'LOW_CONFIDENCE', 'INVALID_FORMAT'].map((st) => (
              <button
                key={st}
                className={`${styles.filterPill} ${filterStatus === st ? styles.filterPillActive : ''}`}
                onClick={() => setFilterStatus(st)}
              >
                {st === 'ALL' ? 'All Status' : st}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.cardsList}>
          {loading && results.length === 0 && (
            <div className={styles.loadingSpinner}>Loading observations...</div>
          )}

          {error && <div style={{ color: '#ef4444', fontSize: '12px' }}>{error}</div>}

          {!loading && filteredResults.length === 0 && (
            <div className={styles.emptyState}>
              <span>No ANPR observations found</span>
              {searchQuery && (
                <button
                  style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '12px' }}
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </button>
              )}
            </div>
          )}

          {filteredResults.map((res) => (
            <PlateResultCard
              key={res.id}
              result={res}
              onClick={onSelectResult}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
