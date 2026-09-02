import {
  IsString,
  IsNotEmpty,
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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CameraStatus } from '../enums/camera-status.enum.js';
import { CameraType } from '../enums/camera-type.enum.js';

export class CreateCameraDto {
  @ApiProperty({ example: 'CAM-AHM-005', description: 'Unique camera identifier code' })
  @IsString()
  @IsNotEmpty({ message: 'Camera code is required' })
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Camera code may only contain letters, numbers, hyphens, and underscores' })
  cameraCode: string;

  @ApiProperty({ example: 'SG Highway SGVP Circle North', description: 'Display name of camera' })
  @IsString()
  @IsNotEmpty({ message: 'Camera name is required' })
  name: string;

  @ApiPropertyOptional({ example: 'Overhead PTZ camera monitoring SGVP intersection' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: CameraType, default: CameraType.FIXED })
  @IsOptional()
  @IsEnum(CameraType, { message: 'Invalid camera type' })
  cameraType?: CameraType;

  @ApiPropertyOptional({ example: 'Hikvision' })
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional({ example: 'DS-2DF8442IXS-AELW' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 'HK20250912005' })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ example: '192.168.10.15' })
  @IsOptional()
  @IsIP(undefined, { message: 'Invalid IP address format' })
  ipAddress?: string;

  @ApiPropertyOptional({ example: 554, default: 554 })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Port must be between 1 and 65535' })
  @Max(65535, { message: 'Port must be between 1 and 65535' })
  port?: number;

  @ApiPropertyOptional({ example: 'rtsp://admin:pass@192.168.10.15:554/live' })
  @IsOptional()
  @IsString()
  rtspUrl?: string;

  @ApiPropertyOptional({ example: 'SGVP Circle, SG Highway' })
  @IsOptional()
  @IsString()
  locationName?: string;

  @ApiProperty({ example: 'd1111111-0001-0001-0001-000000000001', description: 'District UUID' })
  @IsUUID('all', { message: 'Invalid district ID format' })
  @IsNotEmpty({ message: 'District ID is required' })
  districtId: string;

  @ApiProperty({ example: 'e1111111-0001-0001-0001-000000000001', description: 'Police Station UUID' })
  @IsUUID('all', { message: 'Invalid police station ID format' })
  @IsNotEmpty({ message: 'Police station ID is required' })
  policeStationId: string;

  @ApiProperty({ example: 23.0512, description: 'Latitude (-90 to 90)' })
  @IsNumber()
  @Min(-90, { message: 'Latitude must be between -90 and 90' })
  @Max(90, { message: 'Latitude must be between -90 and 90' })
  latitude: number;

  @ApiProperty({ example: 72.5234, description: 'Longitude (-180 to 180)' })
  @IsNumber()
  @Min(-180, { message: 'Longitude must be between -180 and 180' })
  @Max(180, { message: 'Longitude must be between -180 and 180' })
  longitude: number;

  @ApiPropertyOptional({ enum: CameraStatus, default: CameraStatus.ONLINE })
  @IsOptional()
  @IsEnum(CameraStatus, { message: 'Invalid camera status' })
  status?: CameraStatus;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2025-01-15T10:00:00Z' })
  @IsOptional()
  installedAt?: Date;

  @ApiPropertyOptional({ example: { resolution: '3840x2160', fps: 30 } })
  @IsOptional()
  metadata?: Record<string, any>;
}
