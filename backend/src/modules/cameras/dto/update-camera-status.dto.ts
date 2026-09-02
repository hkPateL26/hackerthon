import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CameraStatus } from '../enums/camera-status.enum.js';

export class UpdateCameraStatusDto {
  @ApiProperty({ enum: CameraStatus, example: CameraStatus.ONLINE })
  @IsEnum(CameraStatus, { message: 'Invalid camera status' })
  @IsNotEmpty({ message: 'Status is required' })
  status: CameraStatus;
}
