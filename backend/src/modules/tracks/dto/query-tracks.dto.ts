import {
  IsOptional,
  IsUUID,
  IsIn,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryTracksDto {
  @ApiPropertyOptional({ description: 'Filter by Camera UUID' })
  @IsOptional()
  @IsUUID('4')
  cameraId?: string;

  @ApiPropertyOptional({ description: 'Filter by AI Session UUID' })
  @IsOptional()
  @IsUUID('4')
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Filter by Category: PERSON or VEHICLE' })
  @IsOptional()
  @IsIn(['PERSON', 'VEHICLE'])
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by Status: NEW, ACTIVE, LOST, TERMINATED' })
  @IsOptional()
  @IsIn(['NEW', 'ACTIVE', 'LOST', 'TERMINATED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter tracks seen after this ISO date' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Filter tracks seen before this ISO date' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Page number (default: 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Page size (default: 20, max: 100)', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
