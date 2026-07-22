// src/modules/auth/dto/reset-password.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}
