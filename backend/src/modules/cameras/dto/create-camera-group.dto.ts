import { IsString, IsNotEmpty, IsOptional, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCameraGroupDto {
  @ApiProperty({ example: 'SG Highway Surveillance Corridor' })
  @IsString()
  @IsNotEmpty({ message: 'Group name is required' })
  name: string;

  @ApiPropertyOptional({ example: 'Traffic monitoring corridor along SG Highway' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['c1111111-0001-0001-0001-000000000001'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each camera ID must be a valid UUID' })
  cameraIds?: string[];
}

export class AddCameraToGroupDto {
  @ApiProperty({ example: 'c1111111-0001-0001-0001-000000000001' })
  @IsUUID('4', { message: 'Camera ID must be a valid UUID' })
  @IsNotEmpty()
  cameraId: string;
}
