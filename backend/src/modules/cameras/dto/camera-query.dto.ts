import {
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CameraStatus } from '../enums/camera-status.enum.js';
import { CameraType } from '../enums/camera-type.enum.js';

export enum CameraSortBy {
  CREATED_AT = 'createdAt',
  CAMERA_CODE = 'cameraCode',
  NAME = 'name',
  STATUS = 'status',
  CAMERA_TYPE = 'cameraType',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class CameraQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100, { message: 'Maximum 100 cameras per page' })
  limit: number = 20;

  @ApiPropertyOptional({ example: 'Iskcon', description: 'Search across code, name, vendor, model, location' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'd1111111-0001-0001-0001-000000000001' })
  @IsOptional()
  @IsUUID('4')
  districtId?: string;

  @ApiPropertyOptional({ example: 'e1111111-0001-0001-0001-000000000001' })
  @IsOptional()
  @IsUUID('4')
  policeStationId?: string;

  @ApiPropertyOptional({ enum: CameraStatus })
  @IsOptional()
  @IsEnum(CameraStatus)
  status?: CameraStatus;

  @ApiPropertyOptional({ enum: CameraType })
  @IsOptional()
  @IsEnum(CameraType)
  cameraType?: CameraType;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: CameraSortBy, default: CameraSortBy.CREATED_AT })
  @IsOptional()
  @IsEnum(CameraSortBy)
  sortBy: CameraSortBy = CameraSortBy.CREATED_AT;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;
}
