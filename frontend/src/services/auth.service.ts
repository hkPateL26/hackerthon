import { apiClient } from './api';
import type { AuthResponse, LoginCredentials, User } from '../types/auth';

export const authApiService = {
  /**
   * Authenticates officer credentials and returns access token + user.
   * HttpOnly refresh cookie is set automatically by the backend.
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  /**
   * Performs silent token rotation via HttpOnly refresh cookie.
   */
  async refresh(): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/refresh');
    return response.data;
  },

  /**
   * Revokes session and clears HttpOnly refresh cookie.
   */
  async logout(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>('/auth/logout');
    return response.data;
  },

  /**
   * Retrieves authenticated officer profile.
   */
  async getProfile(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },
};
