import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
export interface TrustedWorkflowContext {
  tenantId: string;
  actorId: string;
  role: 'owner' | 'admin';
}

@Injectable()
export class WorkflowTenantContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & Record<string, any>>();
    if (!request.identitySession) throw new UnauthorizedException('IDENTITY_SESSION_REQUIRED');
    if (!request.hostTenantId || !request.identityMembership) {
      throw new ForbiddenException('WORKFLOW_TENANT_CONTEXT_REQUIRED');
    }
    if (!['owner', 'admin'].includes(request.identityMembership.role)) {
      throw new ForbiddenException('WORKFLOW_PERMISSION_DENIED');
    }
    request.workflowContext = {
      tenantId: request.hostTenantId,
      actorId: request.identitySession.userId,
      role: request.identityMembership.role,
    } satisfies TrustedWorkflowContext;
    return true;
  }
}
