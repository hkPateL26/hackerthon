import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StreamStatus, StreamSourceType, StreamOutputType } from '../enums/stream-status.enum.js';

export class StreamResponseDto {
  @ApiProperty({ example: 's1111111-0001-4001-a001-000000000001', description: 'Stream session ID' })
  id: string;

  @ApiProperty({ example: 'c1111111-0001-4001-a001-000000000001', description: 'Associated Camera ID' })
  cameraId: string;

  @ApiProperty({ enum: StreamSourceType, example: StreamSourceType.FILE, description: 'Source type (FILE or RTSP)' })
  sourceType: StreamSourceType;

  @ApiProperty({ enum: StreamOutputType, example: StreamOutputType.HLS, description: 'Output packaging type' })
  outputType: StreamOutputType;

  @ApiProperty({ enum: StreamStatus, example: StreamStatus.RUNNING, description: 'Current stream operational status' })
  status: StreamStatus;

  @ApiPropertyOptional({
    example: '/api/streams/hls/c1111111-0001-4001-a001-000000000001/index.m3u8',
    description: 'Safe browser-accessible HLS playlist URL',
  })
  playbackUrl: string | null;

  @ApiPropertyOptional({ example: '2026-09-02T14:30:00.000Z', description: 'Session start timestamp' })
  startedAt: string | null;

  @ApiPropertyOptional({ example: null, description: 'Session stop timestamp' })
  stoppedAt: string | null;

  @ApiPropertyOptional({ example: null, description: 'Sanitized error message if in ERROR state' })
  lastError: string | null;
}

export class StreamStatusResponseDto {
  @ApiProperty({ example: 'c1111111-0001-4001-a001-000000000001' })
  cameraId: string;

  @ApiProperty({ enum: StreamStatus, example: StreamStatus.RUNNING })
  status: StreamStatus;

  @ApiProperty({ enum: StreamSourceType, example: StreamSourceType.FILE })
  sourceType: StreamSourceType;

  @ApiPropertyOptional({ example: '/api/streams/hls/c1111111-0001-4001-a001-000000000001/index.m3u8' })
  playbackUrl: string | null;

  @ApiPropertyOptional({ example: '2026-09-02T14:30:00.000Z' })
  startedAt: string | null;

  @ApiPropertyOptional({ example: null })
  stoppedAt: string | null;

  @ApiPropertyOptional({ example: null })
  lastError: string | null;
}
