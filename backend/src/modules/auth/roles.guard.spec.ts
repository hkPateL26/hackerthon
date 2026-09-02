import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './guards/roles.guard.js';
import { RoleName } from './entities/role.entity.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(userRole?: RoleName): ExecutionContext {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: userRole
            ? {
                id: 'user-uuid',
                email: 'test@police.gov.in',
                role: { name: userRole },
              }
            : undefined,
        }),
      }),
    } as any;
  }

  it('should allow access when no roles are required', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = createMockContext(RoleName.OPERATOR);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user role matches required single role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([RoleName.ADMIN]);

    const context = createMockContext(RoleName.ADMIN);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user role matches one of multiple required roles', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      RoleName.ADMIN,
      RoleName.SUPERVISOR,
    ]);

    const context = createMockContext(RoleName.SUPERVISOR);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException (403) when user role does not match required role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([RoleName.ADMIN]);

    const context = createMockContext(RoleName.OPERATOR);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException (403) when user object is missing', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([RoleName.ADMIN]);

    const context = createMockContext(undefined);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
