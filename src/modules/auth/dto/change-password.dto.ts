// src/modules/auth/dto/change-password.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export class ChangePasswordDto extends createZodDto(changePasswordSchema) {}
