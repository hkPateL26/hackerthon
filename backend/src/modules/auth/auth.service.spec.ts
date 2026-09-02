import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RoleName } from './entities/role.entity.js';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepo: any;
  let mockRoleRepo: any;
  let mockSessionRepo: any;
  let mockJwtService: any;
  let mockConfigService: any;

  const mockAdminRole = {
    id: 'a1b2c3d4-0001-0001-0001-000000000001',
    name: RoleName.ADMIN,
    permissions: ['*'],
  };

  const mockUser = {
    id: 'b1c2d3e4-0001-0001-0001-000000000001',
    email: 'admin@police.gujarat.gov.in',
    fullName: 'System Administrator',
    passwordHash: bcrypt.hashSync('Admin@1234', 10),
    roleId: mockAdminRole.id,
    role: mockAdminRole,
    isActive: true,
    deletedAt: null,
    lastLoginAt: null,
  };

  beforeEach(() => {
    mockUserRepo = {
      findOne: vi.fn(),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
    };

    mockRoleRepo = {
      findOne: vi.fn(),
    };

    mockSessionRepo = {
      create: vi.fn((dto) => ({ id: 'session-uuid-1', ...dto })),
      save: vi.fn().mockImplementation((session) => Promise.resolve(session)),
      findOne: vi.fn(),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
    };

    mockJwtService = {
      signAsync: vi.fn().mockImplementation((payload) => {
        return Promise.resolve(`signed_token_${payload.sub || 'token'}`);
      }),
      verifyAsync: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn((key, defaultVal) => defaultVal),
    };

    authService = new AuthService(
      mockUserRepo,
      mockRoleRepo,
      mockSessionRepo,
      mockJwtService,
      mockConfigService,
    );
  });

  describe('validateUser', () => {
    it('should validate and return user when email and password match', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const result = await authService.validateUser('admin@police.gujarat.gov.in', 'Admin@1234');
      expect(result).toBeDefined();
      expect(result.email).toBe('admin@police.gujarat.gov.in');
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        authService.validateUser('nonexistent@police.gov.in', 'Admin@1234'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      await expect(
        authService.validateUser('admin@police.gujarat.gov.in', 'WrongPassword!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(
        authService.validateUser('admin@police.gujarat.gov.in', 'Admin@1234'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is soft-deleted', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...mockUser, deletedAt: new Date() });

      await expect(
        authService.validateUser('admin@police.gujarat.gov.in', 'Admin@1234'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should issue tokens, save SHA-256 session hash, and return safe profile', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const result = await authService.login(
        { email: 'admin@police.gujarat.gov.in', password: 'Admin@1234' },
        '127.0.0.1',
        'VitestAgent/1.0',
      );

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBe(900);
      expect(result.user.email).toBe('admin@police.gujarat.gov.in');
      expect(result.user.role).toBe(RoleName.ADMIN);
      expect((result.user as any).passwordHash).toBeUndefined();

      expect(mockSessionRepo.save).toHaveBeenCalled();
      expect(mockUserRepo.update).toHaveBeenCalledWith(mockUser.id, expect.any(Object));
    });
  });

  describe('refresh', () => {
    it('should rotate refresh token and revoke old session', async () => {
      const rawRefreshToken = 'valid_refresh_token_string';
      const tokenHash = authService.hashToken(rawRefreshToken);

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        type: 'refresh',
      });

      mockSessionRepo.findOne.mockResolvedValue({
        id: 'session-123',
        userId: mockUser.id,
        tokenHash,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 100000),
      });

      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const result = await authService.refresh(rawRefreshToken, '127.0.0.1');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockSessionRepo.update).toHaveBeenCalledWith('session-123', { isRevoked: true });
      expect(mockSessionRepo.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException and revoke user sessions on replay attack', async () => {
      const rawRefreshToken = 'reused_or_expired_token';

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        type: 'refresh',
      });

      // Session not found (already revoked)
      mockSessionRepo.findOne.mockResolvedValue(null);

      await expect(authService.refresh(rawRefreshToken)).rejects.toThrow(UnauthorizedException);
      expect(mockSessionRepo.update).toHaveBeenCalledWith(
        { userId: mockUser.id, isRevoked: false },
        { isRevoked: true },
      );
    });

    it('should throw UnauthorizedException on malformed token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(authService.refresh('malformed_token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke session by token hash on logout', async () => {
      const rawRefreshToken = 'logout_refresh_token';
      const tokenHash = authService.hashToken(rawRefreshToken);

      const result = await authService.logout(mockUser.id, rawRefreshToken);
      expect(result.success).toBe(true);
      expect(mockSessionRepo.update).toHaveBeenCalledWith(
        { tokenHash, userId: mockUser.id },
        { isRevoked: true },
      );
    });
  });

  describe('getProfile', () => {
    it('should return safe user profile without password hash', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const profile = await authService.getProfile(mockUser.id);
      expect(profile.id).toBe(mockUser.id);
      expect(profile.email).toBe(mockUser.email);
      expect(profile.role).toBe(RoleName.ADMIN);
      expect((profile as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException if user is missing', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(authService.getProfile('unknown-id')).rejects.toThrow(NotFoundException);
    });
  });
});
