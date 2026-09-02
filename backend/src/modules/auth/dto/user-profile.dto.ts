import { ApiProperty } from '@nestjs/swagger';
import { RoleName } from '../entities/role.entity.js';

export class UserProfileDto {
  @ApiProperty({ example: 'b1c2d3e4-0001-0001-0001-000000000001' })
  id: string;

  @ApiProperty({ example: 'admin@police.gujarat.gov.in' })
  email: string;

  @ApiProperty({ example: 'System Administrator' })
  fullName: string;

  @ApiProperty({ enum: RoleName, example: RoleName.ADMIN })
  role: RoleName;

  @ApiProperty({ example: ['*'] })
  permissions: string[];

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-09-02T12:00:00.000Z', nullable: true })
  lastLoginAt: Date | null;
}
