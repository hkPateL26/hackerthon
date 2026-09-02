import {
  IsUUID,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsIn,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SyncTrackItemDto {
  @ApiProperty({ description: 'Numeric Track ID unique within camera session', example: 17 })
  @IsNumber()
  trackId!: number;

  @ApiProperty({ description: 'Normalized category: PERSON or VEHICLE', example: 'PERSON' })
  @IsIn(['PERSON', 'VEHICLE'])
  category!: string;

  @ApiProperty({ description: 'Original YOLO detected class name', example: 'person' })
  @IsString()
  detectedClass!: string;

  @ApiPropertyOptional({ description: 'Detection confidence (0.0 to 1.0)', example: 0.895 })
  @IsOptional()
  @IsNumber()
  confidence?: number;

  @ApiPropertyOptional({ description: 'Bounding box X' })
  @IsOptional()
  @IsNumber()
  bboxX?: number;

  @ApiPropertyOptional({ description: 'Bounding box Y' })
  @IsOptional()
  @IsNumber()
  bboxY?: number;

  @ApiPropertyOptional({ description: 'Bounding box Width' })
  @IsOptional()
  @IsNumber()
  bboxWidth?: number;

  @ApiPropertyOptional({ description: 'Bounding box Height' })
  @IsOptional()
  @IsNumber()
  bboxHeight?: number;

  @ApiProperty({ description: 'Track lifecycle status', enum: ['NEW', 'ACTIVE', 'LOST', 'TERMINATED'] })
  @IsIn(['NEW', 'ACTIVE', 'LOST', 'TERMINATED'])
  status!: string;

  @ApiProperty({ description: 'Timestamp when track was first confirmed' })
  @IsDateString()
  firstSeenAt!: string;

  @ApiProperty({ description: 'Timestamp of most recent detection' })
  @IsDateString()
  lastSeenAt!: string;

  @ApiPropertyOptional({ description: 'Number of times object was detected across frames', default: 1 })
  @IsOptional()
  @IsNumber()
  detectionCount?: number;

  @ApiPropertyOptional({ description: 'Trajectory history or custom tags' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SyncTracksDto {
  @ApiProperty({ description: 'Camera UUID' })
  @IsUUID('4')
  cameraId!: string;

  @ApiProperty({ description: 'AI Session UUID isolating track IDs' })
  @IsUUID('4')
  sessionId!: string;

  @ApiProperty({ description: 'List of track updates to synchronize', type: [SyncTrackItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncTrackItemDto)
  tracks!: SyncTrackItemDto[];
}
