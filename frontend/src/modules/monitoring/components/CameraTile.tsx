import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MonitoringSlot } from '../types/monitoring';
import type { Camera } from '../../../types/camera';
import { VideoPlayer } from '../../../components/video/VideoPlayer';
import { useAuthStore } from '../../../store/authStore';
import styles from './CameraTile.module.css';

interface CameraTileProps {
  slot: MonitoringSlot;
  onOpenPicker: (slotId: string) => void;
  onStartStream: (slotId: string) => void;
  onStopStream: (slotId: string) => void;
  onRestartStream: (slotId: string) => void;
  onRetryStream: (slotId: string) => void;
  onRemoveCamera: (slotId: string) => void;
  onViewDetails: (camera: Camera) => void;
}

export const CameraTile: React.FC<CameraTileProps> = ({
  slot,
  onOpenPicker,
  onStartStream,
  onStopStream,
  onRestartStream,
  onRetryStream,
  onRemoveCamera,
  onViewDetails,
}) => {
  const tileRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const role = user?.role;

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const canOperate = role === 'ADMIN' || role === 'SUPERVISOR' || role === 'OPERATOR';
  const canRestart = role === 'ADMIN' || role === 'SUPERVISOR';

  const { camera, streamStatus, playbackUrl, isLoading, error } = slot;

  // Toggle browser Fullscreen API on this tile
  const toggleFullscreen = () => {
    if (!tileRef.current) return;
    if (!document.fullscreenElement) {
      tileRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  };

  const handleViewMap = () => {
    if (!camera) return;
    navigate(`/map?search=${encodeURIComponent(camera.cameraCode)}`);
  };

  // If slot is empty, render assign card
  if (!camera) {
    return (
      <div
        className={styles.emptySlot}
        aria-label={`Empty monitoring slot ${slot.slotId}`}
        id={`tile-${slot.slotId}`}
      >
        <span className={styles.emptyIcon}>📷</span>
        <span className={styles.emptySlotLabel}>{slot.slotId.toUpperCase()}</span>
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => onOpenPicker(slot.slotId)}
          id={`add-cam-btn-${slot.slotId}`}
        >
          <span>+</span> Assign Camera
        </button>
      </div>
    );
  }

  const isRunning = streamStatus === 'RUNNING';
  const isStarting = streamStatus === 'STARTING';
  const isStopping = streamStatus === 'STOPPING';

  const getRegistryBadge = () => {
    switch (camera.status) {
      case 'ONLINE':
        return <span className={`${styles.statusBadge} ${styles.regOnline}`}>Reg: Online</span>;
      case 'OFFLINE':
        return <span className={`${styles.statusBadge} ${styles.regOffline}`}>Reg: Offline</span>;
      case 'MAINTENANCE':
        return <span className={`${styles.statusBadge} ${styles.regMaint}`}>Reg: Maint</span>;
      default:
        return <span className={styles.statusBadge}>Reg: {camera.status}</span>;
    }
  };

  const getStreamBadge = () => {
    switch (streamStatus) {
      case 'RUNNING':
        return <span className={`${styles.statusBadge} ${styles.streamRunning}`}>Live HLS</span>;
      case 'STARTING':
        return <span className={`${styles.statusBadge} ${styles.streamStarting}`}>Starting</span>;
      case 'STOPPING':
        return <span className={`${styles.statusBadge} ${styles.streamStarting}`}>Stopping</span>;
      case 'ERROR':
        return <span className={`${styles.statusBadge} ${styles.streamError}`}>Stream Error</span>;
      default:
        return <span className={`${styles.statusBadge} ${styles.streamStopped}`}>Stopped</span>;
    }
  };

  return (
    <div
      ref={tileRef}
      className={`${styles.tile} ${isRunning ? styles.tileActive : ''} ${
        streamStatus === 'ERROR' ? styles.tileError : ''
      }`}
      aria-label={`Monitoring Tile for ${camera.name} (${camera.cameraCode})`}
      id={`tile-${slot.slotId}`}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.codeBadge}>{camera.cameraCode}</span>
          <span className={styles.cameraTitle} title={camera.name}>
            {camera.name}
          </span>
        </div>
        <div className={styles.headerRight}>
          {getRegistryBadge()}
          {getStreamBadge()}
        </div>
      </div>

      {/* Video Area */}
      <div className={styles.videoArea}>
        {isRunning && playbackUrl ? (
          <VideoPlayer
            src={playbackUrl}
            isStreaming={true}
            cameraName={camera.name}
            cameraCode={camera.cameraCode}
            autoPlay={true}
            onRetry={() => onRetryStream(slot.slotId)}
          />
        ) : isStarting ? (
          <div className={styles.placeholder}>
            <div className={styles.spinner} />
            <span className={styles.placeholderText}>Starting video stream pipeline...</span>
          </div>
        ) : streamStatus === 'ERROR' ? (
          <div className={styles.errorBanner} role="alert">
            <span>⚠️ {error || 'Stream pipeline failure'}</span>
            <button
              type="button"
              className={styles.retryBtn}
              onClick={() => onRetryStream(slot.slotId)}
              disabled={isLoading || !canOperate}
            >
              🔄 Retry Feed
            </button>
          </div>
        ) : (
          <div className={styles.placeholder}>
            <span className={styles.placeholderIcon}>📹</span>
            <span className={styles.placeholderText}>
              {camera.locationName || 'Live Camera Feed Standby'}
            </span>
            {!camera.isActive && (
              <span style={{ color: '#f87171', fontSize: '0.75rem' }}>
                Camera disabled in registry
              </span>
            )}
            <button
              type="button"
              className={styles.startFeedBtn}
              onClick={() => onStartStream(slot.slotId)}
              disabled={isLoading || !canOperate}
              id={`tile-start-btn-${camera.cameraCode}`}
            >
              <span>▶</span> Start Feed
            </button>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          {!isRunning && !isStarting ? (
            <button
              type="button"
              className={`${styles.tileBtn} ${styles.tileBtnStart}`}
              onClick={() => onStartStream(slot.slotId)}
              disabled={isLoading || !canOperate}
              title="Start live video stream"
              id={`slot-start-${slot.slotId}`}
            >
              <span>▶</span> Start
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.tileBtn} ${styles.tileBtnStop}`}
              onClick={() => onStopStream(slot.slotId)}
              disabled={isLoading || isStopping || !canOperate}
              title="Stop live video stream"
              id={`slot-stop-${slot.slotId}`}
            >
              <span>⏹</span> Stop
            </button>
          )}

          {canRestart && (
            <button
              type="button"
              className={styles.tileBtn}
              onClick={() => onRestartStream(slot.slotId)}
              disabled={isLoading}
              title="Restart stream pipeline"
            >
              🔄
            </button>
          )}
        </div>

        <div className={styles.footerRight}>
          <button
            type="button"
            className={styles.tileBtn}
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
            id={`tile-fs-${slot.slotId}`}
          >
            <span>⛶</span>
          </button>

          <button
            type="button"
            className={styles.tileBtn}
            onClick={handleViewMap}
            title="Locate camera on GIS Map"
            id={`tile-map-${slot.slotId}`}
          >
            <span>🗺️</span>
          </button>

          <button
            type="button"
            className={styles.tileBtn}
            onClick={() => onViewDetails(camera)}
            title="View technical metadata"
            id={`tile-details-${slot.slotId}`}
          >
            <span>👁️</span>
          </button>

          <button
            type="button"
            className={`${styles.tileBtn} ${styles.tileBtnDanger}`}
            onClick={() => onRemoveCamera(slot.slotId)}
            title="Clear camera from slot"
            id={`tile-remove-${slot.slotId}`}
          >
            <span>✕</span>
          </button>
        </div>
      </div>
    </div>
  );
};
