import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class ReportingGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const body = request.body;
    const query = request.query;
    const params = request.params;

    const requestTenantId = body?.tenantId ?? query?.tenantId ?? params?.tenantId;

    if (requestTenantId && user.tenantId && user.tenantId !== requestTenantId) {
      throw new ForbiddenException('Cross-tenant access denied');
    }

    const routeTenantId = request.tenantId;
    if (routeTenantId && user.tenantId && user.tenantId !== routeTenantId) {
      throw new ForbiddenException('Cross-tenant access denied');
    }

    return true;
  }
}
