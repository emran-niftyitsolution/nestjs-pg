// src/auth/dto/token-pair-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const tokenPairResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export class TokenPairResponseDto extends createZodDto(
  tokenPairResponseSchema,
) {}
