import type { Camera } from '../../../types/camera';
import type { StreamStatus } from '../../../types/stream';

export type LayoutMode = '1x1' | '2x2' | '2x3' | '3x3';

export interface LayoutConfig {
  id: LayoutMode;
  label: string;
  slotsCount: number;
  rows: number;
  cols: number;
}

export interface MonitoringSlot {
  slotId: string;
  camera: Camera | null;
  streamStatus: StreamStatus;
  playbackUrl: string | null;
  isLoading: boolean;
  error: string | null;
  lastStartedAt: string | null;
}

export interface MonitoringStats {
  totalSlots: number;
  assignedCount: number;
  runningStreams: number;
  stoppedStreams: number;
  errorStreams: number;
  maxConcurrentStreams: number;
}

export interface CameraPickerFilterState {
  search: string;
  districtId: string;
  policeStationId: string;
  status: string;
  cameraType: string;
  isActive: boolean;
}
