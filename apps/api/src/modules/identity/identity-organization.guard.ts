import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AUTH_CLIENT, providerHeaders } from '../../common/auth-client.provider';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { PrismaService } from '../../common/prisma.service';
import { IdentityMembershipRepository } from './identity-membership.repository';
import { IdentityCatalogPreflightService } from './identity-catalog-preflight.service';
import { IDENTITY_CATALOG_SNAPSHOT } from './identity-catalog.config';
import { IdentityProvider } from './identity.contracts';

export const IDENTITY_PERMISSION_MATRIX: Record<string, ReadonlySet<string>> = {
  owner: new Set(['*']),
  admin: new Set(['*']),
};

export function hasIdentityPermission(role: string | undefined, resource: string, action: string): boolean {
  const permissions = IDENTITY_PERMISSION_MATRIX[role ?? ''];
  return Boolean(permissions?.has('*') || permissions?.has(`${resource}:${action}`));
}

@Injectable()
export class IdentityOrganizationGuard implements CanActivate {
  constructor(
    @Inject(AUTH_CLIENT) private readonly provider: IdentityProvider,
    private readonly prisma: PrismaService,
    private readonly memberships: IdentityMembershipRepository,
    private readonly reflector: Reflector,
    @Optional() private readonly preflight?: IdentityCatalogPreflightService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.preflight && !this.preflight.check(IDENTITY_CATALOG_SNAPSHOT).routesEnabled) {
      throw new ServiceUnavailableException('IDENTITY_CATALOG_MISMATCH');
    }

    const request = context.switchToHttp().getRequest<Request & { hostTenantId?: string }>();
    if (!request.hostTenantId) {
      throw new ForbiddenException('IDENTITY_TENANT_CONTEXT_REQUIRED');
    }

    const headers = new Headers();
    const authorization = request.headers.authorization;
    const cookie = request.headers.cookie;
    if (typeof authorization === 'string') headers.set('authorization', authorization);
    if (typeof cookie === 'string') headers.set('cookie', cookie);

    const session = await this.provider.getSession(providerHeaders(headers));
    if (!session) throw new UnauthorizedException('IDENTITY_SESSION_REQUIRED');

    const tenantClient = this.prisma.forTenant(request.hostTenantId) as any;
    const tenant = await tenantClient.tenant.findFirst({
      where: { id: request.hostTenantId },
      select: { betterAuthOrganizationId: true },
    });
    const organizationId = tenant?.betterAuthOrganizationId;
    const membership = organizationId
      ? await this.memberships.findMembership(request.hostTenantId, session.userId, organizationId)
      : null;
    if (!membership) throw new ForbiddenException('IDENTITY_ORGANIZATION_MEMBERSHIP_REQUIRED');
    if (!session.activeOrganizationId || session.activeOrganizationId !== membership.organizationId) {
      throw new ForbiddenException('IDENTITY_ORGANIZATION_MISMATCH');
    }

    const permission = this.reflector.getAllAndOverride<{ resource: string; action: string } | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (permission && !hasIdentityPermission(membership.role, permission.resource, permission.action)) {
      throw new ForbiddenException('IDENTITY_PERMISSION_DENIED');
    }

    (request as any).identitySession = session;
    (request as any).identityMembership = membership;
    return true;
  }
}
