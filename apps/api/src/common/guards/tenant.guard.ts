import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'] || request.tenant?.id;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required');
    }
    request.tenantId = tenantId;
    return true;
  }
}
