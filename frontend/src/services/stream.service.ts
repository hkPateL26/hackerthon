import { apiClient } from './api';
import type { Stream, StreamStatusResponse } from '../types/stream';

export const streamService = {
  /**
   * Start live video ingestion and HLS generation
   */
  async startStream(cameraId: string): Promise<Stream> {
    const response = await apiClient.post<Stream>(`/api/cameras/${cameraId}/stream/start`);
    return response.data;
  },

  /**
   * Stop video stream
   */
  async stopStream(cameraId: string): Promise<Stream> {
    const response = await apiClient.post<Stream>(`/api/cameras/${cameraId}/stream/stop`);
    return response.data;
  },

  /**
   * Restart video stream (ADMIN / SUPERVISOR)
   */
  async restartStream(cameraId: string): Promise<Stream> {
    const response = await apiClient.post<Stream>(`/api/cameras/${cameraId}/stream/restart`);
    return response.data;
  },

  /**
   * Get full stream session metadata
   */
  async getStream(cameraId: string): Promise<Stream> {
    const response = await apiClient.get<Stream>(`/api/cameras/${cameraId}/stream`);
    return response.data;
  },

  /**
   * Get lightweight stream status for polling
   */
  async getStreamStatus(cameraId: string): Promise<StreamStatusResponse> {
    const response = await apiClient.get<StreamStatusResponse>(`/api/cameras/${cameraId}/stream/status`);
    return response.data;
  },
};
