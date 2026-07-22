// src/modules/users/dto/update-user-role.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Role } from '@/common/enums/role.enum';

export const updateUserRoleSchema = z.object({
  role: z.enum(Role),
});

export class UpdateUserRoleDto extends createZodDto(updateUserRoleSchema) {}
