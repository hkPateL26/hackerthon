import { SetMetadata } from '@nestjs/common';
import { RoleName } from '../../modules/auth/entities/role.entity.js';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
