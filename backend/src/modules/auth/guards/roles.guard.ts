import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator.js';
import { RoleName } from '../entities/role.entity.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      throw new ForbiddenException('Access denied. User role information is missing.');
    }

    const userRoleName: RoleName = user.role.name;
    const hasRole = requiredRoles.includes(userRoleName);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Role '${userRoleName}' is not authorized to access this resource. Required: [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
