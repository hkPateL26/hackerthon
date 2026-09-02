export type CameraStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN' | 'MAINTENANCE' | 'DISABLED';
export type CameraType = 'FIXED' | 'PTZ' | 'DOME' | 'BULLET' | 'BOX' | 'OTHER';

export interface District {
  id: string;
  name: string;
  code: string;
}

export interface PoliceStation {
  id: string;
  districtId: string;
  name: string;
  code: string;
  contactNumber?: string | null;
}

export interface Camera {
  id: string;
  cameraCode: string;
  name: string;
  description: string | null;
  cameraType: CameraType;
  vendor: string | null;
  model: string | null;
  serialNumber: string | null;
  ipAddress: string | null;
  port: number;
  streamUrl: string | null;
  locationName: string | null;
  district: District | null;
  policeStation: PoliceStation | null;
  latitude: number;
  longitude: number;
  status: CameraStatus;
  isActive: boolean;
  installedAt: string | null;
  lastSeenAt: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedCameras {
  items: Camera[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CameraQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  districtId?: string;
  policeStationId?: string;
  status?: CameraStatus | '';
  cameraType?: CameraType | '';
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateCameraInput {
  cameraCode: string;
  name: string;
  description?: string;
  cameraType?: CameraType;
  vendor?: string;
  model?: string;
  serialNumber?: string;
  ipAddress?: string;
  port?: number;
  rtspUrl?: string;
  locationName?: string;
  districtId: string;
  policeStationId: string;
  latitude: number;
  longitude: number;
  status?: CameraStatus;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export type UpdateCameraInput = Partial<CreateCameraInput>;

export interface CameraGroup {
  id: string;
  name: string;
  description: string | null;
  cameras?: Camera[];
  createdAt: string;
}
