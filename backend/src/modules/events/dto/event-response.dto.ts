import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EventResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  cameraId!: string;

  @ApiPropertyOptional()
  cameraCode?: string;

  @ApiPropertyOptional()
  cameraName?: string;

  @ApiProperty()
  eventTypeCode!: string;

  @ApiProperty()
  eventTypeName!: string;

  @ApiProperty()
  detectedCategory!: string;

  @ApiProperty()
  detectedClass!: string;

  @ApiProperty()
  confidence!: number;

  @ApiProperty()
  occurredAt!: string;

  @ApiProperty()
  frameWidth!: number;

  @ApiProperty()
  frameHeight!: number;

  @ApiProperty()
  bboxX!: number;

  @ApiProperty()
  bboxY!: number;

  @ApiProperty()
  bboxWidth!: number;

  @ApiProperty()
  bboxHeight!: number;

  @ApiPropertyOptional()
  snapshotPath!: string | null;

  @ApiPropertyOptional()
  snapshotUrl!: string | null;

  @ApiProperty()
  source!: string;

  @ApiPropertyOptional()
  trackId?: number | null;

  @ApiProperty()
  metadata!: Record<string, any>;

  @ApiProperty()
  createdAt!: string;
}

export class PaginatedEventsResponseDto {
  @ApiProperty({ type: [EventResponseDto] })
  items!: EventResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
