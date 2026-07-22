// src/modules/users/dto/create-user.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createUserSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.email().max(255),
  password: z.string().min(8).max(128),
  phone: z.string().max(20).optional(),
  avatar: z.url().optional(),
});

export class CreateUserDto extends createZodDto(createUserSchema) {}
