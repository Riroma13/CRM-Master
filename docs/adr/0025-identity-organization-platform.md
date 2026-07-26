# ADR 0025: Identity & Organization Platform

**Status:** Accepted for SPEC-0025 planning
**Date:** 2026-07-25
**Driver:** SPEC-0025 Identity & Organization Platform
**Reviewer:** Maintainer authorization; repeat Direct Architecture Review, Tasks Review, and Workload Guard approved with implementation conditions; Apply remains unexecuted

## Context

CRM-Master needs tenant staff identity projections, teams, memberships, local
RBAC, invitations, and security policy while preserving Better-Auth as the
owner of authentication and provider organization lifecycle. The repository
already has a legacy `User` model, `ClientUser` authentication boundary,
Better-Auth provider tables, a generated tenant-scoping extension, and legacy
permission/session paths. The Identity platform must not turn provider
`organizationId` into a local tenant key, bypass the generated scope, or create
a second authentication/session owner.

The repository resolves Better-Auth and its Prisma adapter to `1.6.23` and
Prisma to `6.19.3`. Better-Auth schema generation is supplied by the separate
`auth@1.6.23` CLI and produces schema only; Prisma owns migration generation
and application.

## Decisions

### Identity ownership

Identity owns local `User` projections, `Team`, `Role`, `Membership`, local
invitation metadata, `SecurityPolicy`, local RBAC, cache invalidation, typed
mutation events, and migration reports. The Audit platform owns audit storage
and ingestion. `ClientUser` remains owned by the client authentication
boundary and is not converted into an Identity projection.

### Tenant scoping

`tenantId` is the only local Identity isolation key. A request tenant is valid
only after exact Host-domain resolution from a configured
`<slug>.<CRM_BASE_DOMAIN>` host. Apex, reserved, localhost, IP, untrusted
suffix, missing, and development-fallback contexts fail closed. Identity local
queries and transactions use `PrismaService.forTenant(tenantId)`; empty or
invalid scopes cannot produce an admin client. `organizationId` remains
provider metadata used only for typed provider validation and API calls.

### Better-Auth boundary and schema

Better-Auth owns provider users, sessions, accounts, verifications,
organizations, members, and provider invitations. Identity never performs
provider Prisma model CRUD or raw SQL. Runtime Identity code uses the typed
`AuthProviderPort` backed by the injected `AUTH_CLIENT`.

The exact Better-Auth provider schema is generated with `auth@1.6.23` using a
config that exports an `auth` instance and the documented `modelName`/field
configuration. Provider model names are prefixed with their physical `ba_*`
table names (`Ba_users`, `Ba_members`, and so on), so they cannot collide with
the local `User` model. The generated output is reconciled with the canonical
Prisma schema and database catalog before Prisma creates the additive
`20260725120000_identity_platform_hardening` migration. A mismatch stops the
change; no undocumented adapter mapping or hand-added provider field is
accepted.

The `auth` CLI is pinned separately because `better-auth` does not install the
CLI binary. The CLI command, config path, output path, generated artifact hash,
provider model collision policy, Prisma version, and migration ownership are
defined in the SPEC-0025 repeat refinement record.

### Provider/local identity validation

The typed provider port validates session user ID, normalized email,
email-verification state, active organization, provider organization mapping,
provider member membership, and local projection `isActive` before Identity
authorization. Better-Auth v1.6.23 has no built-in provider user status field;
the port therefore reports provider presence/missing/unavailable and does not
invent an inactive provider state.

Migration mappings require an explicit content-hashed manifest. Email is a
comparison attribute, never an identity key. A provider user may project into
multiple tenants only when each exact provider organization membership is
independently validated. Missing, foreign, inactive-local, mismatched, or
provider-unavailable records fail closed or remain quarantined/retryable.

Local RBAC is authoritative. Provider roles are mapped deterministically to
the minimum Better-Auth role needed for lifecycle calls; Identity invitations
never assign `owner`.

### Invitation security

