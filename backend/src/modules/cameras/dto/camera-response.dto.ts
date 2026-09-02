import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CameraStatus } from '../enums/camera-status.enum.js';
import { CameraType } from '../enums/camera-type.enum.js';

export class DistrictSummaryDto {
  @ApiProperty({ example: 'd1111111-0001-0001-0001-000000000001' })
  id: string;

  @ApiProperty({ example: 'Ahmedabad City' })
  name: string;

  @ApiProperty({ example: 'AHM' })
  code: string;
}

export class PoliceStationSummaryDto {
  @ApiProperty({ example: 'e1111111-0001-0001-0001-000000000001' })
  id: string;

  @ApiProperty({ example: 'Satellite Police Station' })
  name: string;

  @ApiProperty({ example: 'PS-AHM-SAT' })
  code: string;

  @ApiPropertyOptional({ example: '079-26764500' })
  contactNumber?: string | null;
}

export class SafeCameraResponseDto {
  @ApiProperty({ example: 'c1111111-0001-0001-0001-000000000001' })
  id: string;

  @ApiProperty({ example: 'CAM-AHM-001' })
  cameraCode: string;

  @ApiProperty({ example: 'Iskcon Cross Road Pan-Tilt-Zoom North' })
  name: string;

  @ApiPropertyOptional({ example: 'High definition PTZ camera' })
  description: string | null;

  @ApiProperty({ enum: CameraType, example: CameraType.PTZ })
  cameraType: CameraType;

  @ApiPropertyOptional({ example: 'Hikvision' })
  vendor: string | null;

  @ApiPropertyOptional({ example: 'DS-2DF8442IXS-AELW' })
  model: string | null;

  @ApiPropertyOptional({ example: 'HK20250912001' })
  serialNumber: string | null;

  @ApiPropertyOptional({ example: '192.168.10.11' })
  ipAddress: string | null;

  @ApiProperty({ example: 554 })
  port: number;

  @ApiPropertyOptional({
    example: 'rtsp://***:***@192.168.10.11:554/Streaming/Channels/101',
    description: 'Safe sanitized RTSP URL with redacted credentials',
  })
  streamUrl: string | null;

  @ApiPropertyOptional({ example: 'Iskcon Junction, SG Highway' })
  locationName: string | null;

  @ApiProperty({ type: DistrictSummaryDto })
  district: DistrictSummaryDto | null;

  @ApiProperty({ type: PoliceStationSummaryDto })
  policeStation: PoliceStationSummaryDto | null;

  @ApiProperty({ example: 23.0305 })
  latitude: number;

  @ApiProperty({ example: 72.5074 })
  longitude: number;

  @ApiProperty({ enum: CameraStatus, example: CameraStatus.ONLINE })
  status: CameraStatus;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: '2025-01-15T10:00:00Z' })
  installedAt: Date | null;

  @ApiPropertyOptional({ example: '2025-03-01T12:00:00Z' })
  lastSeenAt: Date | null;

  @ApiProperty({ example: { resolution: '3840x2160', fps: 30 } })
  metadata: Record<string, any>;

  @ApiProperty({ example: '2025-01-15T10:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-15T10:00:00Z' })
  updatedAt: Date;
}

export class PaginatedCameraResponseDto {
  @ApiProperty({ type: [SafeCameraResponseDto] })
  items: SafeCameraResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 14 })
  total: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}
