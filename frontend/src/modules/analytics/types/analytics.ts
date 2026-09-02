export type DetectedCategory = 'PERSON' | 'VEHICLE';

export type AISessionStatus =
  | 'STOPPED'
  | 'STARTING'
  | 'RUNNING'
  | 'STOPPING'
  | 'ERROR';

export interface DetectionEvent {
  id: string;
  cameraId: string;
  cameraCode?: string;
  cameraName?: string;
  eventTypeCode: string;
  eventTypeName: string;
  detectedCategory: DetectedCategory;
  detectedClass: string;
  confidence: number;
  occurredAt: string;
  frameWidth: number;
  frameHeight: number;
  bboxX: number;
  bboxY: number;
  bboxWidth: number;
  bboxHeight: number;
  snapshotPath: string | null;
  snapshotUrl: string | null;
  source: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface PaginatedEventsResponse {
  items: DetectionEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AISession {
  cameraId: string;
  cameraCode?: string;
  cameraName?: string;
  status: AISessionStatus;
  sampleFps: number;
  confidenceThreshold: number;
  processedFrames: number;
  detectionsCount: number;
  approxFps: number;
  startedAt: string | null;
  error: string | null;
}

export interface EventQueryFilters {
  cameraId?: string;
  category?: DetectedCategory;
  type?: string;
  minConfidence?: number;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
