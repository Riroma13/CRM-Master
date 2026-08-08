import { Injectable, Optional } from '@nestjs/common';
import {
  deriveAuditEventId,
  deriveMutationId,
  HostTenantContext,
  ProviderSession,
} from './identity.contracts';
import { AuthorizationOperation, IdentityAuthorizationRepository } from './identity-authorization.repository';

export type IdentityAuthorizationFailure =
  | 'IDENTITY_TENANT_CONTEXT_REQUIRED'
  | 'IDENTITY_SESSION_REQUIRED'
  | 'IDENTITY_ORGANIZATION_MEMBERSHIP_REQUIRED'
  | 'IDENTITY_ORGANIZATION_MISMATCH'
  | 'IDENTITY_PERMISSION_DENIED';

export { deriveAuditEventId, deriveMutationId } from './identity.contracts';

export interface IdentityMutationRequest {
  tenantId: string;
  subjectId: string;
  operation: string;
  resourceId: string;
  idempotencyKey: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export interface MutationIdInput {
  tenantId: string;
  operation: string;
  resourceId: string;
  key: string;
}

const RFC4122_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidIdempotencyKey(value: string): boolean {
  return RFC4122_UUID.test(value);
}


export function evaluateIdentityAuthorization(
  host: HostTenantContext | null,
  session: ProviderSession | null,
  membership: unknown,
  permissionGranted: boolean,
): IdentityAuthorizationFailure | null {
  if (!host?.hostTenantId) return 'IDENTITY_TENANT_CONTEXT_REQUIRED';
  if (!session) return 'IDENTITY_SESSION_REQUIRED';
  if (!membership) return 'IDENTITY_ORGANIZATION_MEMBERSHIP_REQUIRED';
  if (
    !session.activeOrganizationId ||
    session.activeOrganizationId !== (membership as { organizationId?: string }).organizationId
  ) {
    return 'IDENTITY_ORGANIZATION_MISMATCH';
  }
  if (!permissionGranted) return 'IDENTITY_PERMISSION_DENIED';
  return null;
}

@Injectable()
export class IdentityAuthorizationService {
  constructor(
    private readonly repository: IdentityAuthorizationRepository,
    @Optional() private readonly rbacInvalidator?: (tenantId: string, subjectId: string) => Promise<void> | void,
  ) {}

  async mutate(request: IdentityMutationRequest) {
    if (!isValidIdempotencyKey(request.idempotencyKey)) {
      throw new Error('IDENTITY_IDEMPOTENCY_KEY_INVALID');
    }

    const result = await this.repository.mutate({
      ...request,
      mutationId: deriveMutationId({
        tenantId: request.tenantId,
        operation: request.operation,
        resourceId: request.resourceId,
        key: request.idempotencyKey,
      }),
    });
    if (!result.denied) await this.invalidateRbac(request.tenantId, request.subjectId);
    return result;
  }

  async invalidateRbac(tenantId: string, subjectId: string): Promise<void> {
    await this.rbacInvalidator?.(tenantId, subjectId);
  }

  claim(tenantId: string, operationId: string, owner: string, now = new Date()) {
    return this.repository.claim(tenantId, operationId, owner, now);
  }

  complete(tenantId: string, operationId: string, owner: string, now = new Date()) {
    return this.repository.complete(tenantId, operationId, owner, now);
  }

  fail(tenantId: string, operationId: string, owner: string, reason: string, now = new Date()) {
    return this.repository.fail(tenantId, operationId, owner, reason, now);
  }

  isDenied(operation: Pick<AuthorizationOperation, 'status'>) {
    return operation.status !== 'PURGED';
  }
}
