import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const BILLING_ADMIN_KEY = 'billing_admin';

@Injectable()
export class BillingGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const isAdmin = this.reflector.getAllAndOverride<boolean>(
      BILLING_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );

    const path: string = request.path ?? request.originalUrl ?? '';

    const isAdminRoute = path.startsWith('/api/v1/admin/billing') || isAdmin;

    if (isAdminRoute) {
      if (!request.user) {
        throw new UnauthorizedException(
          'Authentication required for admin billing endpoints',
        );
      }
      if (request.user.role !== 'superadmin') {
        throw new ForbiddenException(
          'Admin billing endpoints require superadmin role',
        );
      }
      return true;
    }

    const tenantId = request.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Could not resolve tenant from request');
    }

    if (request.user?.tenantId && request.user.tenantId !== tenantId) {
      throw new ForbiddenException('Tenant mismatch between token and request');
    }

    return true;
  }
}
