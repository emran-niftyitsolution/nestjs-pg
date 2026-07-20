// src/common/decorators/roles.decorator.ts

import { SetMetadata } from '@nestjs/common';
import type { Role } from '@/common/enums/role.enum';

export const ROLES_KEY = 'roles';

/** Marks a route (or controller) as restricted to the given roles; read by RolesGuard. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
