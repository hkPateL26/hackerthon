import {
  IsOptional,
  IsUUID,
  IsIn,
  IsString,
  IsNumber,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryEventsDto {
  @ApiPropertyOptional({ description: 'Filter by Camera UUID' })
  @IsOptional()
  @IsUUID('4')
  cameraId?: string;

  @ApiPropertyOptional({
    description: 'Filter by category (PERSON or VEHICLE)',
    enum: ['PERSON', 'VEHICLE'],
  })
  @IsOptional()
  @IsIn(['PERSON', 'VEHICLE'])
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by event type code (e.g. PERSON_DETECTED)' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Minimum confidence threshold (0.0 to 1.0)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  minConfidence?: number;

  @ApiPropertyOptional({ description: 'Filter events occurring on or after ISO timestamp' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Filter events occurring on or before ISO timestamp' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
