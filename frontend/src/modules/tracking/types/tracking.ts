export type TrackStatus = 'NEW' | 'ACTIVE' | 'LOST' | 'TERMINATED';

export type TrackCategory = 'PERSON' | 'VEHICLE';

export interface TrackBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TrackedObjectItem {
  id?: string;
  cameraId: string;
  cameraCode?: string;
  cameraName?: string;
  sessionId?: string;
  trackId: number;
  category: TrackCategory;
  detectedClass: string;
  status: TrackStatus;
  firstSeenAt: string;
  lastSeenAt: string;
  detectionCount: number;
  confidence: number | null;
  bbox: TrackBBox | null;
  metadata?: {
    history?: [number, number][];
    [key: string]: any;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ActiveTracksResponse {
  cameraId: string;
  sessionId?: string;
  activeTracks: TrackedObjectItem[];
}

export interface PaginatedTracksResponse {
  items: TrackedObjectItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
