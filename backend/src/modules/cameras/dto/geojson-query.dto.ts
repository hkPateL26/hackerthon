import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsUUID,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CameraStatus } from '../enums/camera-status.enum.js';
import { CameraType } from '../enums/camera-type.enum.js';

export class GeoJsonQueryDto {
  @ApiPropertyOptional({
    description: 'Search across camera code, name, vendor, model, and location',
    example: 'Iskcon',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by district UUID',
    example: 'd1111111-0001-4001-a001-000000000001',
  })
  @IsOptional()
  @IsUUID('all', { message: 'Invalid district ID format' })
  districtId?: string;

  @ApiPropertyOptional({
    description: 'Filter by police station UUID',
    example: 'e1111111-0001-4001-a001-000000000001',
  })
  @IsOptional()
  @IsUUID('all', { message: 'Invalid police station ID format' })
  policeStationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by camera operational status',
    enum: CameraStatus,
  })
  @IsOptional()
  @IsEnum(CameraStatus, { message: 'Invalid camera status' })
  status?: CameraStatus;

  @ApiPropertyOptional({
    description: 'Filter by camera hardware type',
    enum: CameraType,
  })
  @IsOptional()
  @IsEnum(CameraType, { message: 'Invalid camera type' })
  cameraType?: CameraType;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @Transform(({ obj }) => {
    const val = obj?.isActive;
    if (val === 'false' || val === false || val === '0' || val === 0) return false;
    if (val === 'true' || val === true || val === '1' || val === 1) return true;
    return undefined;
  })
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      'Spatial bounding-box envelope: minLng,minLat,maxLng,maxLat (-180..180, -90..90)',
    example: '72.4,23.0,72.6,23.1',
  })
  @IsOptional()
  @IsString()
  @Matches(
    /^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/,
    {
      message:
        'bbox must be formatted as four comma-separated numbers: minLng,minLat,maxLng,maxLat',
    },
  )
  bbox?: string;
}