Invitation links contain a random transient token and an HMAC-SHA-256 signature
over `tenantId.token`. Only `SHA-256(token)` is stored locally. HMAC secrets,
raw tokens, token hashes, passwords, session tokens, provider access tokens,
and provider exception text are excluded from logs, responses, reports, and
audit metadata. Acceptance requires Host tenant, signature, local mapped state,
expiry, authenticated invitee email, provider pending state, and provider
organization equality before local finalization.

Cleanup releases a stale local claim only after the typed provider API proves an
exact pending, non-expired invitation. Missing, terminal-ambiguous,
unauthorized, timeout, and unavailable results retain `processing`, increment
retry state, and alert/fail at the retry ceiling.

### Migration and backfill

Migration is report-driven and idempotent. A read-only preflight validates local
relationships, provider organization/member mappings, explicit null-link
manifest entries, invitation matches, permissions, and constraints before the
additive migration. Fatal active errors return exit code 1 and prevent route or
job enablement. Only exact provider-validated mappings, exact pending
invitation matches, canonical role/team upserts, and explicit maintainer-
approved quarantine/reissue actions are allowed. No provider ID is invented;
no user is attached by email alone; no inconsistent relationship is silently
deleted or reassigned.

### Audit outcomes and retry

Identity mutations have explicit `success`, `failure`, and
`committed_audit_pending` outcomes. Each event has one `eventId`, one
`correlationId`, and one BullMQ `jobId` of
`identity-audit-${eventId}`. A required enqueue failure after local commit
returns `IDENTITY_AUDIT_PENDING` with `retryKey = eventId`; retry re-enqueues
the same event/job and never replays the local mutation. Existing optional
legacy `AuditService.log()` behavior is unchanged.

### Compatibility and module composition

The legacy `BetterAuthGuard`, legacy permission metadata, legacy provider-table
writers, and `ClientUser` remain outside the new Identity ownership boundary.
For Identity routes, the Host tenant is authoritative and the legacy guard
cannot overwrite it. `CoreModule` owns `IdentityModule`; `AppModule` contains
composition and global infrastructure wiring only. Identity has one session /
permission guard path and does not provide duplicate Prisma, auth, or Audit
services.

## Consequences

Positive:

- Provider lifecycle remains official and typed rather than duplicated locally.
- Tenant isolation is enforced at Host, guard, scoped-client, relationship, and
  doorbell layers.
- Existing data is preserved when it cannot be proven safe to migrate.
- Provider schema drift, constraint drift, dirty-worktree drift, and audit
  delivery failures become explicit gates.

Negative:

- The provider CLI and package versions must remain pinned together.
- Existing provider rows with missing required fields may keep migration exit
  status non-zero until a maintainer-approved reconciliation is supplied.
- Legacy provider-table writers temporarily coexist outside this change.
- Required audit delivery can return a committed-pending result and requires a
  retry worker.

## Alternatives Considered

### Invent local provider columns or use an undocumented adapter mapping

Rejected. Better-Auth v1.6.23 generated output and the configured Prisma
adapter are the provider schema authority. Handwritten compatibility fields
would make provider lifecycle behavior and migration ownership unverifiable.

### Use `organizationId` as the local scope key

Rejected. The repository scope extension is generated for `tenantId`; provider
organization IDs do not provide the local tenant boundary.

### Match legacy users by email

Rejected. Email is mutable and does not prove organization membership. Null
provider links require an explicit manifest plus typed provider validation.

### Accept or release crashed invitations on an unavailable provider result

Rejected. Pending/non-expired is the only affirmative cleanup signal; uncertain
claims remain retryable.

### Replace the legacy permission/auth paths in this change

Rejected. Identity uses a separate typed metadata and provider boundary while
legacy consumers remain compatible. A platform-wide migration requires a
separate decision and review.

## References

- `openspec/changes/SPEC-0025-identity-platform/spec.md`
- `openspec/changes/SPEC-0025-identity-platform/design.md`
- `openspec/changes/SPEC-0025-identity-platform/tasks.md`
- `openspec/changes/SPEC-0025-identity-platform/design-refinement-repeat.md`
- `docs/architecture/adr/0002-better-auth-migration.md`
- `docs/adr/0001-clientuser-schema.md`
- Better-Auth v1.6.23 CLI and organization plugin source
