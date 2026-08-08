import { createHash } from 'node:crypto';

export type AuthorizationStatus = 'PENDING' | 'PURGING' | 'FAILED' | 'PURGED';

export const IDENTITY_MUTATION_NAMESPACE = '50be45c0-b8f5-48d0-8c2f-2431aa0c5cb0';

function uuidBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replaceAll('-', ''), 'hex');
}

function deriveUuidV5(name: string): string {
  const digest = createHash('sha1')
    .update(Buffer.concat([uuidBytes(IDENTITY_MUTATION_NAMESPACE), Buffer.from(name)]))
    .digest();
  digest[6] = (digest[6] & 0x0f) | 0x50;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = digest.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function deriveMutationId(input: { tenantId: string; operation: string; resourceId: string; key: string }): string {
  return deriveUuidV5(`mutation:${input.tenantId}:${input.operation}:${input.resourceId}:${input.key}`);
}

export function deriveAuditEventId(tenantId: string, eventType: string, resourceId: string, mutationId: string): string {
  return deriveUuidV5(`audit:${tenantId}:${eventType}:${resourceId}:${mutationId}`);
}

export interface HostTenantContext {
  hostTenantId: string;
  hostTenantSlug: string;
}

export interface ProviderSession {
  userId: string;
  activeOrganizationId: string | null;
}

export interface IdentityProvider {
  getSession(headers: Pick<Headers, 'get'>): Promise<ProviderSession | null>;
}

export interface OutboxEvent {
  eventId: string;
  tenantId: string;
  mutationId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export interface IdentityCatalogDiagnostic {
  table: string;
  column: string;
  issue: 'missing' | 'must be non-null' | 'must be unique' | 'foreign key required';
}

export type IdentityActivationState =
  | { enabled: true; routesEnabled: true; workersEnabled: true; code: null; diagnostics: [] }
  | {
      enabled: false;
      routesEnabled: false;
      workersEnabled: false;
      code: 'IDENTITY_CATALOG_MISMATCH';
      diagnostics: ReadonlyArray<IdentityCatalogDiagnostic>;
    };
