import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { CameraGeoJSONProperties } from '../../../types/gis';
import { STATUS_COLORS } from '../utils/markerIcons';
import styles from './CameraDetailDrawer.module.css';

interface CameraDetailDrawerProps {
  camera: CameraGeoJSONProperties | null;
  onClose: () => void;
}

export const CameraDetailDrawer: React.FC<CameraDetailDrawerProps> = ({ camera, onClose }) => {
  const navigate = useNavigate();

  if (!camera) return null;

  const statusConfig = STATUS_COLORS[camera.status] || STATUS_COLORS.UNKNOWN;

  const handleOpenRegistry = () => {
    navigate(`/cameras?search=${encodeURIComponent(camera.cameraCode)}`);
  };

  return (
    <aside className={styles.drawer} aria-label="Camera Details Drawer">
      <div className={styles.drawerHeader}>
        <div className={styles.headerInfo}>
          <span className={styles.cameraCodeBadge}>{camera.cameraCode}</span>
          <h2 className={styles.cameraTitle}>{camera.name}</h2>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close Camera Details"
        >
          ✕
        </button>
      </div>

      <div className={styles.drawerBody}>
        {/* Status Card */}
        <div className={styles.statusCard}>
          <div className={styles.statusIndicator}>
            <span
              className={styles.statusPulse}
              style={{ backgroundColor: statusConfig.bg }}
            />
            <span className={styles.statusName}>
              {statusConfig.symbol} {statusConfig.label}
            </span>
          </div>
          <span className={styles.typeBadge}>{camera.cameraType}</span>
        </div>

        {/* Location Section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>📍 Location & Jurisdiction</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Location</span>
              <span className={styles.infoValue}>{camera.locationName || 'N/A'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>District</span>
              <span className={styles.infoValue}>{camera.district || 'N/A'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Police Station</span>
              <span className={styles.infoValue}>{camera.policeStation || 'N/A'}</span>
            </div>
          </div>
        </section>

        {/* Technical Specs Section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>⚙️ Technical Specifications</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Vendor</span>
              <span className={styles.infoValue}>{camera.vendor || 'N/A'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Model</span>
              <span className={styles.infoValue}>{camera.model || 'N/A'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Stream URL</span>
              <span className={styles.streamValue} title={camera.streamUrl}>
                {camera.streamUrl || 'Not configured'}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Installed</span>
              <span className={styles.infoValue}>
                {camera.installedAt ? new Date(camera.installedAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Last Seen</span>
              <span className={styles.infoValue}>
                {camera.lastSeenAt ? new Date(camera.lastSeenAt).toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>
        </section>

        {/* Note: Stream Playback Phase info */}
        <div className={styles.infoNotice}>
          <span>ℹ️ Stream ingestion & live AI analytics will be enabled in Phase 5 & 7.</span>
        </div>
      </div>

      <div className={styles.drawerFooter}>
        <button
          type="button"
          className={styles.registryBtn}
          style={{ background: '#10b981' }}
          onClick={() => navigate(`/cameras/${camera.id}/stream`)}
          id="drawer-live-stream-btn"
        >
          <span>▶</span> Live Stream
        </button>
        <button
          type="button"
          className={styles.registryBtn}
          onClick={handleOpenRegistry}
        >
          <span>📷</span> Registry
        </button>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </aside>
  );
};
