import React, { useState } from 'react';
import { useMonitoring } from '../modules/monitoring/hooks/useMonitoring';
import { MonitoringToolbar } from '../modules/monitoring/components/MonitoringToolbar';
import { MonitoringGrid } from '../modules/monitoring/components/MonitoringGrid';
import { CameraPicker } from '../modules/monitoring/components/CameraPicker';
import { QuickDetailsModal } from '../modules/monitoring/components/QuickDetailsModal';
import type { Camera } from '../types/camera';
import styles from './MonitoringPage.module.css';

export const MonitoringPage: React.FC = () => {
  const {
    layout,
    slots,
    stats,
    concurrencyWarning,
    clearWarning,
    changeLayout,
    assignCamera,
    removeCamera,
    clearAll,
    startStream,
    stopStream,
    restartStream,
    retryStream,
    startAllVisible,
    stopAll,
  } = useMonitoring('2x2');

  const [pickerSlotId, setPickerSlotId] = useState<string | null>(null);
  const [selectedCameraForDetails, setSelectedCameraForDetails] = useState<Camera | null>(null);

  // Find assigned camera IDs for duplicate prevention
  const assignedCameraIds = slots
    .map((s) => s.camera?.id)
    .filter((id): id is string => typeof id === 'string');

  const firstEmptySlot = slots.find((s) => s.camera === null);
  const hasEmptySlots = firstEmptySlot !== undefined;

  const handleOpenPickerForFirstEmpty = () => {
    if (firstEmptySlot) {
      setPickerSlotId(firstEmptySlot.slotId);
    }
  };

  return (
    <div className={styles.pageContainer} aria-label="Gujarat Police CCTV Unified Monitoring Page">
      {/* Top Toolbar */}
      <MonitoringToolbar
        currentLayout={layout}
        stats={stats}
        concurrencyWarning={concurrencyWarning}
        onSelectLayout={changeLayout}
        onStartAll={startAllVisible}
        onStopAll={stopAll}
        onClearAll={clearAll}
        onAddCamera={handleOpenPickerForFirstEmpty}
        onDismissWarning={clearWarning}
        hasEmptySlots={hasEmptySlots}
      />

      {/* Grid of Camera Tiles */}
      <MonitoringGrid
        layout={layout}
        slots={slots}
        onOpenPicker={(slotId) => setPickerSlotId(slotId)}
        onStartStream={startStream}
        onStopStream={stopStream}
        onRestartStream={restartStream}
        onRetryStream={retryStream}
        onRemoveCamera={removeCamera}
        onViewDetails={(cam) => setSelectedCameraForDetails(cam)}
      />

      {/* Camera Selection Modal */}
      <CameraPicker
        targetSlotId={pickerSlotId}
        assignedCameraIds={assignedCameraIds}
        isOpen={pickerSlotId !== null}
        onClose={() => setPickerSlotId(null)}
        onSelectCamera={(slotId, camera) => assignCamera(slotId, camera)}
      />

      {/* Quick Camera Technical Details Dialog */}
      <QuickDetailsModal
        camera={selectedCameraForDetails}
        onClose={() => setSelectedCameraForDetails(null)}
      />
    </div>
  );
};
