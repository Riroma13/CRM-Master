# Compatibility Spec: Identity Platform

## ADDED Requirements

### Requirement: Tenant-bound Identity authorization
The Identity route guard MUST execute only on the protected handlers listed in the approved Design. It MUST require immutable `hostTenantId`, a Better Auth session, membership in the Host tenant organization, and the mapped RBAC permission; every missing or mismatched condition MUST fail closed with the specified 401/403 code. Invitation acceptance, health, public, bootstrap, webhook, non-Identity, and provider-owned unwrapped endpoints MUST remain excluded.

#### Scenario: Cross-tenant organization mismatch
- **GIVEN** Host tenant A and provider organization B
- **WHEN** a protected Identity handler executes
- **THEN** return `403 IDENTITY_ORGANIZATION_MISMATCH` without changing tenant context.

### Requirement: Catalog-gated activation
Identity routes and workers MUST remain disabled when Better Auth declarations/catalog fields are incompatible. Diagnostics MUST be redacted and expose no secrets.

#### Scenario: Catalog mismatch
- **GIVEN** a missing or incompatible required provider field
- **WHEN** boot preflight runs
- **THEN** disable Identity activation and report `IDENTITY_CATALOG_MISMATCH`.

### Requirement: Durable authorization recovery
Authorization operations MUST be append-only, tenant-scoped, idempotent, lease-claimed, reclaimable after expiry, and deny while pending or failed. Stale completion MUST be a no-op; terminal failure MUST preserve provenance and permit a new server-derived mutation.

### Requirement: Audit outbox delivery
The outbox MUST be tenant-scoped and idempotent. BullMQ MUST own the five-attempt delivery retry; terminal failure MUST conditionally write one redacted DLQ record and one alert. Authorization retry ownership MUST remain separate.

### Requirement: Safety boundaries
Implementation MUST preserve `c1a2f90`, exclude the recovery migration, SPEC-0027/0028, frontend, client-portal RBAC, SSO/SCIM, unrelated Better Auth cleanup, and unrelated runtime changes. ADR-0025 and additive migration safety are required before activation.
