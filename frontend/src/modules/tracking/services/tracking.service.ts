import { apiClient } from '../../../services/api';
import type {
  TrackedObjectItem,
  ActiveTracksResponse,
  PaginatedTracksResponse,
} from '../types/tracking';

export interface TrackQueryFilters {
  cameraId?: string;
  sessionId?: string;
  category?: 'PERSON' | 'VEHICLE';
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export const trackingService = {
  /**
   * Fetch active tracks for a camera from NestJS backend
   */
  async getActiveTracks(cameraId: string): Promise<ActiveTracksResponse> {
    const response = await apiClient.get<ActiveTracksResponse>(
      `/cameras/${cameraId}/tracks/active`,
    );
    return response.data;
  },

  /**
   * Fetch runtime tracks directly from active AI session
   */
  async getRuntimeTracks(cameraId: string): Promise<ActiveTracksResponse> {
    const response = await apiClient.get<ActiveTracksResponse>(
      `/ai/sessions/${cameraId}/tracks`,
    );
    return response.data;
  },

  /**
   * List and filter historical tracks
   */
  async getTracks(filters: TrackQueryFilters = {}): Promise<PaginatedTracksResponse> {
    const params = new URLSearchParams();
    if (filters.cameraId) params.append('cameraId', filters.cameraId);
    if (filters.sessionId) params.append('sessionId', filters.sessionId);
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const response = await apiClient.get<PaginatedTracksResponse>(
      `/tracks?${params.toString()}`,
    );
    return response.data;
  },

  /**
   * Get single track by UUID
   */
  async getTrackById(id: string): Promise<TrackedObjectItem> {
    const response = await apiClient.get<TrackedObjectItem>(`/tracks/${id}`);
    return response.data;
  },

  /**
   * Get recent historical tracks for a camera
   */
  async getCameraTracks(cameraId: string, limit = 50): Promise<TrackedObjectItem[]> {
    const response = await apiClient.get<TrackedObjectItem[]>(
      `/cameras/${cameraId}/tracks?limit=${limit}`,
    );
    return response.data;
  },
};
