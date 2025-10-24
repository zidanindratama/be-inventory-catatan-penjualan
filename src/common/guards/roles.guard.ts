import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = ctx.switchToHttp().getRequest();
    const user = request.user as { role?: Role } | undefined;

    if (!user?.role) {
      throw new ForbiddenException('No role on user payload');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}
