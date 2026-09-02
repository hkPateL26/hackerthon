import React from 'react';
import type { AISessionStatus } from '../types/analytics';
import styles from './AIControlBadge.module.css';

interface AIControlBadgeProps {
  status: AISessionStatus;
  isLoading?: boolean;
  detectionsCount?: number;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export const AIControlBadge: React.FC<AIControlBadgeProps> = ({
  status,
  isLoading = false,
  detectionsCount = 0,
  onStart,
  onStop,
  disabled = false,
}) => {
  const getBadgeClass = () => {
    switch (status) {
      case 'RUNNING':
        return styles.badgeRunning;
      case 'STARTING':
      case 'STOPPING':
        return styles.badgeStarting;
      case 'ERROR':
        return styles.badgeError;
      default:
        return styles.badgeStopped;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'RUNNING':
        return 'AI Active';
      case 'STARTING':
        return 'AI Starting...';
      case 'STOPPING':
        return 'AI Stopping...';
      case 'ERROR':
        return 'AI Error';
      default:
        return 'AI Off';
    }
  };

  const isRunning = status === 'RUNNING';
  const isTransitioning = status === 'STARTING' || status === 'STOPPING' || isLoading;

  return (
    <div className={styles.container}>
      <span className={`${styles.badge} ${getBadgeClass()}`} id="ai-status-badge">
        {isRunning && <span className={styles.pulseDot} />}
        {getStatusLabel()}
      </span>

      {isRunning && detectionsCount > 0 && (
        <span className={styles.countBadge} title="Detections on this session">
          🎯 {detectionsCount}
        </span>
      )}

      {isRunning ? (
        <button
          type="button"
          className={`${styles.actionBtn} ${styles.btnStop} ${
            isTransitioning || disabled ? styles.btnDisabled : ''
          }`}
          onClick={onStop}
          disabled={isTransitioning || disabled}
          id="ai-stop-btn"
          title="Stop AI video analytics on this camera"
        >
          <span>⏹</span> Stop AI
        </button>
      ) : (
        <button
          type="button"
          className={`${styles.actionBtn} ${styles.btnStart} ${
            isTransitioning || disabled ? styles.btnDisabled : ''
          }`}
          onClick={onStart}
          disabled={isTransitioning || disabled}
          id="ai-start-btn"
          title="Start YOLOv8n object detection on this camera"
        >
          <span>🤖</span> Start AI
        </button>
      )}
    </div>
  );
};
