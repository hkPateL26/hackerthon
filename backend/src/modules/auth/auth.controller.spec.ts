import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthController } from './auth.controller.js';
import { RoleName } from './entities/role.entity.js';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: any;

  const mockSafeUser = {
    id: 'b1c2d3e4-0001-0001-0001-000000000001',
    email: 'admin@police.gujarat.gov.in',
    fullName: 'System Administrator',
    role: RoleName.ADMIN,
    permissions: ['*'],
    isActive: true,
    lastLoginAt: new Date(),
  };

  beforeEach(() => {
    mockAuthService = {
      login: vi.fn().mockResolvedValue({
        accessToken: 'mock_jwt_access_token',
        refreshToken: 'mock_jwt_refresh_token',
        expiresIn: 900,
        user: mockSafeUser,
      }),
      refresh: vi.fn().mockResolvedValue({
        accessToken: 'new_mock_access_token',
        refreshToken: 'new_mock_refresh_token',
        expiresIn: 900,
        user: mockSafeUser,
      }),
      logout: vi.fn().mockResolvedValue({
        success: true,
        message: 'Logged out successfully',
      }),
      getProfile: vi.fn().mockResolvedValue(mockSafeUser),
    };

    controller = new AuthController(mockAuthService);
  });

  describe('login', () => {
    it('should set HttpOnly cookie and return accessToken + safe user', async () => {
      const mockReq = { headers: {}, socket: { remoteAddress: '127.0.0.1' } } as any;
      const mockRes = { cookie: vi.fn() } as any;

      const result = await controller.login(
        { email: 'admin@police.gujarat.gov.in', password: 'Admin@1234' },
        mockReq,
        mockRes,
      );

      expect(result.accessToken).toBe('mock_jwt_access_token');
      expect(result.user.email).toBe('admin@police.gujarat.gov.in');
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'mock_jwt_refresh_token',
        expect.objectContaining({ httpOnly: true }),
      );
    });
  });

  describe('refresh', () => {
    it('should read cookie, rotate token and update cookie', async () => {
      const mockReq = {
        cookies: { refreshToken: 'existing_cookie_token' },
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
      } as any;
      const mockRes = { cookie: vi.fn() } as any;

      const result = await controller.refresh(mockReq, mockRes);
      expect(result.accessToken).toBe('new_mock_access_token');
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'new_mock_refresh_token',
        expect.objectContaining({ httpOnly: true }),
      );
    });
  });

  describe('logout', () => {
    it('should clear refresh cookie and call logout service', async () => {
      const mockReq = { cookies: { refreshToken: 'cookie_token' } } as any;
      const mockRes = { clearCookie: vi.fn() } as any;

      const result = await controller.logout('user-uuid-1', mockReq, mockRes);
      expect(result.success).toBe(true);
      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({ httpOnly: true }),
      );
    });
  });

  describe('getProfile', () => {
    it('should return safe profile for the authenticated officer', async () => {
      const profile = await controller.getProfile('user-uuid-1');
      expect(profile.email).toBe('admin@police.gujarat.gov.in');
      expect(profile.role).toBe(RoleName.ADMIN);
    });
  });
});
