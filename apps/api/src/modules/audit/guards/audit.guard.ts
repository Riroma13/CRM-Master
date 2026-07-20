import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AuditGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.query?.tenantId as string | undefined;

    if (!tenantId) {
      throw new ForbiddenException('tenantId query parameter is required');
    }

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (user.role === 'superadmin') {
      return true;
    }

    if (user.tenantId && user.tenantId !== tenantId) {
      throw new ForbiddenException('Cross-tenant access denied');
    }

    return true;
  }
}
