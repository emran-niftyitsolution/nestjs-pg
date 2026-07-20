// src/auth/dto/forgot-password.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ maxLength: 255, format: 'email' })
  @IsEmail()
  @MaxLength(255)
  email!: string;
}
