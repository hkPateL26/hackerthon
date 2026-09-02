export type ValidationStatus = 'VALID' | 'LOW_CONFIDENCE' | 'INVALID_FORMAT';

export interface AnprResult {
  id: string;
  cameraId: string;
  cameraCode?: string;
  cameraName?: string;
  sessionId: string | null;
  trackId: number | null;
  vehicleClass: string | null;
  plateTextRaw: string;
  plateTextNormalized: string | null;
  validationStatus: ValidationStatus;
  plateDetectionConfidence: number | null;
  ocrConfidence: number | null;
  finalConfidence: number | null;
  plateBbox: {
    x: number | null;
    y: number | null;
    width: number | null;
    height: number | null;
  } | null;
  plateSnapshotUrl: string | null;
  vehicleSnapshotUrl: string | null;
  occurredAt: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface AnprQuery {
  cameraId?: string;
  sessionId?: string;
  trackId?: number;
  plate?: string;
  vehicleClass?: string;
  validationStatus?: ValidationStatus;
  minConfidence?: number;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedAnprResponse {
  items: AnprResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
