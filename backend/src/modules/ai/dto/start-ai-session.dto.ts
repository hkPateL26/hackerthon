import { IsUUID, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartAiSessionDto {
  @ApiProperty({ description: 'Target Camera UUID' })
  @IsUUID('4', { message: 'cameraId must be a valid UUID' })
  cameraId!: string;

  @ApiPropertyOptional({
    description: 'Frame sampling rate (FPS) for CPU inference',
    default: 1.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(5.0)
  sampleFps?: number = 1.5;

  @ApiPropertyOptional({
    description: 'Minimum confidence threshold for detections',
    default: 0.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1.0)
  confidenceThreshold?: number = 0.5;

  @ApiPropertyOptional({
    description: 'Custom video source URL or file path override',
  })
  @IsOptional()
  sourceUrl?: string;
}
