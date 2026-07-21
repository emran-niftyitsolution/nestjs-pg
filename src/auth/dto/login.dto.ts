// src/auth/dto/login.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email().max(255),
  password: z.string().min(1),
});

export class LoginDto extends createZodDto(loginSchema) {}
