import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BoundingBoxDto {
  @ApiProperty()
  x!: number;

  @ApiProperty()
  y!: number;

  @ApiProperty()
  width!: number;

  @ApiProperty()
  height!: number;
}

export class TrackResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  cameraId!: string;

  @ApiPropertyOptional()
  cameraCode?: string;

  @ApiPropertyOptional()
  cameraName?: string;

  @ApiProperty()
  sessionId!: string;

  @ApiProperty({ description: 'Numeric track ID unique within camera session' })
  trackId!: number;

  @ApiProperty({ enum: ['PERSON', 'VEHICLE'] })
  category!: string;

  @ApiProperty()
  detectedClass!: string;

  @ApiProperty({ enum: ['NEW', 'ACTIVE', 'LOST', 'TERMINATED'] })
  status!: string;

  @ApiProperty()
  firstSeenAt!: string;

  @ApiProperty()
  lastSeenAt!: string;

  @ApiProperty()
  detectionCount!: number;

  @ApiPropertyOptional()
  confidence!: number | null;

  @ApiPropertyOptional({ type: BoundingBoxDto })
  bbox!: BoundingBoxDto | null;

  @ApiProperty()
  metadata!: Record<string, any>;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class PaginatedTracksResponseDto {
  @ApiProperty({ type: [TrackResponseDto] })
  items!: TrackResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

export class ActiveTracksResponseDto {
  @ApiProperty()
  cameraId!: string;

  @ApiPropertyOptional()
  sessionId?: string;

  @ApiProperty({ type: [TrackResponseDto] })
  activeTracks!: TrackResponseDto[];
}
