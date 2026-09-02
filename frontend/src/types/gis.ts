import type { CameraStatus, CameraType } from './camera';

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude] as per RFC 7946
}

export interface CameraGeoJSONProperties {
  id: string;
  cameraCode: string;
  name: string;
  cameraType: CameraType;
  status: CameraStatus;
  isActive: boolean;
  district: string;
  policeStation: string;
  locationName: string;
  vendor?: string;
  model?: string;
  streamUrl?: string;
  lastSeenAt?: string;
  installedAt?: string;
}

export interface CameraGeoJSONFeature {
  type: 'Feature';
  geometry: GeoJSONPoint;
  properties: CameraGeoJSONProperties;
}

export interface CameraGeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: CameraGeoJSONFeature[];
}

export interface GISFilterState {
  search: string;
  districtId: string;
  policeStationId: string;
  status: string;
  cameraType: string;
  isActive?: boolean;
}

export interface MapBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}
