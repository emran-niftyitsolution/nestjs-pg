// src/modules/users/dto/user-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Role } from '@/common/enums/role.enum';

// Mirrors UsersService's SafeUser — password never enters the response shape.
export const userResponseSchema = z.object({
  id: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  avatar: z.string().nullable(),
  role: z.enum(Role),
  isActive: z.boolean(),
  emailVerified: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class UserResponseDto extends createZodDto(userResponseSchema) {}
