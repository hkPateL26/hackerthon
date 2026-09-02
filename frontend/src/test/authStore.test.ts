import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../store/authStore';
import { authApiService } from '../services/auth.service';

vi.mock('../services/auth.service', () => ({
  authApiService: {
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    getProfile: vi.fn(),
  },
}));

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('should initialize with empty auth state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should update state on successful login', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'admin@police.gujarat.gov.in',
      fullName: 'Admin Officer',
      role: 'ADMIN' as const,
      permissions: ['*'],
      isActive: true,
    };

    vi.mocked(authApiService.login).mockResolvedValue({
      accessToken: 'access_jwt_123',
      expiresIn: 900,
      user: mockUser,
    });

    const success = await useAuthStore.getState().login({
      email: 'admin@police.gujarat.gov.in',
      password: 'Admin@1234',
    });

    expect(success).toBe(true);
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('access_jwt_123');
    expect(state.user?.email).toBe('admin@police.gujarat.gov.in');
    expect(state.error).toBeNull();
  });

  it('should record error and clear state on failed login', async () => {
    vi.mocked(authApiService.login).mockRejectedValue({
      response: {
        status: 401,
        data: { message: 'Invalid email address or password' },
      },
    });

    const success = await useAuthStore.getState().login({
      email: 'wrong@police.gov.in',
      password: 'wrong',
    });

    expect(success).toBe(false);
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.error).toBe('Invalid email address or password');
  });

  it('should wipe in-memory state on logout', async () => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'test@police.gov.in',
        fullName: 'Test',
        role: 'OPERATOR',
        permissions: [],
        isActive: true,
      },
      accessToken: 'token_123',
      isAuthenticated: true,
    });

    vi.mocked(authApiService.logout).mockResolvedValue({ success: true, message: 'Logged out' });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
  });
});
