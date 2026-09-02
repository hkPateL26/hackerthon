import React from 'react';
import type { LayoutMode, MonitoringSlot } from '../types/monitoring';
import type { Camera } from '../../../types/camera';
import { CameraTile } from './CameraTile';
import styles from './MonitoringGrid.module.css';

interface MonitoringGridProps {
  layout: LayoutMode;
  slots: MonitoringSlot[];
  onOpenPicker: (slotId: string) => void;
  onStartStream: (slotId: string) => void;
  onStopStream: (slotId: string) => void;
  onRestartStream: (slotId: string) => void;
  onRetryStream: (slotId: string) => void;
  onRemoveCamera: (slotId: string) => void;
  onViewDetails: (camera: Camera) => void;
  onCapacityError?: (message: string) => void;
}

export const MonitoringGrid: React.FC<MonitoringGridProps> = ({
  layout,
  slots,
  onOpenPicker,
  onStartStream,
  onStopStream,
  onRestartStream,
  onRetryStream,
  onRemoveCamera,
  onViewDetails,
  onCapacityError,
}) => {
  const getLayoutClass = () => {
    switch (layout) {
      case '1x1':
        return styles.grid1x1;
      case '2x2':
        return styles.grid2x2;
      case '2x3':
        return styles.grid2x3;
      case '3x3':
        return styles.grid3x3;
      default:
        return styles.grid2x2;
    }
  };

  return (
    <main
      className={`${styles.gridContainer} ${getLayoutClass()}`}
      aria-label="CCTV Video Monitoring Grid"
      id="monitoring-grid"
    >
      {slots.map((slot) => (
        <CameraTile
          key={slot.slotId}
          slot={slot}
          onOpenPicker={onOpenPicker}
          onStartStream={onStartStream}
          onStopStream={onStopStream}
          onRestartStream={onRestartStream}
          onRetryStream={onRetryStream}
          onRemoveCamera={onRemoveCamera}
          onViewDetails={onViewDetails}
          onCapacityError={onCapacityError}
        />
      ))}
    </main>
  );
};
