import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { cameraService } from '../services/camera.service';
import { streamService } from '../services/stream.service';
import type { Camera } from '../types/camera';
import type { Stream } from '../types/stream';
import { VideoPlayer } from '../components/video/VideoPlayer';
import { StreamControlPanel } from '../modules/streaming/components/StreamControlPanel';
import styles from './StreamPlayerPage.module.css';

export const StreamPlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [camera, setCamera] = useState<Camera | null>(null);
  const [stream, setStream] = useState<Stream | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState<boolean>(true);
  const [isOperatingStream, setIsOperatingStream] = useState<boolean>(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Fetch Camera Details
  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setIsLoadingCamera(true);
    setPageError(null);

    cameraService
      .getCameraById(id)
      .then((camData) => {
        if (mounted) {
          setCamera(camData);
        }
      })
      .catch((err) => {
        if (mounted) {
          setPageError(err?.response?.data?.message || 'Failed to load camera details');
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingCamera(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  // 2. Fetch Stream State
  const fetchStreamState = useCallback(async () => {
    if (!id) return;
    try {
      const streamData = await streamService.getStream(id);
      setStream(streamData);
    } catch (err: any) {
      console.warn('Failed to fetch stream state:', err);
    }
  }, [id]);

  useEffect(() => {
    fetchStreamState();
  }, [fetchStreamState]);

  // 3. Polling when stream is in STARTING or RUNNING state
  useEffect(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (stream?.status === 'STARTING' || stream?.status === 'RUNNING') {
      pollTimerRef.current = setInterval(() => {
        if (id) {
          streamService
            .getStreamStatus(id)
            .then((statusData) => {
              setStream((prev) => (prev ? { ...prev, ...statusData } : null));
            })
            .catch(() => {});
        }
      }, 3000);
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [id, stream?.status]);

  // 4. Stream Actions
  const handleStartStream = async () => {
    if (!id) return;
    setIsOperatingStream(true);
    try {
      const updated = await streamService.startStream(id);
      setStream(updated);
    } catch (err: any) {
      setPageError(err?.response?.data?.message || 'Failed to start video stream');
    } finally {
      setIsOperatingStream(false);
    }
  };

  const handleStopStream = async () => {
    if (!id) return;
    setIsOperatingStream(true);
    try {
      const updated = await streamService.stopStream(id);
      setStream(updated);
    } catch (err: any) {
      setPageError(err?.response?.data?.message || 'Failed to stop video stream');
    } finally {
      setIsOperatingStream(false);
    }
  };

  const handleRestartStream = async () => {
    if (!id) return;
    setIsOperatingStream(true);
    try {
      const updated = await streamService.restartStream(id);
      setStream(updated);
    } catch (err: any) {
      setPageError(err?.response?.data?.message || 'Failed to restart video stream');
    } finally {
      setIsOperatingStream(false);
    }
  };

  if (isLoadingCamera) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <span>Loading camera stream workspace...</span>
      </div>
    );
  }

  if (!camera) {
    return (
      <div className={styles.errorContainer}>
        <h2>Camera Not Found</h2>
        <p>{pageError || 'The requested camera does not exist or has been removed.'}</p>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/cameras')}>
          Return to Camera Registry
        </button>
      </div>
    );
  }

  const isStreaming = stream?.status === 'RUNNING';

  return (
    <div className={styles.streamPage}>
      {/* Top Navigation Bar */}
      <div className={styles.pageHeader}>
        <div className={styles.navLinks}>
          <Link to="/cameras" className={styles.navLink}>
            ← Camera Registry
          </Link>
          <span className={styles.navDivider}>/</span>
          <Link to="/map" className={styles.navLink}>
            🗺️ GIS Map
          </Link>
        </div>

        <div className={styles.headerTitleRow}>
          <div className={styles.titleInfo}>
            <span className={styles.cameraCodeBadge}>{camera.cameraCode}</span>
            <h1 className={styles.cameraTitle}>{camera.name}</h1>
          </div>
          <span className={styles.typeBadge}>{camera.cameraType}</span>
        </div>
      </div>

      {/* Error Alert */}
      {pageError && (
        <div className={styles.errorBanner} role="alert">
          <span className={styles.errorIcon}>⚠️</span>
          <span className={styles.errorText}>{pageError}</span>
          <button type="button" className={styles.dismissBtn} onClick={() => setPageError(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Main Stream Area */}
      <div className={styles.mainLayout}>
        {/* Left Column: Player & Stream Controls */}
        <div className={styles.playerColumn}>
          <VideoPlayer
            src={isStreaming ? stream?.playbackUrl || null : null}
            isStreaming={isStreaming}
            cameraName={camera.name}
            cameraCode={camera.cameraCode}
            autoPlay={true}
            onRetry={handleStartStream}
          />

          <StreamControlPanel
            stream={stream}
            isLoading={isOperatingStream}
            onStart={handleStartStream}
            onStop={handleStopStream}
            onRestart={handleRestartStream}
            onRefresh={fetchStreamState}
          />
        </div>

        {/* Right Column: Camera Jurisdiction & Hardware Specs */}
        <div className={styles.specsColumn}>
          <div className={styles.specsCard}>
            <h3 className={styles.specsTitle}>📍 Location & Jurisdiction</h3>
            <div className={styles.specsList}>
              <div className={styles.specRow}>
                <span className={styles.specKey}>Location</span>
                <span className={styles.specVal}>{camera.locationName || 'N/A'}</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specKey}>District</span>
                <span className={styles.specVal}>{camera.district?.name || 'N/A'}</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specKey}>Police Station</span>
                <span className={styles.specVal}>{camera.policeStation?.name || 'N/A'}</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specKey}>Coordinates</span>
                <span className={styles.coordsVal}>
                  {camera.latitude.toFixed(4)}° N, {camera.longitude.toFixed(4)}° E
                </span>
              </div>
            </div>
          </div>

          <div className={styles.specsCard}>
            <h3 className={styles.specsTitle}>⚙️ Hardware & Network</h3>
            <div className={styles.specsList}>
              <div className={styles.specRow}>
                <span className={styles.specKey}>Vendor / Model</span>
                <span className={styles.specVal}>
                  {camera.vendor || 'Generic'} {camera.model ? `(${camera.model})` : ''}
                </span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specKey}>IP & Port</span>
                <span className={styles.specVal}>
                  {camera.ipAddress || '127.0.0.1'}:{camera.port || 554}
                </span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specKey}>Configured Source</span>
                <span className={styles.streamVal} title={camera.streamUrl || 'Default Prototype MP4'}>
                  {camera.streamUrl || 'Local Prototype Loop'}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.noticeCard}>
            <span className={styles.noticeIcon}>🛡️</span>
            <div>
              <div className={styles.noticeTitle}>Gujarat Police Video Security</div>
              <p className={styles.noticeText}>
                Live streams are delivered securely over HLS transport with credentials fully redacted.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
