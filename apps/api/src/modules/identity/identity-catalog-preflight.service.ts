import { Injectable } from '@nestjs/common';
import { IdentityActivationState, IdentityCatalogDiagnostic } from './identity.contracts';
import { IdentityCatalogSnapshot } from './identity-catalog.config';

export const IDENTITY_CATALOG_MISMATCH = 'IDENTITY_CATALOG_MISMATCH' as const;

export function evaluateIdentityCatalog(catalog: IdentityCatalogSnapshot): IdentityActivationState {
  const diagnostics: IdentityCatalogDiagnostic[] = [];

  if (!catalog.organizationSlug.exists) {
    diagnostics.push({ table: 'ba_organizations', column: 'slug', issue: 'missing' });
  } else {
    if (catalog.organizationSlug.nullable) {
      diagnostics.push({ table: 'ba_organizations', column: 'slug', issue: 'must be non-null' });
    }
    if (!catalog.organizationSlug.unique) {
      diagnostics.push({ table: 'ba_organizations', column: 'slug', issue: 'must be unique' });
    }
  }

  if (!catalog.invitationExpiresAt.exists) {
    diagnostics.push({ table: 'ba_invitations', column: 'expires_at', issue: 'missing' });
  } else if (catalog.invitationExpiresAt.nullable) {
    diagnostics.push({ table: 'ba_invitations', column: 'expires_at', issue: 'must be non-null' });
  }
  if (!catalog.invitationInviterForeignKey.exists) {
    diagnostics.push({ table: 'ba_invitations', column: 'inviter_id', issue: 'foreign key required' });
  }
  if (!catalog.sessionActiveOrganizationId.exists) {
    diagnostics.push({ table: 'ba_sessions', column: 'active_organization_id', issue: 'missing' });
  }

  if (diagnostics.length > 0) {
    return {
      enabled: false,
      routesEnabled: false,
      workersEnabled: false,
      code: IDENTITY_CATALOG_MISMATCH,
      diagnostics,
    };
  }

  return { enabled: true, routesEnabled: true, workersEnabled: true, code: null, diagnostics: [] };
}

@Injectable()
export class IdentityCatalogPreflightService {
  check(catalog: IdentityCatalogSnapshot): IdentityActivationState {
    return evaluateIdentityCatalog(catalog);
  }
}
