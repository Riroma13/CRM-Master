import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class PluginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.body?.tenantId || request.query?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('tenantId is required');
    }

    (request as any).tenantId = tenantId;
    return true;
  }
}
