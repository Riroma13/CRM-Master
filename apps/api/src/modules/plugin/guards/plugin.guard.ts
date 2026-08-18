import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { TrustedPluginContext } from '@shared/plugin/plugin.types';

@Injectable()
export class PluginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & Record<string, any>>();
    if (!request.identitySession) throw new UnauthorizedException('IDENTITY_SESSION_REQUIRED');
    if (!request.hostTenantId || !request.identityMembership) {
      throw new ForbiddenException('PLUGIN_TENANT_CONTEXT_REQUIRED');
    }
    if (!['owner', 'admin'].includes(request.identityMembership.role)) {
      throw new ForbiddenException('PLUGIN_PERMISSION_DENIED');
    }

    request.pluginContext = {
      tenantId: request.hostTenantId,
      actorId: request.identitySession.userId,
      role: request.identityMembership.role,
    } satisfies TrustedPluginContext;
    return true;
  }
}
