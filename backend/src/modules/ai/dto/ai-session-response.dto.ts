import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AiSessionResponseDto {
  @ApiProperty()
  cameraId!: string;

  @ApiPropertyOptional()
  cameraCode?: string;

  @ApiPropertyOptional()
  cameraName?: string;

  @ApiProperty({
    enum: ['STOPPED', 'STARTING', 'RUNNING', 'STOPPING', 'ERROR'],
    example: 'RUNNING',
  })
  status!: 'STOPPED' | 'STARTING' | 'RUNNING' | 'STOPPING' | 'ERROR';

  @ApiProperty()
  sampleFps!: number;

  @ApiProperty()
  confidenceThreshold!: number;

  @ApiProperty()
  processedFrames!: number;

  @ApiProperty()
  detectionsCount!: number;

  @ApiProperty()
  approxFps!: number;

  @ApiPropertyOptional()
  startedAt!: string | null;

  @ApiPropertyOptional()
  error!: string | null;
}
