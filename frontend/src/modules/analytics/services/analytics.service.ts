import { apiClient } from '../../../services/api';
import type {
  DetectionEvent,
  PaginatedEventsResponse,
  AISession,
  EventQueryFilters,
} from '../types/analytics';

export const analyticsService = {
  /**
   * List and filter AI detection events
   */
  async getEvents(filters: EventQueryFilters = {}): Promise<PaginatedEventsResponse> {
    const params = new URLSearchParams();
    if (filters.cameraId) params.append('cameraId', filters.cameraId);
    if (filters.category) params.append('category', filters.category);
    if (filters.type) params.append('type', filters.type);
    if (filters.minConfidence !== undefined)
      params.append('minConfidence', String(filters.minConfidence));
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const response = await apiClient.get<PaginatedEventsResponse>(
      `/events?${params.toString()}`,
    );
    return response.data;
  },

  /**
   * Get single event by ID
   */
  async getEventById(id: string): Promise<DetectionEvent> {
    const response = await apiClient.get<DetectionEvent>(`/events/${id}`);
    return response.data;
  },

  /**
   * Get recent events for a specific camera
   */
  async getCameraEvents(cameraId: string, limit = 50): Promise<DetectionEvent[]> {
    const response = await apiClient.get<DetectionEvent[]>(
      `/cameras/${cameraId}/events?limit=${limit}`,
    );
    return response.data;
  },

  /**
   * Start AI video analytics session on camera
   */
  async startAISession(
    cameraId: string,
    sampleFps = 1.5,
    confidenceThreshold = 0.5,
  ): Promise<AISession> {
    const response = await apiClient.post<AISession>('/ai/sessions/start', {
      cameraId,
      sampleFps,
      confidenceThreshold,
    });
    return response.data;
  },

  /**
   * Stop AI video analytics session on camera
   */
  async stopAISession(cameraId: string): Promise<AISession> {
    const response = await apiClient.post<AISession>(
      `/ai/sessions/${cameraId}/stop`,
    );
    return response.data;
  },

  /**
   * Get telemetry and status of an AI session
   */
  async getAISession(cameraId: string): Promise<AISession> {
    const response = await apiClient.get<AISession>(`/ai/sessions/${cameraId}`);
    return response.data;
  },

  /**
   * List all AI sessions
   */
  async listAISessions(): Promise<AISession[]> {
    const response = await apiClient.get<AISession[]>('/ai/sessions');
    return response.data;
  },
};
