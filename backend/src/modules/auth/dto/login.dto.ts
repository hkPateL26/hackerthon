import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'admin@police.gujarat.gov.in',
    description: 'Registered police department email address',
  })
  @IsEmail({}, { message: 'Please provide a valid official email address' })
  @IsNotEmpty({ message: 'Email address is required' })
  email: string;

  @ApiProperty({
    example: '••••••••',
    description: 'Account password (minimum 6 characters)',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}
