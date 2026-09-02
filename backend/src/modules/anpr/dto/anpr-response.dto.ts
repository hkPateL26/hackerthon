export class AnprResponseDto {
  id: string;
  cameraId: string;
  cameraCode?: string;
  cameraName?: string;
  sessionId: string | null;
  trackId: number | null;
  vehicleClass: string | null;
  plateTextRaw: string;
  plateTextNormalized: string | null;
  validationStatus: string;
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

export class PaginatedAnprResponseDto {
  items: AnprResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
