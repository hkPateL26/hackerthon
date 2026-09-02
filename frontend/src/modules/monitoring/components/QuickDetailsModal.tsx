import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Camera } from '../../../types/camera';
import styles from './QuickDetailsModal.module.css';

interface QuickDetailsModalProps {
  camera: Camera | null;
  onClose: () => void;
}

export const QuickDetailsModal: React.FC<QuickDetailsModalProps> = ({
  camera,
  onClose,
}) => {
  const navigate = useNavigate();

  if (!camera) return null;

  const handleOpenRegistry = () => {
    navigate(`/cameras?search=${encodeURIComponent(camera.cameraCode)}`);
  };

  const handleOpenMap = () => {
    navigate(`/map?search=${encodeURIComponent(camera.cameraCode)}`);
  };

  const handleOpenDedicatedStream = () => {
    navigate(`/cameras/${camera.id}/stream`);
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Camera Details">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <span className={styles.codeBadge}>{camera.cameraCode}</span>
            <h3 className={styles.title}>{camera.name}</h3>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.grid}>
            <div className={styles.item}>
              <span className={styles.label}>Location</span>
              <span className={styles.value}>{camera.locationName || 'N/A'}</span>
            </div>
            <div className={styles.item}>
              <span className={styles.label}>District</span>
              <span className={styles.value}>{camera.district?.name || 'N/A'}</span>
            </div>
            <div className={styles.item}>
              <span className={styles.label}>Police Station</span>
              <span className={styles.value}>{camera.policeStation?.name || 'N/A'}</span>
            </div>
            <div className={styles.item}>
              <span className={styles.label}>Camera Type</span>
              <span className={styles.value}>{camera.cameraType}</span>
            </div>
            <div className={styles.item}>
              <span className={styles.label}>Registry Status</span>
              <span className={styles.value}>{camera.status}</span>
            </div>
            <div className={styles.item}>
              <span className={styles.label}>Hardware Model</span>
              <span className={styles.value}>
                {camera.vendor || 'Unknown'} {camera.model || ''}
              </span>
            </div>
            <div className={styles.item}>
              <span className={styles.label}>Coordinates</span>
              <span className={styles.value}>
                {camera.latitude.toFixed(5)}, {camera.longitude.toFixed(5)}
              </span>
            </div>
            <div className={styles.item}>
              <span className={styles.label}>Network IP</span>
              <span className={styles.value}>{camera.ipAddress || 'Internal Loop'}</span>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.linkBtn} onClick={handleOpenMap}>
            <span>🗺️</span> View on Map
          </button>
          <button type="button" className={styles.linkBtn} onClick={handleOpenRegistry}>
            <span>📷</span> Registry Record
          </button>
          <button type="button" className={`${styles.linkBtn} ${styles.linkBtnPrimary}`} onClick={handleOpenDedicatedStream}>
            <span>▶</span> Dedicated Feed
          </button>
        </div>
      </div>
    </div>
  );
};
