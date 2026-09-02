import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import styles from './VideoPlayer.module.css';

interface VideoPlayerProps {
  src: string | null;
  isStreaming: boolean;
  cameraName?: string;
  cameraCode?: string;
  autoPlay?: boolean;
  onRetry?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  isStreaming,
  cameraName = 'Live Camera Feed',
  cameraCode = 'CAM-FEED',
  autoPlay = true,
  onRetry,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  // Live HUD Clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTimeStr(now.toISOString().replace('T', ' ').slice(0, 19));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize HLS.js or native HLS video stream
  const initPlayer = useCallback(() => {
    const video = videoRef.current;
    if (!video || !src || !isStreaming) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Destroy existing HLS instance if active
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 10,
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 4,
        manifestLoadingRetryDelay: 1000,
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (autoPlay) {
          video.play().catch(() => {
            // Autoplay with sound might be blocked, ensure muted
            video.muted = true;
            setIsMuted(true);
            video.play().catch(() => {});
          });
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError('Network error: Unable to reach video stream segment.');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError('Media error: Stream decode error. Attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              setError(`Fatal streaming error: ${data.details || 'Unknown error'}`);
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS for Safari/iOS
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        if (autoPlay) {
          video.play().catch(() => {});
        }
      });
      video.addEventListener('error', () => {
        setError('Native video playback error');
      });
    } else {
      setError('HLS playback is not supported in this browser.');
    }
  }, [src, isStreaming, autoPlay]);

  useEffect(() => {
    initPlayer();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [initPlayer]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const container = playerContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleRetry = () => {
    setError(null);
    initPlayer();
    if (onRetry) onRetry();
  };

  return (
    <div
      ref={playerContainerRef}
      className={styles.playerContainer}
      aria-label={`Video Player for ${cameraName}`}
    >
      {/* Main Video Element */}
      <video
        ref={videoRef}
        className={styles.videoElement}
        playsInline
        muted={isMuted}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setError(null);
        }}
      />

      {/* Top HUD Overlay (Police CCTV Stamp) */}
      <div className={styles.hudHeader}>
        <div className={styles.hudLeft}>
          <span className={styles.policeBadge}>GUJARAT POLICE CCTV</span>
          <span className={styles.cameraCodeTag}>{cameraCode}</span>
        </div>
        <div className={styles.hudRight}>
          <span className={styles.hudTimestamp}>{currentTimeStr}</span>
          {isStreaming && !error && (
            <span className={styles.liveIndicator}>
              <span className={styles.liveDot} /> LIVE
            </span>
          )}
        </div>
      </div>

      {/* Stream Inactive / Stopped State */}
      {!isStreaming && (
        <div className={styles.placeholderOverlay}>
          <div className={styles.placeholderContent}>
            <span className={styles.placeholderIcon}>📹</span>
            <h3>Camera Stream Inactive</h3>
            <p>Click "Start Stream" below to initialize live FFmpeg video ingestion.</p>
          </div>
        </div>
      )}

      {/* Loading Spinner Overlay */}
      {isStreaming && isLoading && !error && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <span>Synchronizing HLS video stream...</span>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className={styles.errorOverlay} role="alert">
          <span className={styles.errorIcon}>⚠️</span>
          <h4>Stream Playback Error</h4>
          <p>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={handleRetry}>
            🔄 Retry Playback
          </button>
        </div>
      )}

      {/* Custom Video Control Bar */}
      {isStreaming && (
        <div className={styles.controlsBar}>
          <div className={styles.controlsLeft}>
            <button
              type="button"
              className={styles.controlBtn}
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              type="button"
              className={styles.controlBtn}
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <span className={styles.cameraTitleText}>{cameraName}</span>
          </div>

          <div className={styles.controlsRight}>
            <button
              type="button"
              className={styles.controlBtn}
              onClick={handleRetry}
              title="Sync / Refresh Stream"
              aria-label="Refresh stream"
            >
              🔄
            </button>
            <button
              type="button"
              className={styles.controlBtn}
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? '↙' : '⛶'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
