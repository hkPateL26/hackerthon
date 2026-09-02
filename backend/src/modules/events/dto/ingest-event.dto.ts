import {
  IsUUID,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsIn,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IngestEventDto {
  @ApiProperty({ description: 'Target Camera UUID' })
  @IsUUID('4', { message: 'cameraId must be a valid UUID' })
  cameraId!: string;

  @ApiProperty({
    description: 'Event type code (e.g. PERSON_DETECTED, VEHICLE_DETECTED)',
    example: 'PERSON_DETECTED',
  })
  @IsString()
  eventTypeCode!: string;

  @ApiProperty({
    description: 'Normalized category',
    enum: ['PERSON', 'VEHICLE'],
    example: 'PERSON',
  })
  @IsIn(['PERSON', 'VEHICLE'], { message: 'detectedCategory must be PERSON or VEHICLE' })
  detectedCategory!: string;

  @ApiProperty({
    description: 'Original YOLO detected class name',
    example: 'person',
  })
  @IsString()
  detectedClass!: string;

  @ApiProperty({
    description: 'Detection confidence score (0.0 to 1.0)',
    example: 0.895,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number;

  @ApiPropertyOptional({
    description: 'ISO timestamp when event occurred',
    example: '2026-09-02T16:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @ApiPropertyOptional({ description: 'Frame width in pixels', default: 640 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  frameWidth?: number;

  @ApiPropertyOptional({ description: 'Frame height in pixels', default: 360 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  frameHeight?: number;

  @ApiProperty({ description: 'Bounding box top-left X coordinate' })
  @IsNumber()
  bboxX!: number;

  @ApiProperty({ description: 'Bounding box top-left Y coordinate' })
  @IsNumber()
  bboxY!: number;

  @ApiProperty({ description: 'Bounding box width' })
  @IsNumber()
  bboxWidth!: number;

  @ApiProperty({ description: 'Bounding box height' })
  @IsNumber()
  bboxHeight!: number;

  @ApiPropertyOptional({
    description: 'Relative snapshot path on D: drive',
    example: 'runtime/snapshots/snap_123.jpg',
  })
  @IsOptional()
  @IsString()
  snapshotPath?: string | null;

  @ApiPropertyOptional({
    description: 'Detection model / engine identifier',
    default: 'YOLOv8n',
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({
    description: 'Arbitrary JSON telemetry / metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
