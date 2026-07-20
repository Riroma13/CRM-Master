import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class KnowledgeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    let requestTenantId: string | undefined;

    if (request.body?.tenantId) {
      requestTenantId = request.body.tenantId;
    } else if (request.query?.tenantId) {
      requestTenantId = request.query.tenantId as string;
    }

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
