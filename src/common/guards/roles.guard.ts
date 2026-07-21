// src/common/guards/roles.guard.ts

import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { AuthenticatedUser } from '@/auth/auth.types';
import { ROLES_KEY } from '@/common/decorators/roles.decorator';
import type { Role } from '@/common/enums/role.enum';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

/**
 * Authorization only — assumes the global JwtAuthGuard already ran and
 * populated `request.user`. Apply alone: `@UseGuards(RolesGuard)`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request: RequestWithUser =
      context.getType<'graphql'>() === 'graphql'
        ? GqlExecutionContext.create(context).getContext().req
        : context.switchToHttp().getRequest<RequestWithUser>();
    const { user } = request;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }

    return true;
  }
}
