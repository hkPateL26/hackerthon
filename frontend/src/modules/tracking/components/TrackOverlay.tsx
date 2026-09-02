import React from 'react';
import type { TrackedObjectItem } from '../types/tracking';
import styles from './TrackOverlay.module.css';

interface TrackOverlayProps {
  tracks: TrackedObjectItem[];
  frameWidth?: number;
  frameHeight?: number;
}

export const TrackOverlay: React.FC<TrackOverlayProps> = ({
  tracks,
  frameWidth = 640,
  frameHeight = 360,
}) => {
  return (
    <div className={styles.overlayContainer} aria-hidden="true" id="track-overlay-container">
      <svg
        className={styles.svgOverlay}
        viewBox={`0 0 ${frameWidth} ${frameHeight}`}
        preserveAspectRatio="none"
        id="track-overlay-svg"
      >
        {(tracks || []).map((track) => {
          if (!track.bbox) return null;

          const { x, y, width, height } = track.bbox;
          const isPerson = track.category === 'PERSON';
          const boxClass = isPerson ? styles.trackBoxPerson : styles.trackBoxVehicle;
          const labelBgClass = isPerson ? styles.labelBgPerson : styles.labelBgVehicle;
          const trailClass = isPerson ? styles.trajectoryTrailPerson : styles.trajectoryTrailVehicle;

          const confPercent = track.confidence !== null ? `${Math.round(track.confidence * 100)}%` : '';
          const labelText = `#${track.trackId} ${track.detectedClass.toUpperCase()} ${confPercent}`.trim();
          
          // Estimate label box dimensions
          const labelWidth = Math.max(70, labelText.length * 7.5 + 10);
          const labelHeight = 18;
          const labelY = Math.max(0, y - labelHeight);

          // Trajectory polyline
          const historyPoints = track.metadata?.history;
          const polylinePoints =
            Array.isArray(historyPoints) && historyPoints.length > 1
              ? historyPoints.map((pt) => `${pt[0]},${pt[1]}`).join(' ')
              : null;

          return (
            <g key={`track-${track.trackId}`}>
              {/* Trajectory history line */}
              {polylinePoints && (
                <polyline
                  points={polylinePoints}
                  className={trailClass}
                />
              )}

              {/* Bounding box */}
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx={3}
                className={boxClass}
              />

              {/* Tag Label Background */}
              <rect
                x={x}
                y={labelY}
                width={labelWidth}
                height={labelHeight}
                rx={2}
                className={labelBgClass}
              />

              {/* Tag Text */}
              <text
                x={x + 6}
                y={labelY + labelHeight / 2}
                className={styles.labelText}
              >
                {labelText}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
