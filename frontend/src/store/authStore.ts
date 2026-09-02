import { create } from 'zustand';
import type { AuthState, LoginCredentials, User } from '../types/auth';
import { authApiService } from '../services/auth.service';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null, // Strictly in-memory — NEVER saved to localStorage
  isAuthenticated: false,
  isLoading: true, // Starts true for initial bootstrap check
  error: null,

  login: async (credentials: LoginCredentials): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApiService.login(credentials);
      set({
        user: response.user,
        accessToken: response.accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        (err.response?.status === 401
          ? 'Invalid email address or password'
          : 'Unable to connect to authentication server');
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: Array.isArray(message) ? message.join(', ') : message,
      });
      return false;
    }
  },

  logout: async (): Promise<void> => {
    set({ isLoading: true });
    try {
      if (get().isAuthenticated) {
        await authApiService.logout();
      }
    } catch {
      // Ignore network errors during logout — client state will be wiped anyway
    } finally {
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  refreshSession: async (): Promise<boolean> => {
    try {
      const response = await authApiService.refresh();
      set({
        user: response.user,
        accessToken: response.accessToken,
        isAuthenticated: true,
        error: null,
      });
      return true;
    } catch {
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
      });
      return false;
    }
  },

  bootstrapAuth: async (): Promise<void> => {
    set({ isLoading: true });
    try {
      // Attempt silent session restoration via HttpOnly cookie
      const success = await get().refreshSession();
      set({ isLoading: false, isAuthenticated: success });
    } catch {
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  clearError: () => set({ error: null }),
  setUser: (user: User | null) => set({ user, isAuthenticated: !!user }),
  setAccessToken: (token: string | null) => set({ accessToken: token }),
}));
