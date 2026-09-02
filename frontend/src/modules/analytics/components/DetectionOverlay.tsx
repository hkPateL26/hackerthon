import React from 'react';
import type { DetectionEvent } from '../types/analytics';

interface DetectionOverlayProps {
  detections: DetectionEvent[];
  videoWidth?: number;
  videoHeight?: number;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  detections,
  videoWidth = 640,
  videoHeight = 360,
}) => {
  if (!detections || detections.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
      }}
      viewBox={`0 0 ${videoWidth} ${videoHeight}`}
      preserveAspectRatio="none"
    >
      {detections.map((d) => {
        const isPerson = d.detectedCategory === 'PERSON';
        const strokeColor = isPerson ? '#22c55e' : '#f97316';
        const fillColor = isPerson ? 'rgba(34, 197, 94, 0.15)' : 'rgba(249, 115, 22, 0.15)';

        return (
          <g key={d.id}>
            <rect
              x={d.bboxX}
              y={d.bboxY}
              width={d.bboxWidth}
              height={d.bboxHeight}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2"
              rx="2"
            />
            <rect
              x={d.bboxX}
              y={Math.max(0, d.bboxY - 18)}
              width={Math.min(d.bboxWidth, 110)}
              height="18"
              fill={strokeColor}
              rx="2"
            />
            <text
              x={d.bboxX + 4}
              y={Math.max(12, d.bboxY - 5)}
              fill="#ffffff"
              fontSize="10"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              {d.detectedClass} {Math.round(d.confidence * 100)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
};
