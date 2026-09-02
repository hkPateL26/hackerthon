import { ApiProperty } from '@nestjs/swagger';
import { UserProfileDto } from './user-profile.dto.js';

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Short-lived JWT access token (15 minutes validity)',
  })
  accessToken: string;

  @ApiProperty({
    example: 900,
    description: 'Access token expiration time in seconds',
  })
  expiresIn: number;

  @ApiProperty({
    type: UserProfileDto,
    description: 'Authenticated user profile information',
  })
  user: UserProfileDto;
}
