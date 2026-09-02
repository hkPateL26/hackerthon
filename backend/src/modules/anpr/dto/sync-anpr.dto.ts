import {
  IsUUID,
  IsOptional,
  IsInt,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsIn,
  IsNumber,
  Min,
  Max,
  IsDateString,
  IsObject,
  ValidateIf,
} from 'class-validator';

export class SyncAnprItemDto {
  @IsUUID('4', { message: 'cameraId must be a valid UUID' })
  @IsNotEmpty()
  cameraId: string;

  @ValidateIf((o) => o.trackId !== undefined && o.trackId !== null)
  @IsUUID('4', { message: 'sessionId must be a valid UUID when trackId is provided' })
  @IsNotEmpty({ message: 'sessionId is required when trackId is provided' })
  sessionId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  trackId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  vehicleClass?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  plateTextRaw: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  plateTextNormalized?: string;

  @IsOptional()
  @IsIn(['VALID', 'LOW_CONFIDENCE', 'INVALID_FORMAT'])
  validationStatus?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  plateDetectionConfidence?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  ocrConfidence?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  finalConfidence?: number;

  @IsOptional()
  @IsNumber()
  plateBboxX?: number;

  @IsOptional()
  @IsNumber()
  plateBboxY?: number;

  @IsOptional()
  @IsNumber()
  plateBboxWidth?: number;

  @IsOptional()
  @IsNumber()
  plateBboxHeight?: number;

  @IsOptional()
  @IsString()
  plateSnapshotPath?: string;

  @IsOptional()
  @IsString()
  vehicleSnapshotPath?: string;

  @IsDateString()
  @IsNotEmpty()
  occurredAt: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SyncAnprDto {
  @IsUUID('4', { message: 'cameraId must be a valid UUID' })
  @IsNotEmpty()
  cameraId: string;

  @IsOptional()
  @IsUUID('4', { message: 'sessionId must be a valid UUID' })
  sessionId?: string;

  @IsNotEmpty()
  observations: SyncAnprItemDto[];
}
