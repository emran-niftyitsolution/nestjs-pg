// src/modules/auth/auth.types.ts

import type { Role } from '@/common/enums/role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}
