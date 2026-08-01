export interface CatalogColumnState {
  exists: boolean;
  nullable: boolean;
  unique: boolean;
}

export interface IdentityCatalogSnapshot {
  organizationSlug: CatalogColumnState;
  invitationExpiresAt: CatalogColumnState;
  invitationInviterForeignKey: CatalogColumnState;
  sessionActiveOrganizationId: CatalogColumnState;
}

export const IDENTITY_CATALOG_REQUIREMENTS = {
  organizationSlug: { table: 'ba_organizations', column: 'slug', nonNull: true, unique: true },
  invitationExpiresAt: { table: 'ba_invitations', column: 'expires_at', nonNull: true },
  invitationInviterForeignKey: { table: 'ba_invitations', column: 'inviter_id', foreignKey: true },
  sessionActiveOrganizationId: {
    table: 'ba_sessions',
    column: 'active_organization_id',
    nonNull: false,
  },
} as const;

export const IDENTITY_CATALOG_SNAPSHOT: IdentityCatalogSnapshot = {
  organizationSlug: { exists: true, nullable: false, unique: true },
  invitationExpiresAt: { exists: true, nullable: false, unique: false },
  invitationInviterForeignKey: { exists: true, nullable: false, unique: false },
  sessionActiveOrganizationId: { exists: true, nullable: true, unique: false },
};
