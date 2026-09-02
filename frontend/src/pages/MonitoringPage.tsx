import React, { useState } from 'react';
import { useMonitoring } from '../modules/monitoring/hooks/useMonitoring';
import { MonitoringToolbar } from '../modules/monitoring/components/MonitoringToolbar';
import { MonitoringGrid } from '../modules/monitoring/components/MonitoringGrid';
import { CameraPicker } from '../modules/monitoring/components/CameraPicker';
import { QuickDetailsModal } from '../modules/monitoring/components/QuickDetailsModal';
import { RecentDetectionsDrawer } from '../modules/analytics/components/RecentDetectionsDrawer';
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
  const [isDetectionsOpen, setIsDetectionsOpen] = useState<boolean>(true);
  const [aiCapacityWarning, setAiCapacityWarning] = useState<string | null>(null);

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

  const activeWarning = aiCapacityWarning || concurrencyWarning;

  const handleDismissWarning = () => {
    clearWarning();
    setAiCapacityWarning(null);
  };

  return (
    <div className={styles.pageContainer} aria-label="Gujarat Police CCTV Unified Monitoring Page">
      {/* Top Toolbar */}
      <MonitoringToolbar
        currentLayout={layout}
        stats={stats}
        concurrencyWarning={activeWarning}
        onSelectLayout={changeLayout}
        onStartAll={startAllVisible}
        onStopAll={stopAll}
        onClearAll={clearAll}
        onAddCamera={handleOpenPickerForFirstEmpty}
        onDismissWarning={handleDismissWarning}
        hasEmptySlots={hasEmptySlots}
        onToggleDetectionsFeed={() => setIsDetectionsOpen(!isDetectionsOpen)}
        isDetectionsFeedOpen={isDetectionsOpen}
      />

      {/* Main Content Area (Grid + Detections Drawer) */}
      <div className={styles.contentArea}>
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
          onCapacityError={(msg) => setAiCapacityWarning(msg)}
        />

        {/* Live Detections Feed Drawer */}
        <RecentDetectionsDrawer
          isOpen={isDetectionsOpen}
          onClose={() => setIsDetectionsOpen(false)}
        />
      </div>

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
