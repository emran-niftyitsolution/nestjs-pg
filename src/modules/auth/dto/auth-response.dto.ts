// src/auth/dto/auth-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UserResponseDto } from '@/users/dto/user-response.dto';

export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: UserResponseDto.schema,
});

export class AuthResponseDto extends createZodDto(authResponseSchema) {}
