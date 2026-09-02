import { apiClient } from './api';
import type {
  Camera,
  PaginatedCameras,
  CameraQueryParams,
  CreateCameraInput,
  UpdateCameraInput,
  District,
  PoliceStation,
  CameraStatus,
} from '../types/camera';

export const cameraService = {
  /**
   * Get paginated cameras with filters and search
   */
  async getCameras(params: CameraQueryParams = {}): Promise<PaginatedCameras> {
    const cleanParams: Record<string, any> = {};
    if (params.page) cleanParams.page = params.page;
    if (params.limit) cleanParams.limit = params.limit;
    if (params.search) cleanParams.search = params.search;
    if (params.districtId) cleanParams.districtId = params.districtId;
    if (params.policeStationId) cleanParams.policeStationId = params.policeStationId;
    if (params.status) cleanParams.status = params.status;
    if (params.cameraType) cleanParams.cameraType = params.cameraType;
    if (params.isActive !== undefined) cleanParams.isActive = params.isActive;
    if (params.sortBy) cleanParams.sortBy = params.sortBy;
    if (params.sortOrder) cleanParams.sortOrder = params.sortOrder;

    const response = await apiClient.get<PaginatedCameras>('/api/cameras', {
      params: cleanParams,
    });
    return response.data;
  },

  /**
   * Get camera details by ID
   */
  async getCameraById(id: string): Promise<Camera> {
    const response = await apiClient.get<Camera>(`/api/cameras/${id}`);
    return response.data;
  },

  /**
   * Create new camera (ADMIN only)
   */
  async createCamera(data: CreateCameraInput): Promise<Camera> {
    const response = await apiClient.post<Camera>('/api/cameras', data);
    return response.data;
  },

  /**
   * Update camera details (ADMIN only)
   */
  async updateCamera(id: string, data: UpdateCameraInput): Promise<Camera> {
    const response = await apiClient.patch<Camera>(`/api/cameras/${id}`, data);
    return response.data;
  },

  /**
   * Soft delete camera (ADMIN only)
   */
  async deleteCamera(id: string): Promise<{ message: string; id: string }> {
    const response = await apiClient.delete<{ message: string; id: string }>(
      `/api/cameras/${id}`,
    );
    return response.data;
  },

  /**
   * Update camera status (ADMIN / SUPERVISOR)
   */
  async updateStatus(id: string, status: CameraStatus): Promise<Camera> {
    const response = await apiClient.patch<Camera>(`/api/cameras/${id}/status`, {
      status,
    });
    return response.data;
  },

  /**
   * Activate camera (ADMIN only)
   */
  async activateCamera(id: string): Promise<Camera> {
    const response = await apiClient.patch<Camera>(`/api/cameras/${id}/activate`);
    return response.data;
  },

  /**
   * Deactivate camera (ADMIN only)
   */
  async deactivateCamera(id: string): Promise<Camera> {
    const response = await apiClient.patch<Camera>(`/api/cameras/${id}/deactivate`);
    return response.data;
  },

  /**
   * Get all districts
   */
  async getDistricts(): Promise<District[]> {
    const response = await apiClient.get<District[]>('/api/cameras/districts');
    return response.data;
  },

  /**
   * Get police stations for a district
   */
  async getPoliceStations(districtId?: string): Promise<PoliceStation[]> {
    const response = await apiClient.get<PoliceStation[]>(
      '/api/cameras/police-stations',
      {
        params: districtId ? { districtId } : undefined,
      },
    );
    return response.data;
  },

  /**
   * Get GeoJSON FeatureCollection (for future Phase 4 GIS)
   */
  async getGeoJSON(): Promise<any> {
    const response = await apiClient.get('/api/cameras/geojson');
    return response.data;
  },
};
