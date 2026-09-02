import { apiClient } from '../../../services/api';
import type {
  AnprResult,
  AnprQuery,
  PaginatedAnprResponse,
} from '../types/anpr';

export const anprService = {
  /**
   * Fetch recent ANPR observations with filtering and pagination
   */
  async getRecentAnpr(query?: AnprQuery): Promise<PaginatedAnprResponse> {
    const params = new URLSearchParams();
    if (query) {
      if (query.cameraId) params.set('cameraId', query.cameraId);
      if (query.sessionId) params.set('sessionId', query.sessionId);
      if (query.trackId) params.set('trackId', query.trackId.toString());
      if (query.plate) params.set('plate', query.plate);
      if (query.vehicleClass) params.set('vehicleClass', query.vehicleClass);
      if (query.validationStatus) params.set('validationStatus', query.validationStatus);
      if (query.minConfidence !== undefined) params.set('minConfidence', query.minConfidence.toString());
      if (query.from) params.set('from', query.from);
      if (query.to) params.set('to', query.to);
      if (query.page) params.set('page', query.page.toString());
      if (query.limit) params.set('limit', query.limit.toString());
    }

    const response = await apiClient.get<PaginatedAnprResponse>(`/anpr?${params.toString()}`);
    return response.data;
  },

  /**
   * Fetch recent ANPR observations for a specific camera
   */
  async getAnprByCamera(cameraId: string, limit: number = 20): Promise<AnprResult[]> {
    const response = await apiClient.get<AnprResult[]>(
      `/cameras/${cameraId}/anpr?limit=${limit}`,
    );
    return response.data;
  },

  /**
   * Get single ANPR observation by ID
   */
  async getAnprById(id: string): Promise<AnprResult> {
    const response = await apiClient.get<AnprResult>(`/anpr/${id}`);
    return response.data;
  },

  /**
   * Search plates across all cameras
   */
  async searchPlates(term: string, limit: number = 20): Promise<AnprResult[]> {
    const response = await apiClient.get<AnprResult[]>(
      `/anpr/search?q=${encodeURIComponent(term)}&limit=${limit}`,
    );
    return response.data;
  },
};
