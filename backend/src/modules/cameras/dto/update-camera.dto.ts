import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsUUID,
  IsBoolean,
  IsIP,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CameraStatus } from '../enums/camera-status.enum.js';
import { CameraType } from '../enums/camera-type.enum.js';

export class UpdateCameraDto {
  @ApiPropertyOptional({ example: 'CAM-AHM-005' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Camera code may only contain letters, numbers, hyphens, and underscores' })
  cameraCode?: string;

  @ApiPropertyOptional({ example: 'Updated Camera Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: CameraType })
  @IsOptional()
  @IsEnum(CameraType, { message: 'Invalid camera type' })
  cameraType?: CameraType;

  @ApiPropertyOptional({ example: 'Hikvision' })
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional({ example: 'DS-2DF8442IXS' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 'SN12345678' })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ example: '192.168.10.15' })
  @IsOptional()
  @IsIP(undefined, { message: 'Invalid IP address format' })
  ipAddress?: string;

  @ApiPropertyOptional({ example: 554 })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Port must be between 1 and 65535' })
  @Max(65535, { message: 'Port must be between 1 and 65535' })
  port?: number;

  @ApiPropertyOptional({ example: 'rtsp://192.168.10.15:554/live' })
  @IsOptional()
  @IsString()
  rtspUrl?: string;

  @ApiPropertyOptional({ example: 'Updated Location Name' })
  @IsOptional()
  @IsString()
  locationName?: string;

  @ApiPropertyOptional({ example: 'd1111111-0001-0001-0001-000000000001' })
  @IsOptional()
  @IsUUID('all', { message: 'Invalid district ID format' })
  districtId?: string;

  @ApiPropertyOptional({ example: 'e1111111-0001-0001-0001-000000000001' })
  @IsOptional()
  @IsUUID('all', { message: 'Invalid police station ID format' })
  policeStationId?: string;

  @ApiPropertyOptional({ example: 23.0512 })
  @IsOptional()
  @IsNumber()
  @Min(-90, { message: 'Latitude must be between -90 and 90' })
  @Max(90, { message: 'Latitude must be between -90 and 90' })
  latitude?: number;

  @ApiPropertyOptional({ example: 72.5234 })
  @IsOptional()
  @IsNumber()
  @Min(-180, { message: 'Longitude must be between -180 and 180' })
  @Max(180, { message: 'Longitude must be between -180 and 180' })
  longitude?: number;

  @ApiPropertyOptional({ enum: CameraStatus })
  @IsOptional()
  @IsEnum(CameraStatus, { message: 'Invalid camera status' })
  status?: CameraStatus;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2025-01-15T10:00:00Z' })
  @IsOptional()
  installedAt?: Date;

  @ApiPropertyOptional({ example: { resolution: '3840x2160' } })
  @IsOptional()
  metadata?: Record<string, any>;
}
