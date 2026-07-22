// src/modules/auth/dto/forgot-password.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.email().max(255),
});

export class ForgotPasswordDto extends createZodDto(forgotPasswordSchema) {}
