# Design: SPEC-0025 - Identity & Organization Platform

> **Template version:** 1.0
> **SDD compliance:** v3.0 candidate
> **Enterprise Design Standard:** ACTIVE
> **Status:** Workload Guard READY; Apply not executed in this planning continuation

The historical and prior review artifacts are not edited. The prior
`design-refinement.md` and repeat resolution record
`design-refinement-repeat.md` are also preserved. The approved repeat review is
`architecture-review-direct-repeat-2.md`. This document is the implementation
design for Identity & Organization Platform Phase 1 only.
ADR-0025 is the accepted schema/provider decision required before Apply.

---

## 1. Executive Summary

Phase 1 adds a tenant-scoped Identity boundary around local users, teams,
memberships, roles, invitation metadata, security policy, and directory reads.
Better-Auth remains the owner of authentication, sessions, organizations,
members, and provider invitations. `better-auth`,
`@better-auth/prisma-adapter`, and the separate `auth` CLI are pinned to
`1.6.23`; Prisma is pinned by the lockfile to `6.19.3`. The CLI loads an
exported config, produces a provider-only schema artifact, and is reconciled
against the canonical schema/catalog before Prisma owns the migration. No
Identity service reads or writes provider tables directly.

Identity requests fail closed unless the tenant was resolved from one exact
`<slug>.<CRM_BASE_DOMAIN>` Host subdomain. The Host-derived tenant is never
replaced by a legacy session tenant, and `forTenant()` rejects invalid scopes,
provider/platform models, unsafe bulk/raw operations, and unscoped transaction
paths instead of returning an admin client.
Every local Identity query and transaction uses `PrismaService.forTenant()`.

Existing data is handled by a read-only preflight, an explicit content-hashed
provider mapping manifest, deterministic backfill/quarantine rules, a redacted
report, and a non-zero migration result when active errors remain. The typed
provider boundary validates user, email, organization, member, and local active
status during sessions, invitations, cleanup, and migration. Invitation cleanup
uses only Better-Auth APIs that can prove pending, non-expired state. If the
provider cannot prove safe reconciliation after a crash, the local claim stays
retryable and the job alerts/fails rather than accepting twice.

---

## 2. Technical Approach

Identity owns local organization structure and authorization data: `Team`,
`Role`, `Membership`, local `Invitation` metadata, `SecurityPolicy`, and the
tenant-scoped local `User` projection. Better-Auth owns `user`, `session`,
`organization`, `member`, and provider `invitation` records.

### Provider schema boundary

`apps/api/src/common/auth.ts` currently creates Better-Auth with:

```text
betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  plugins: [bearer(), organization(...)],
})
```

The current factory export is not a CLI config. Phase 1 adds the exact CLI
config `apps/api/scripts/better-auth-schema.config.ts`, which exports an
`auth` instance created from the same options as the runtime factory. The
separate `auth@1.6.23` package is added to the API development dependencies;
`better-auth@1.6.23` itself does not install the `auth` binary.

The executable command is:

```bash
pnpm --filter api exec auth generate \
  --cwd . \
  --config scripts/better-auth-schema.config.ts \
  --adapter prisma \
  --dialect postgresql \
  --output ../../openspec/changes/SPEC-0025-identity-platform/evidence/better-auth.generated.prisma \
  --yes
```

`auth generate` is schema generation only. It requires the exported config even
with `--adapter prisma`, and its output is written relative to the API process
directory. The generated provider artifact is reviewed and reconciled before
the same command may target `../../packages/database/prisma/schema.prisma`.
Prisma `6.19.3` then generates and applies the owned migration; the Better-Auth
CLI `migrate` command is not used for Prisma.

The config uses documented Better-Auth `modelName` and field mappings. The
provider models use `ba_users`, `ba_sessions`, `ba_accounts`,
`ba_verifications`, `ba_organizations`, `ba_members`, and `ba_invitations` as
configured model names, producing `Ba_*` Prisma models mapped to the same
physical tables. This avoids the local `User` collision and rejects any output
that creates unprefixed `User`, `Organization`, `Member`, or duplicate
`@@map("ba_...")` declarations. Snake-case provider columns are represented by
the generated provider field identifiers, not a hand-written `@map` overlay.

The reconciliation test compares all provider models, fields, types,
nullability, unique/index/relation declarations, physical maps, and the live
`ba_*` catalog. It also requires `invitation.expiresAt` and
`session.activeOrganizationId`. A mismatch stops Apply; no provider column or
adapter mapping is invented. Existing provider rows with required-field gaps
must be resolved by an explicit provider reconciliation manifest or the
provider migration remains blocked. The old provider and identity migrations
remain immutable.

### Request and local data flow

The Host-derived tenant is resolved before the Identity session. The session's
Better-Auth user ID is mapped to the local projection inside a scoped client;
the provider organization ID is used only in typed provider calls. New local
invitation metadata is created with a local hash and idempotency key, then
linked to the provider response. A local row is not eligible for acceptance
until its provider link state is `mapped`.

Role and membership mutations run in scoped transactions, purge affected RBAC
cache entries synchronously, emit typed mutation events, and call the required
Identity audit enqueue path. A queue failure after commit is represented as
`committed_audit_pending` with a deterministic retry key, not as a silent
success or a second mutation attempt.

---

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
|---|---|---|---|
| Local tenant key | `organizationId`, `tenantId`, implicit provider organization | `tenantId` | The repository scoping extension is generated for `tenantId`; provider `organizationId` is not a local isolation key. |
| Better-Auth schema | Invent local provider fields, undocumented adapter mapping, provider-generated Prisma schema | Pinned `auth@1.6.23` generated provider schema plus supported model/field mapping | The CLI is separate from `better-auth`, requires an exported config, capitalizes Prisma models, and must be reconciled with the existing `ba_*` tables before Prisma `6.19.3` migration generation. |
| Auth ownership | Duplicate auth, local sessions, Better-Auth API | Better-Auth API | Authentication and sessions remain provider-owned; Identity stores a projection only. |
| Local identity lookup | Local ID/email, provider ID mapping | `betterAuthUserId -> User.id` inside `forTenant()` | Proves provider identity and tenant ownership before RBAC. |
| Host authority | Legacy session tenant, development first tenant, Host subdomain | Exact configured `<slug>.<CRM_BASE_DOMAIN>` Host subdomain | Caller/session data cannot select the tenant for an Identity route; untrusted forwarded hosts are rejected. |
| Scoped-client failure | Empty scope returns admin client, warning only, fail closed | `forTenant()` rejects invalid input and unsafe models/operations | An invalid Identity context must never become an unscoped read/write or transaction path. |
| Provider user projection | One global local projection, one projection per tenant | One projection per tenant | Better-Auth users may belong to multiple organizations. Local email/provider-ID uniqueness therefore includes `tenantId`. |
| Invitation ownership | Local only, provider only, provider lifecycle plus local projection | Provider lifecycle plus local projection | Better-Auth creates/accepts provider invitations; local metadata carries tenant role/team, HMAC hash, idempotency, and claim state. |
| Invitation provider status | Direct provider table read, inferred terminal state, typed pending API | Typed pending API only behind `AuthProviderPort` | The provider exposes pending/non-expired state, not a safe arbitrary terminal-state query for cleanup. |
| Invitation reconciliation | Release all stale claims, finalize all stale claims, retryable unresolved state | Release only proven pending; retain unresolved processing | Avoids accepting twice after a process crash. |
| Invitation signature | Unsigned link, signed raw token, JWT | HMAC-SHA-256 over `tenantId.token` | Verifies tenant-bound delivery without persisting a credential. |
| Permission migration | Replace legacy guard now, two unscoped systems, explicit coexistence | Explicit coexistence with one canonical new grammar | Legacy routes remain stable; new Identity routes use a distinct metadata key and grammar. |
| Permission grammar | Exact only, arbitrary wildcards, bounded wildcards | Resource actions, `resource:*`, and `*:admin` | Aligns shared types, seed roles, evaluator, DTOs, and tests without accepting `write` or `*:*`. |
| Cache invalidation | TTL only, manual callers, synchronous purge plus event | Synchronous purge plus typed event and TTL fallback | Permission revocation must apply before the next authorization decision. |
| Audit delivery | Existing optional log only, rollback mutation on queue failure, required Identity result | Required Identity enqueue with committed-pending outcome | Preserves legacy behavior while making Identity delivery failure observable and retryable. |
| Team depth | Ambiguous max, root depth 1, root depth 0 | Root `0`, inclusive maximum `3` | One rule is enforced by service, SQL check, and tests. |
| Module wiring | Direct root feature import, duplicate feature providers, Core aggregation | Core-owned feature import with controller-scoped session-then-permission guards | Keeps AppModule composition-only, removes the Identity permission `APP_GUARD`, and makes execution order testable. |
| Migration safety | Rewrite historical migration, destructive cleanup, preflight/report gate | New additive migration plus report-driven forward gate | Existing rows are preserved; unresolved data blocks enablement rather than being guessed or deleted. |
| Provider/local role authority | Provider role replaces local role, implicit translation, explicit mapping | Local RBAC authoritative with deterministic minimum provider role | Provider roles are validated and mapped; missing organization/unknown role fails before a provider call. |
| Audit retry identity | Random retry job, replay mutation, optional-only audit | One event ID, `identity-audit-${eventId}` job ID, audit-only retry | A committed local mutation is never replayed when required audit delivery is pending. |

### Historical review disposition

The original rejected review remains historical evidence. The independent Direct
review is not edited by this document. AR-001 through AR-004 are resolved here
as Design Refinement blockers. The repeat Direct review is also preserved;
AR-012 through AR-014 are resolved by `design-refinement-repeat.md` and
ADR-0025. AR-005 through AR-011 and AR-015 through AR-022 remain mandatory
implementation conditions with owners and evidence in `tasks.md`.

---

## 4. Data Flow

### Identity request

```text
Host header
    |
    v
TenantResolveMiddleware
    | tenantId + tenantResolutionSource='host'
    v
IdentitySessionGuard
    | auth.api.getSession({ headers })
    v
Provider user ID + provider organization check
    |
    v
PrismaService.forTenant(tenantId)
    | User.betterAuthUserId -> local User.id
    v
Identity RBAC -> controller/service -> scoped local transaction
```

Reserved/apex/localhost requests may continue through legacy admin handling,
but `IdentitySessionGuard` rejects them. The development first-tenant fallback
is not a valid Identity context. The legacy `BetterAuthGuard` must not overwrite
the Host tenant for the Identity route prefix; Identity owns its provider
session resolution.

### Invitation creation

```text
Identity actor + Host tenant
    -> validate role/team through forTenant()
    -> local creating row with idempotency key and token hash
    -> auth.api.createInvitation({ organizationId, email, role, headers })
    -> conditional local creating -> pending/mapped update
    -> transient signed delivery link
```

The provider response supplies the provider invitation ID and expiry. If the
provider call or local finalization fails, the row is not eligible for
acceptance; the operation returns an observable provider/audit failure and is
repaired by the idempotent retry path. Provider cancellation is called through
Better-Auth only.

### Invitation acceptance

```text
Host + invitee Better-Auth session + token/signature
    -> HMAC/tenant/local state checks
    -> auth.api.getInvitation({ query: { id }, headers })
    -> conditional local pending -> processing claim
    -> auth.api.acceptInvitation({ body: { invitationId }, headers })
    -> scoped local User projection + Membership transaction
    -> processing -> accepted + cache/event/audit
```

`getInvitation` and `acceptInvitation` use the request headers. The provider
verifies the authenticated invitee and only treats pending, non-expired state
as available. No local session or password is created.

### Stale-claim cleanup

```text
stale local processing row
    -> conditional claim-version read
    -> typed provider pending-invitation API with approved context
       -> exact pending/non-expired match: processing -> pending
       -> missing/terminal/unavailable/error: remain processing, retry/backoff
    -> audit state transition or retry failure without token material
```

Cleanup never queries `ba_invitations`, never fabricates a provider session, and
never finalizes a local membership from an unavailable provider result.

---

## 5. Working Set

The Working Set is the only runtime path set that a later Apply may modify. A
path is listed once as an owner in `tasks.md`; later phases consume its
contract without editing it. Generated files are permitted only when generated
from an approved source path and their diff is allowlisted.

### 5.1 Primary Files

| # | File | Action | Reason |
|---:|---|---|---|
| 1 | `packages/database/prisma/schema.prisma` | Modify | Add provider-generated Better-Auth fields, tenant-composite local relations, projection uniqueness, invitation claim/link state, and explicit model metadata. |
| 2 | `packages/database/prisma/migrations/20260725120000_identity_platform_hardening/migration.sql` | Create | Apply the generated provider schema delta and additive local hardening without rewriting existing migrations. |
| 3 | `apps/api/package.json` | Modify | Pin `better-auth`, `@better-auth/prisma-adapter`, and `auth` to `1.6.23`, and declare the real migration/verification entrypoints. |
| 4 | `pnpm-lock.yaml` | Regenerate | Lock the exact Better-Auth/CLI/Prisma toolchain and preserve unrelated dependency entries. |
| 5 | `apps/api/scripts/better-auth-schema.config.ts` | Create | Export the CLI-loadable `auth` instance using the same runtime options; tooling only, never a request/runtime module. |
| 6 | `packages/database/src/index.ts` | Modify | Keep generated tenant scope and define the safe boundary for scoped-client construction. |
| 7 | `packages/database/src/prisma-helpers.ts` | Modify if required by scoped transaction/query tests | Preserve tenant predicates while rejecting unsafe scoped operations. |
| 8 | `packages/database/src/__tests__/index.test.ts` | Modify | Prove scoped-client and raw-SQL behavior; no empty tenant path may become a tenant client. |
| 9 | `packages/database/src/__tests__/scope-operation-matrix.spec.ts` | Create | Cover every supported read/write/bulk/transaction operation and rejection path. |
| 10 | `packages/database/prisma/__tests__/identity-schema.spec.ts` | Create | Validate local composite relations, projection uniqueness, invitation state, and depth contract. |
| 11 | `packages/database/prisma/__tests__/better-auth-schema-reconciliation.spec.ts` | Create | Execute pinned generation, compare provider output/catalog, and reject model/table collisions or field drift. |
| 12 | `packages/database/prisma/__tests__/identity-constraint-drift.spec.ts` | Create | Verify Prisma-managed versus SQL-managed constraints and provider migration allowlist. |
| 13 | `packages/database/prisma/generators/tenant-scope/integrity.spec.ts` | Modify | Require generated coverage for every Identity model with `tenantId`. |
| 14 | `apps/api/src/common/auth.ts` | Modify only for the approved provider schema/configuration boundary | Keep the official Better-Auth organization API, exact model/field mapping, and generated provider contract; no direct table access. |
| 15 | `apps/api/src/common/auth-client.provider.ts` | Modify | Expose one typed provider client boundary for Identity and avoid a second adapter path. |
| 16 | `apps/api/src/common/prisma.service.ts` | Modify | Reject empty/invalid `forTenant()` values before client creation. |
| 17 | `apps/api/src/common/middleware/tenant-resolve.middleware.ts` | Modify | Validate exact base domain/trusted forwarded host, remove Identity development fallback, and record host-derived resolution source. |
| 18 | `apps/api/src/common/middleware/tenant-resolve.middleware.spec.ts` | Modify | Test missing/reserved/apex/untrusted/forwarded/development Host behavior and source marker. |
| 19 | `apps/api/src/common/guards/better-auth.guard.ts` | Modify | Preserve Host authority and make the legacy guard a no-op boundary for Identity routes. |
| 20 | `apps/api/src/common/guards/tenant-scope.guard.ts` | Modify | Make Identity context checks explicit without using legacy user mutation. |
| 21 | `apps/api/src/common/guards/tenant-scope.guard.spec.ts` | Modify | Prove missing/foreign scope behavior and Identity guard ordering preconditions. |
| 22 | `apps/api/src/common/__tests__/identity-tenant-boundary.spec.ts` | Create | Cross-layer fail-closed tests for middleware, guards, and scoped client. |
| 23 | `packages/shared/src/identity/identity.types.ts` | Modify | Add local/provider identity distinction, provider validation statuses, invitation link states, and audit outcomes. |
| 24 | `packages/shared/src/identity/permission.types.ts` | Modify | Define and validate the canonical permission grammar. |
| 25 | `packages/shared/src/identity/security.types.ts` | Modify | Define validated security policy inputs/outputs. |
| 26 | `packages/shared/src/identity/identity.events.ts` | Create | Define typed mutation events, exact event/retry IDs, and secret-free outcome fields. |
| 27 | `packages/shared/src/identity/index.ts` | Modify | Re-export the complete Identity contract surface. |
| 28 | `packages/shared/src/identity/__tests__/identity.contracts.spec.ts` | Create | Test permission, provider/local IDs, invitation state, role mapping, and audit contracts. |
| 29 | `apps/api/src/modules/identity/auth/auth-provider.port.ts` | Create | Isolate typed Better-Auth session, organization/member validation, invitation, and pending-status calls. |
| 30 | `apps/api/src/modules/identity/auth/auth-provider.adapter.ts` | Create | Adapt `AUTH_CLIENT` official APIs to the typed port and normalize provider errors/context. |
| 31 | `apps/api/src/modules/identity/auth/identity-session.resolver.ts` | Create | Map provider user ID to local User through `forTenant()` after provider/local validation. |
| 32 | `apps/api/src/modules/identity/auth/identity-session.guard.ts` | Create | Require host-derived tenant and authenticated provider session on every Identity route. |
| 33 | `apps/api/src/modules/identity/team/team.service.ts` | Modify | Use scoped clients, same-tenant parent rules, depth, and mutation effects. |
| 34 | `apps/api/src/modules/identity/membership/membership.service.ts` | Modify | Validate User/Team/Role tenant consistency and mutation effects. |
| 35 | `apps/api/src/modules/identity/role/role.service.ts` | Create | Own role CRUD, grammar validation, and system-role protection. |
| 36 | `apps/api/src/modules/identity/rbac/rbac-engine.ts` | Modify | Use scoped reads, canonical wildcard semantics, and deterministic invalidation. |
| 37 | `apps/api/src/modules/identity/rbac/permission.guard.ts` | Modify | Enforce Identity metadata after the Identity session guard; never register as a global guard. |
| 38 | `apps/api/src/modules/identity/rbac/permission.decorator.ts` | Modify | Keep Identity metadata distinct and typed. |
| 39 | `apps/api/src/modules/identity/events/identity-mutation.publisher.ts` | Create | Purge cache, emit typed events, and invoke required audit enqueue with exact retry identity. |
| 40 | `apps/api/src/modules/identity/invitation/invitation-engine.ts` | Modify | Bridge official provider APIs to scoped local metadata and claim state. |
| 41 | `apps/api/src/modules/identity/invitation/invitation-delivery.port.ts` | Create | Deliver signed links without exposing raw token to API output/logs. |
| 42 | `apps/api/src/modules/identity/invitation/invitation-cleanup.processor.ts` | Create | Reconcile stale claims only from affirmative provider pending state. |
| 43 | `apps/api/src/modules/identity/directory/directory.service.ts` | Modify | Provide bounded, scoped directory reads. |
| 44 | `apps/api/src/modules/identity/policy/security-policy.service.ts` | Modify | Provide scoped policy reads/writes and validation. |
| 45 | `apps/api/src/modules/identity/dto/identity.dto.ts` | Create | Define validated request/response DTOs with secret-free serialization. |
| 46 | `apps/api/src/modules/identity/identity.controller.ts` | Create | Expose the Host-derived tenant Identity API with explicit guard order. |
| 47 | `apps/api/src/modules/identity/scripts/identity-migration-preflight.script.ts` | Create | Run read-only provider/local preflight and emit the redacted report/exit code. |
| 48 | `apps/api/src/modules/identity/scripts/migrate-users.script.ts` | Modify | Apply explicit mapping manifest, deterministic role/team backfill, and report outcomes. |
| 49 | `apps/api/src/modules/identity/scripts/migration-report.ts` | Create | Define report schema, redaction, stable dispositions, and fatal-error rules. |
| 50 | `apps/api/src/modules/identity/scripts/scope-manifest.ts` | Create | Capture and verify pre-Apply/post-Verify path/hash manifests. |
| 51 | `apps/api/src/modules/audit/audit.service.ts` | Modify | Add required Identity enqueue without changing optional legacy `log()`. |
| 52 | `packages/database/seeds/identity-roles.seed.ts` | Modify | Use explicit maintenance enumeration, scoped tenant writes, and canonical permissions. |
| 53 | `packages/database/src/seed.ts` | Create | Provide the real database seed entrypoint referenced by package scripts. |
| 54 | `docs/adr/0025-identity-organization-platform.md` | Create | Record the accepted schema, tenant, provider, invitation, migration, audit, and compatibility decisions. |

### 5.2 Secondary Files and Tests

| # | File | Action | Reason |
|---:|---|---|---|
| 1 | `packages/database/prisma/generators/tenant-scope/generated/tenant-models.ts` | Regenerate | Include all Identity tenant-scoped models. |
| 2 | `packages/database/prisma/generators/tenant-scope/generated/tenant-metadata.json` | Regenerate | Keep source-derived scope metadata current. |
| 3 | `packages/database/prisma/generators/tenant-scope/generated/tenant-scope.spec.ts` | Regenerate | Verify generated model coverage. |
| 4 | `openspec/changes/SPEC-0025-identity-platform/evidence/better-auth.generated.prisma` | Generate | Record the exact provider schema output and source/version hash before canonical merge. |
| 5 | `openspec/changes/SPEC-0025-identity-platform/evidence/identity-provider-mapping.json` | Maintainer input | Explicit content-hashed null-link mapping manifest; no email-only mapping. |
| 6 | `openspec/changes/SPEC-0025-identity-platform/evidence/identity-quarantine.json` | Maintainer input if required | Explicit forward-fix/quarantine decisions; absent by default. |
| 7 | `openspec/changes/SPEC-0025-identity-platform/evidence/identity-migration-report.json` | Generate | Redacted run report with stable row keys, dispositions, counts, errors, and exit result. |
| 8 | `openspec/changes/SPEC-0025-identity-platform/evidence/identity-migration-audit.jsonl` | Generate | Secret-free migration audit outcomes and correlation IDs. |
| 9 | `openspec/changes/SPEC-0025-identity-platform/evidence/identity-migration-report.sha256` | Generate | Content hash for the final redacted report. |
| 10 | `openspec/changes/SPEC-0025-identity-platform/evidence/scope-manifest.json` | Generate/verify | Pre-Apply and post-Verify path/hash manifest with protected-path and generated-output allowlists. |
| 11 | `openspec/changes/SPEC-0025-identity-platform/evidence/scope-manifest.schema.json` | Create | JSON schema `sdd-direct/scope-manifest/v1`. |
| 12 | `apps/api/src/modules/identity/auth/__tests__/identity-session.resolver.spec.ts` | Create | Test provider ID mapping, Host authority, missing links, inactive local users, and mismatches. |
| 13 | `apps/api/src/modules/identity/auth/__tests__/auth-provider.adapter.spec.ts` | Create | Test typed provider returns, request/worker context, errors, and no raw provider access. |
| 14 | `apps/api/src/modules/identity/auth/__tests__/identity-session.guard.spec.ts` | Create | Test every route fail-closed condition. |
| 15 | `apps/api/src/modules/identity/role/__tests__/role.service.spec.ts` | Create | Test grammar, system-role protection, provider/local role mapping, cache, event, audit behavior. |
| 16 | `apps/api/src/modules/identity/events/__tests__/identity-mutation.publisher.spec.ts` | Create | Test ordering, exact event/job/retry IDs, outcomes, redaction, and required audit failures. |
| 17 | `apps/api/src/modules/identity/invitation/__tests__/invitation-engine.spec.ts` | Modify | Replace local-session assumptions with provider API, HMAC, claim, role mapping, and concurrency tests. |
| 18 | `apps/api/src/modules/identity/invitation/__tests__/invitation-cleanup.processor.spec.ts` | Create | Test pending release, unavailable state, retries, alerts, and idempotency. |
| 19 | `apps/api/src/modules/identity/scripts/__tests__/identity-migration-preflight.spec.ts` | Create | Test consistent/inconsistent fixtures, mapping manifest, provider validation, report, and exit code. |
| 20 | `apps/api/src/modules/identity/scripts/__tests__/migrate-users.script.spec.ts` | Modify | Test deterministic idempotent backfill, null-link policy, role mapping, and provider failure. |
| 21 | `apps/api/src/modules/identity/__tests__/identity.controller.spec.ts` | Create | Test DTOs, route guards, status/error contract, Host trust, and redaction. |
| 22 | `apps/api/src/modules/identity/__tests__/identity.module.spec.ts` | Create | Test module graph, provider ownership, queue registration, and guard path/order. |
| 23 | `apps/api/test/doorbell/identity-cross-tenant-isolation.spec.ts` | Create | User/team/membership/directory/policy isolation. |
| 24 | `apps/api/test/doorbell/identity-permission-isolation.spec.ts` | Create | Permission/cache isolation. |
| 25 | `apps/api/test/doorbell/identity-cross-tenant-invitation.spec.ts` | Create | Signed invitation and provider organization isolation. |
| 26 | `apps/api/test/doorbell/identity-cross-tenant-role-mutation.spec.ts` | Create | Role mutation boundary. |
| 27 | `apps/api/test/doorbell/identity-cross-tenant-team-hierarchy.spec.ts` | Create | Team parent/depth boundary. |
| 28 | `apps/api/src/modules/audit/audit.module.ts` | Modify narrowly | Export required enqueue path without adding a second Identity audit provider. |
| 29 | `apps/api/src/modules/core/core.module.ts` | Modify | Own the Identity feature import and export boundary required by the root guard registration. |
| 30 | `apps/api/src/app.module.ts` | Modify | Remove direct Identity feature import and duplicate Identity provider registration. |
| 31 | `apps/api/src/modules/infrastructure/platform-runtime.module.ts` | Create | Own the Identity-boundary shared Prisma/auth provider path. |
| 32 | `apps/api/src/modules/auth/auth.module.ts` | Modify narrowly | Consume the shared provider boundary instead of registering a second auth client for this graph. |
| 33 | `apps/api/src/modules/identity/invitation/invitation-cleanup.queue.ts` | Create | Register the cleanup queue/retry policy once. |
| 34 | `apps/api/src/modules/identity/invitation/invitation-cleanup.scheduler.ts` | Create | Enqueue the idempotent cleanup trigger. |
| 35 | `packages/database/package.json` | Modify | Point seed and scope verification commands at real entrypoints. |
| 36 | `apps/api/src/common/__tests__/better-auth-schema-config.spec.ts` | Create | Prove the CLI-only config exports an `auth` instance with the organization plugin and does not bootstrap request/runtime behavior. |

### 5.3 Expected Not to Change

- `architecture-review.md`, `architecture-review-direct.md`,
  `architecture-review-direct-repeat.md`,
  `architecture-review-direct-repeat-2.md`, `design-refinement.md`,
  `design-refinement-repeat.md`, `tasks-review.md`, and `workload-guard.md` in
  this change directory; all are immutable
  review/refinement evidence after this refinement.
- `docs/sdd-workflow-guard.md`, `.opencode/agents/`, `.opencode/commands/`,
  native dispatcher state, and native review lifecycle state.
- `apps/tenant-web/` and `apps/admin-web/`; frontend Identity screens are out
  of scope.
- `packages/database/prisma/migrations/20260720230000_add_identity/migration.sql`;
  it is historical and must not be rewritten.
- Existing provider migration history and unrelated SPEC-0027/SPEC-0028
  migrations, including `20260721000000_add_jobs_platform/migration.sql`.
- `openspec/changes/archive/2026-07-21-SPEC-0027-feature-flags/`,
  `openspec/changes/archive/2026-07-21-SPEC-0028-jobs-platform/`, and SDD-v3/
  recovery artifacts.
- Legacy provider-table writers in `apps/api/src/modules/auth/` and
  `apps/api/src/modules/tenants/`, except the narrowly declared module provider
  ownership adjustment in `auth.module.ts`.
- Unrelated module-level `PrismaService` declarations; this change tests and
  hardens the Identity/Auth/Audit boundary only, not a platform-wide provider
  refactor.

---

## 6. Read Order

1. `openspec/changes/SPEC-0025-identity-platform/spec.md` - contract and acceptance authority.
2. `openspec/changes/SPEC-0025-identity-platform/design-refinement.md` - blocker and condition decisions.
3. `openspec/changes/SPEC-0025-identity-platform/design-refinement-repeat.md`, `architecture-review-direct-repeat-2.md`, `tasks-review.md`, `workload-guard.md`, and `docs/adr/0025-identity-organization-platform.md` - repeat blocker resolutions, approved reviews, delivery boundary, and schema decision.
4. `packages/database/prisma/schema.prisma` - source of truth for local/provider model names and relation shape.
5. `apps/api/package.json`, `pnpm-lock.yaml`, installed `better-auth`/`auth` package metadata, and `apps/api/src/common/auth.ts` - exact versions and CLI/config boundary.
6. `apps/api/src/common/auth-client.provider.ts` - injected Better-Auth client boundary.
7. Better-Auth v1.6.23 CLI/generator and organization source for config loading, model naming, `getSession`, member validation, invitations, and pending status.
8. `packages/database/src/index.ts`, `packages/database/src/prisma-helpers.ts`, and `apps/api/src/common/prisma.service.ts` - scope, bulk, transaction, and raw-query behavior.
9. `apps/api/src/common/middleware/tenant-resolve.middleware.ts` and its tests - Host base-domain resolution and development fallback.
10. `apps/api/src/common/guards/better-auth.guard.ts`, `tenant-scope.guard.ts`, and `tenant-id.decorator.ts` - existing guard boundary.
11. `packages/database/prisma/generators/tenant-scope/generated/tenant-models.ts` and `integrity.spec.ts` - generated scope coverage.
12. `packages/database/prisma/migrations/20260720230000_add_identity/migration.sql` - immutable historical identity schema and old constraint names.
13. `packages/database/seeds/identity-roles.seed.ts` and `packages/database/package.json` - actual seed entrypoint gap and current seed grammar.
14. `apps/api/src/modules/identity/team/team.service.ts` and tests - current hierarchy behavior.
15. `apps/api/src/modules/identity/membership/membership.service.ts` and tests - current relationship behavior.
16. `apps/api/src/modules/identity/rbac/rbac-engine.ts`, `permission.guard.ts`, `permission.decorator.ts`, and tests - wildcard/cache behavior.
17. `apps/api/src/modules/identity/invitation/invitation-engine.ts` and tests - current local-session assumptions.
18. `apps/api/src/modules/audit/audit.service.ts` and `audit.module.ts` - optional queue behavior and required enqueue extension point.
19. `apps/api/src/modules/core/core.module.ts`, `apps/api/src/app.module.ts`, `apps/api/src/modules/auth/auth.module.ts`, and `infrastructure.module.ts` - composition/provider ownership.
20. Existing `apps/api/test/doorbell/` fixtures and `apps/api/src/modules/jobs/` queue infrastructure - real test and cleanup registration patterns.

---

## 7. Expected Commands

The commands below are verification/apply commands for a later Apply phase. No
command is run by this planning refinement.

```bash
# Exact pinned provider toolchain and executable schema generation
pnpm --filter api exec auth --version # must print 1.6.23
pnpm --filter api exec auth generate \
  --cwd . \
  --config scripts/better-auth-schema.config.ts \
  --adapter prisma \
  --dialect postgresql \
  --output ../../openspec/changes/SPEC-0025-identity-platform/evidence/better-auth.generated.prisma \
  --yes
pnpm --filter api test -- common/__tests__/better-auth-schema-config.spec.ts --runInBand
pnpm --filter database test -- prisma/__tests__/better-auth-schema-reconciliation.spec.ts --runInBand

# Prisma/provider/local schema validation
pnpm --filter database exec prisma validate --schema prisma/schema.prisma
pnpm --filter database generate
pnpm --filter database generate:scope:verify
pnpm --filter database test:scope

# Constraint parity and migration review
pnpm --filter database test -- prisma/__tests__/identity-schema.spec.ts prisma/__tests__/identity-constraint-drift.spec.ts
pnpm --filter database exec prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/20260725120000_identity_platform_hardening/migration.sql

# Read-only preflight must pass before the hardening migration is enabled
pnpm --filter api identity:migration:scope-gate -- \
  --allowed "20260725120000_identity_platform_hardening" \
  --manifest ../../openspec/changes/SPEC-0025-identity-platform/evidence/scope-manifest.json
pnpm --filter api identity:preflight -- \
  --mapping-manifest ../../openspec/changes/SPEC-0025-identity-platform/evidence/identity-provider-mapping.json \
  --quarantine-manifest ../../openspec/changes/SPEC-0025-identity-platform/evidence/identity-quarantine.json \
  --report-dir ../../openspec/changes/SPEC-0025-identity-platform/evidence
pnpm --filter database db:migrate
pnpm --filter api identity:backfill -- \
  --mapping-manifest ../../openspec/changes/SPEC-0025-identity-platform/evidence/identity-provider-mapping.json \
  --preflight-report ../../openspec/changes/SPEC-0025-identity-platform/evidence/identity-migration-report.json \
  --report-dir ../../openspec/changes/SPEC-0025-identity-platform/evidence
pnpm --filter api identity:migration:verify -- \
  --report-dir ../../openspec/changes/SPEC-0025-identity-platform/evidence \
  --manifest ../../openspec/changes/SPEC-0025-identity-platform/evidence/scope-manifest.json

# Focused contracts and Identity tests
pnpm --filter shared lint
pnpm --filter shared test -- src/identity/__tests__/identity.contracts.spec.ts
pnpm --filter api test -- identity --runInBand
pnpm --filter api test:e2e -- --runInBand test/doorbell/identity-cross-tenant-isolation.spec.ts test/doorbell/identity-permission-isolation.spec.ts test/doorbell/identity-cross-tenant-invitation.spec.ts test/doorbell/identity-cross-tenant-role-mutation.spec.ts test/doorbell/identity-cross-tenant-team-hierarchy.spec.ts
pnpm --filter api lint
pnpm --filter api build

# Final repository gates
pnpm test
pnpm lint
pnpm turbo build
```

`auth generate` is schema generation, not provider-table runtime access. For
Prisma, the generated output is reviewed and applied by Prisma. If the exact
provider output cannot be reconciled with the current model names, physical
maps, fields, nullability, relations, or provider rows without an undocumented
adapter mapping, stop before Apply and return `BLOCKED`. The CLI package is not
available in the current worktree until the declared exact dependency change is
applied; the failed current `pnpm --filter api exec auth --version` is an
observed pre-Apply fact, not a passing verification result.

---

## 8. Design Confidence

**Confidence:** High for the contracts and executable command design; Medium
for provider migration execution until the generated artifact, physical catalog,
and existing-row preflight pass.

The repository adapter boundary, Better-Auth `1.6.23` CLI/API behavior, Prisma
`6.19.3`, Host fallback/domain behavior, fail-open scoped client, local Identity
models, seed grammar, audit queue behavior, module graph, and worktree
contamination were inspected. The remaining implementation risk is deliberately
converted into a generated-artifact reconciliation test, typed provider
validation matrix, constraint allowlist, scope manifest, and report-driven
migration gate. No runtime code is assumed to work until those tests pass.

---

## 9. Exploration Budget

| Resource | Budget | Notes |
|---|---:|---|
| Repo searches | 24 | Provider CLI/config/schema, scope operations, Host trust, guard order, migration, roles, audit, module, queue, and scope-contamination checks. |
| Files to read | 62 | Read Order plus pinned package source, focused tests/fixtures, ADRs, and Better-Auth CLI/organization source. |
| Files to create | 39 | Provider config/port/adapter, guards, publisher, cleanup, controller/DTO, migration reports, drift/scope tests, queue registration, module runtime boundary, ADR, evidence schemas, and doorbells. |
| Files to modify | 34 | Schema/migration, package lock/manifests, generated outputs, scope/Host guards, shared contracts, current Identity services/tests, audit/provider/module ownership, seeds, and package scripts. |
| External API references | 5 | Better-Auth v1.6.23 CLI/config/generator, organization/member API, invitation API, Prisma 6.19.3 migration behavior, and Nest guard lifecycle. |
| Protected-path checks | Every Apply phase | Hash manifest before Apply and after Verify; no unlisted or unrelated path is silently absorbed. |

Apply must stop and record a Working Set deviation if it needs a path not
declared here or in `tasks.md`. A deviation cannot be implemented in the same
phase; it requires Tasks refinement.

---

## 10. Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Better-Auth generated provider schema cannot reconcile with current models/tables | Medium | Critical | Pin `auth`/Better-Auth/adapter to `1.6.23`, generate to the declared artifact, use supported `ba_*` model names, compare full schema/catalog/diff, and stop on any mismatch. |
| Identity request receives an untrusted or non-tenant Host | High | Critical | Require exact `CRM_BASE_DOMAIN`, trusted forwarded-host policy, explicit source marker, no development fallback, and reserved/apex/localhost/suffix tests. |
| Empty scope or unsupported scoped operation returns an unscoped client | High | Critical | Validate in `PrismaService.forTenant()`, allow only generated tenant models, reject every raw/bulk/unsafe transaction bypass, and keep Identity services off `admin`. |
| Existing local relationship rows violate composite constraints | Medium | High | Read-only preflight, redacted report, non-zero result, no automatic destructive repair, and maintainer-approved forward fix. |
| Null provider user link is guessed by email | Medium | Critical | Require explicit mapping manifest and provider organization membership validation; leave unmapped users unusable by Identity. |
| Local User global uniqueness conflicts with multi-organization provider users | Medium | High | Replace with tenant-scoped uniqueness in the new migration and test duplicate projections per tenant. |
| Provider invitation link cannot be backfilled | Medium | High | Exact pending/non-expired provider API match only; ambiguous/unmapped active rows block or require explicit quarantine/reissue. |
| Provider accepts invitation after local crash | Medium | Critical | Cleanup only releases affirmative pending state; unavailable results remain processing with retry/backoff and alert/failure. |
| Permission grammar drifts from seeds/evaluator | Medium | High | Shared parser, seed validation, evaluator matrix, and rejection-before-persistence tests. |
| Audit queue is unavailable after a mutation commits | Medium | High | Required Identity enqueue uses `eventId` and `identity-audit-${eventId}`; committed-pending is audit-only retry with no mutation replay. |
| Core/App module graph creates duplicate providers or guards | Medium | High | Core-owned Identity import, controller-scoped session-then-permission order, one runtime/auth/audit provider path, graph test, and explicit import ordering. |
| Cleanup trigger is registered twice or not at all | Medium | Medium | One queue registration file, one scheduler, fixed queue name, idempotent job ID, and module integration test. |
| Generated scope/output absorbs unrelated SPEC-0027/0028 changes | High | High | Pre-Apply scope manifest records dirty paths, source hashes, generated allowlist, protected hashes, and post-Verify comparison. |

---

## 11. Testing Strategy

| Layer | Focus | Approach |
|---|---|---|
| Provider generation | CLI config loading, exact model/field maps, generated provider artifact, physical catalog, version provenance, migration diff | Execute `auth@1.6.23` with the declared command; compare generated output and applied PostgreSQL catalog; never query provider tables from Identity. |
| Provider integration | Session, organization/member validation, invitation create/get/accept, expiry, active organization, missing/foreign/unavailable records | Test Better-Auth `1.6.23` server API through `AUTH_CLIENT` and the typed port with request and approved worker contexts. |
| Scope boundary | Host source/domain marker, missing/reserved/untrusted Host, empty `forTenant`, legacy tenant overwrite, foreign provider organization, bulk/raw/transaction bypasses | Nest middleware/guard tests plus scoped-client operation matrix and runtime tests. |
| Unit | Permission grammar, provider/local role mapping, wildcard matching, DTO validation, HMAC canonicalization, depth, role protection, state transitions, retry schedule | Jest with injected ports, fake clock, deterministic event/job IDs, and redaction assertions. |
| Database integration | Composite relations, tenant uniqueness, SQL checks, partial index, provider migration diff, scoped transactions | Real Prisma test database and generated client. |
| Migration integration | Populated consistent/inconsistent rows, explicit hashed null-link manifest, provider member validation, invitation matching/quarantine, repeat runs, report paths, exit status | Test runner against tenant A/B fixtures with provider port stub and report snapshots that contain no secrets. |
| API integration | Every controller endpoint, guard order, Host-derived tenant, status/error contract, response redaction | Nest TestingModule plus Supertest. |
| Cleanup integration | Crash after claim, provider pending, unavailable/terminal, timeout, retry ceiling, alert/failure, claim-version race | Fake provider port with exact status matrix and real local state transitions. |
| Doorbell | Cross-tenant reads/writes, invitations, permissions, hierarchy | Real tenant A/B data through the service/API boundary, not only mocked `where` objects. |
| Regression | Legacy permissions, existing session behavior outside Identity, optional audit behavior, generated scope, module composition, dependency/version pins, protected-path hashes | Existing focused tests plus repository gates and scope-manifest verification. |

Every controller route, migration public operation, cleanup transition, and
public Identity service method has a named RED test before implementation.

---

## 12. Doorbell Tests

| Test file | What it proves |
|---|---|
| `apps/api/test/doorbell/identity-cross-tenant-isolation.spec.ts` | Tenant A cannot read Tenant B users, teams, memberships, directory results, invitations, or policies; missing Host cannot select a default tenant. |
| `apps/api/test/doorbell/identity-permission-isolation.spec.ts` | Tenant A role/membership changes do not alter Tenant B effective permissions or cache entries; cache purge occurs before the next decision. |
| `apps/api/test/doorbell/identity-cross-tenant-invitation.spec.ts` | Tenant A token/signature/provider organization cannot be accepted on Tenant B; no Tenant B local membership is created. |
| `apps/api/test/doorbell/identity-cross-tenant-role-mutation.spec.ts` | Tenant A cannot update/delete/assign a Tenant B role through a foreign resource ID or provider context. |
| `apps/api/test/doorbell/identity-cross-tenant-team-hierarchy.spec.ts` | Tenant A cannot read/parent/delete/mutate Tenant B teams; depth and parent constraints remain tenant-local. |

The doorbells must exercise the Host/middleware/guard boundary and a real
tenant-scoped client. A passing generated model list alone is not sufficient
isolation evidence.

---

## 13. Required ADRs

| ADR | Reason | Status |
|---|---|---|
| ADR-0001 | Host-based tenant resolution and explicit superadmin boundary. | Existing |
| ADR-0002 | Better-Auth ownership and provider integration constraints. | Existing |
| ADR-0003 | Historical global local User uniqueness decision. | Existing; exception recorded below |
| ADR-0025 | Provider schema boundary, tenant-scoped projection uniqueness, composite constraints, RBAC grammar, invitation bridge/cleanup, audit outcomes, migration, compatibility, and retention. | Accepted for SPEC-0025 planning |

ADR-0025 explicitly records that Better-Auth users may belong to multiple
organizations and that local Identity projections therefore replace the
historical global `User.email` and `User.betterAuthUserId` uniqueness with
tenant-scoped uniqueness. This is a new migration decision, not a rewrite of
ADR-003's historical record.

---

## 14. Boundaries

| Boundary | Owner | Purpose |
|---|---|---|
| Host tenant resolution | `TenantResolveMiddleware` | Resolve one active tenant from exact `<slug>.<CRM_BASE_DOMAIN>` Host trust rules and mark `tenantResolutionSource = 'host'`. |
| Identity request tenant gate | `IdentitySessionGuard` | Reject non-host context, validate provider organization/member/session, and map the local projection. |
| Legacy session boundary | `BetterAuthGuard` | Preserve existing non-Identity behavior and no-op for Identity without overriding the Host tenant. |
| Scoped local database | `PrismaService.forTenant()` | Enforce tenant-scoped reads/writes, reject invalid models/operations/raw SQL, and preserve scope through transactions. |
| Authentication and provider session | Better-Auth plus `AUTH_CLIENT` and `AuthProviderPort` | Validate provider sessions, organizations, members, email, and context; never store local sessions or expose provider models. |
| Provider schema | `auth@1.6.23` generated output plus Prisma `6.19.3` migration | Own exact provider model/field/table compatibility and required organization-plugin fields. |
| Local session projection | `IdentitySessionResolver` | Map `betterAuthUserId` to local `User.id` through the active tenant scope. |
| Organization structure | Identity module | Own Team, Membership, Role, SecurityPolicy, and local invitation metadata. |
| Authorization | `RBACEngine` and Identity `PermissionGuard` | Evaluate tenant-local canonical permissions for new Identity routes. |
| Legacy authorization | Existing `PermissionsGuard` | Protect legacy controllers using its separate metadata key. |
| Provider invitation lifecycle | Better-Auth organization API through `AuthProviderPort` | Create, get, accept, and cancel provider invitations through typed calls and exact tenant/role/email validation. |
| Invitation security projection | `InvitationEngine` | HMAC link, hash-only local record, claim/finalize state machine, and delivery port. |
| Invitation cleanup | `InvitationCleanupProcessor` + typed `AuthProviderPort` | Release only proven pending claims; retain unresolved claims. |
| Migration maintenance | `identity-migration-preflight.script.ts`, `migrate-users.script.ts`, and `migration-report.ts` | Enumerate trusted tenants, validate provider mappings through the approved worker context, backfill idempotently, and write fixed redacted artifacts/exit codes. |
| Mutation traceability | `IdentityMutationPublisher` + required `AuditService` method | Publish typed events with `eventId`, `correlationId`, `identity-audit-${eventId}`, and required audit outcomes without secrets. |
| Queue trigger | `invitation-cleanup.queue.ts` and `invitation-cleanup.scheduler.ts` | Register one retryable cleanup queue and one idempotent trigger. |
| Provider/runtime ownership | `PlatformRuntimeModule` for the Identity-boundary graph | Prevent Identity from providing a second Prisma/auth client; existing unrelated module providers remain out of scope. |
| Client portal users | Client authentication module | Keep `ClientUser` outside this Identity boundary. |
| Frontend | Tenant/admin web applications | Consume the API later; no frontend implementation in Phase 1. |

---

## 15. Extensibility

| Future feature | How it fits | Effort |
|---|---|---|
| SSO | Add a Better-Auth provider and map the resulting provider user ID to the same tenant-scoped local projection. | Weeks |
| SCIM provisioning | Add a provisioning adapter that calls the scoped membership and role services. | Weeks |
| ABAC | Add an authorization strategy behind the `PermissionEvaluator` port without changing controller tenant rules. | Weeks |
| Delegated administration | Add permissions and policy checks to existing DTO/guard boundaries. | Days |
| Permission audit reporting | Consume typed Identity events and existing AuditEvent records. | Days |

## Architecture Review Preparation (MANDATORY)

### A. Scalability

**Question:** How does the feature scale at 10x and 100x current data volume?

| Factor | 10x | 100x | Mitigation |
|---|---|---|---|
| Storage | Tenant-local identity tables remain small; audit grows linearly. | Audit and historical invitation rows dominate. | Existing audit retention, tenant/time indexes, cleanup state transitions, and no raw token storage. |
| Query latency | Scoped indexed reads remain bounded. | Directory and membership joins need bounded pages. | Composite tenant indexes, bounded page limits, and no unbounded directory response. |
| Write throughput | Mutation events and audit queue are adequate. | Queue pressure may delay audit delivery. | Retry/backoff, metrics, committed-pending outcome, and deterministic event IDs. |
| Memory | Per-process RBAC cache is bounded by active users. | Many users increase cache cardinality. | Tenant/user keys, TTL, synchronous purge, and maximum cache/eviction policy. |
| Cleanup | Stale claim scan remains bounded by tenant/time index. | Large historical backlog increases provider calls. | `nextReconcileAt`, bounded batches, exponential backoff, and alerting rather than unsafe bulk finalization. |

**Decision:** Keep shared PostgreSQL row-level storage for Phase 1 and scale by
tenant/time indexes, bounded reads, queued audit ingestion, bounded cache, and
bounded cleanup batches.

**Alternative:** Database-per-tenant or physical partitioning now. Rejected
because no measured volume requires the migration/operational cost.

**Rationale:** Identity state is tenant-local and bounded; audit and cleanup
growth are controlled by existing retention, indexes, and queues.

**Future impact:** Measured hot tenants or audit pressure can justify targeted
tenant/time partitioning without changing the API or provider boundary.

### B. Open/Closed Principle (OCP)

**Point of extension:** `AuthProviderPort`, `InvitationDeliveryPort`,
`PermissionEvaluator`, `IdentityMutationPublisher`, and the migration provider
context are injected ports.

New provider API adapters, delivery channels, authorization strategies, or audit
consumers implement these ports. Controllers and tenant scoping remain
unchanged. Provider state semantics are not generalized into an adapter that
can invent terminal invitation states.

**Decision:** Keep external provider, delivery, authorization, and audit seams
as small injected ports while leaving local CRUD concrete.

**Rationale:** These boundaries have different ownership and failure semantics;
port isolation makes them testable without hiding local tenant rules.

**Alternative:** Put provider calls and delivery directly in controllers.
Rejected because it couples transport to side effects and retry behavior.

**Future impact:** New providers, delivery channels, and event consumers can be
added without changing route tenant resolution.

### C. Ownership

| Data/capability | Owner | Consumers |
|---|---|---|
| Provider users and sessions | Better-Auth | Identity session resolver and legacy auth boundary |
| Provider organizations and invitations | Better-Auth | Identity invitation bridge and migration provider port |
| Local User projection | Identity with legacy compatibility | RBAC, directory, migration |
| Teams, memberships, roles | Identity | Directory, guards, future modules |
| Security policy | Identity | Policy API and future auth adapters |
| Audit events | Audit platform | Identity publisher and audit consumers |
| Cleanup queue | Identity | Identity invitation processor |

No module writes another module's owned tables directly. Identity uses the
AuditService contract, not the AuditEvent Prisma model, and uses Better-Auth
provider APIs, not provider Prisma models.

**Decision:** Better-Auth owns provider records, Identity owns local projections,
and Audit owns audit storage and ingestion.

**Rationale:** Explicit ownership prevents provider-table writes, duplicate
sessions, and cross-context schema coupling.

**Alternative:** Treat provider and local tables as one shared repository.
Rejected because it would bypass provider lifecycle hooks and tenant scope.

**Future impact:** Future consumers use typed ports/events rather than importing
provider or audit Prisma models.

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
|---|---|---|---|
| User projection | Tenant lifetime | Existing tenant export path | Soft deactivate; no hard delete in Phase 1. |
| Teams and memberships | Tenant lifetime | Tenant export if required | Team soft-delete; reassign/remove memberships in a scoped transaction. |
| Roles | Tenant lifetime | Included in audit/export | System roles retained; custom roles deleted only without memberships. |
| Local invitations | Until accepted/cancelled/quarantined; provider expiry controls mapped pending state | Audit state transitions | Cleanup marks state; hard deletion remains the existing retention policy. |
| Migration reports | Migration run plus retention policy | Redacted artifact and audit correlation | Purge only through the approved maintenance retention process. |
| Mutation/migration audit | Existing Audit retention policy | Existing archive/legal hold | Identity never purges audit rows. |

Invitation cleanup is a state transition, not silent deletion. A reconciliation
failure is retained as retry state and alert evidence.

**Decision:** Preserve local invitation and audit state through the existing
retention policy; cleanup changes state before any later purge.

**Rationale:** Retained state is required to diagnose crashed claims and prove
that no unsafe second acceptance occurred.

**Alternative:** Delete expired/unavailable rows immediately. Rejected because
it loses evidence and makes retries unsafe.

**Future impact:** A later retention job can purge terminal local rows without
changing the acceptance or reconciliation contract.

### E. Idempotency

| Operation | Duplicate risk | Protection | Failure behavior |
|---|---|---|---|
| Create invitation | Provider/API retry can create duplicates. | `(tenantId,idempotencyKey)`, one mapped pending normalized email, provider pending check, and local `creating` state. | Keep unfinalized rows ineligible for acceptance; retry/cancel only through provider API. |
| Accept invitation | Critical concurrent claim/provider side effect. | Conditional pending-to-processing claim, claim version, provider single-use, unique membership. | Provider unavailable never releases/finalizes; retry cleanup. |
| Add membership | Duplicate request. | Unique `(tenantId,userId,teamId)` and scoped transaction. | Return deterministic conflict/existing result. |
| Role/membership mutation | Cache/event/audit retry. | Transaction, purge before return, one `eventId`, request `correlationId`, BullMQ `identity-audit-${eventId}` job ID, required audit delivery. | `committed_audit_pending` retries only the existing audit event. |
| Migration | Process restart/partial run. | Explicit manifest hash, stable source row keys, conditional updates, upserts, report `runId`, audit `eventId = migration-${runId}-${rowKey}`. | Rerun safely; non-zero while fatal rows remain. |
| Cleanup | Queue retry/process crash. | Claim version, `nextReconcileAt`, provider pending proof, `identity-cleanup-${invitationId}-${claimVersion}` job ID. | Keep processing on uncertainty; alert/fail at retry ceiling. |

**Decision:** Every provider side effect and background operation has a local
claim, idempotency key, or deterministic event/job ID before retry. The audit
retry key is always the original `eventId`; a retry never calls the original
local mutation method.

**Rationale:** HTTP retries, queue retries, and process restarts are expected;
caller discipline cannot protect invitation acceptance.

**Alternative:** Rely on callers not to retry. Rejected as unsafe for provider
invitations and migration jobs.

**Future impact:** An outbox can replace queue delivery later without changing
operation keys or claim state.

### F. Shared Contracts

| Contract | Location | Consumers | Producers |
|---|---|---|---|
| `IdentityPrincipal`, local/provider IDs, provider validation status, invitation state | `packages/shared/src/identity/identity.types.ts` | Guards, services, controller, tests | Identity resolver/services and provider adapter |
| Permission grammar/result | `packages/shared/src/identity/permission.types.ts` | DTO, guard, RBAC, seed | Identity RBAC |
| Security policy | `packages/shared/src/identity/security.types.ts` | Policy API and future adapters | Policy service |
| Identity mutation event/outcome and retry identity | `packages/shared/src/identity/identity.events.ts` | Audit, cache, consumers, retry worker | Mutation publisher |
| Provider API port and approved worker context | `apps/api/src/modules/identity/auth/auth-provider.port.ts` | Session, invitation, migration, cleanup | Better-Auth adapter implementation |
| Provider/local role mapping | `apps/api/src/modules/identity/auth/auth-provider.port.ts` and shared identity types | Invitation, migration, tests | Identity provider adapter and migration runner |
| Migration report/disposition and manifest hash | `apps/api/src/modules/identity/scripts/migration-report.ts` | CLI, tests, audit | Migration runner |
| Scope manifest | `apps/api/src/modules/identity/scripts/scope-manifest.ts` plus `evidence/scope-manifest.schema.json` | Direct Apply/Verify gates | Scope owner |
| API DTOs | `apps/api/src/modules/identity/dto/identity.dto.ts` | Controller and API tests | Controller boundary |

Shared domain contracts live in `packages/shared`; transport DTOs and provider
port/context types remain in the API module. No shared contract contains a raw
token, token hash, password, session token, provider access token, or provider
request headers. Provider errors are normalized to stable codes before they
cross the port.

**Decision:** Domain identity, permission, policy, event, and migration report
contracts are typed and centralized; HTTP DTOs remain local to the API.

**Rationale:** Shared contracts prevent permission/state drift while keeping
transport and provider details out of reusable domain types.

**Alternative:** Duplicate types in each service. Rejected because tenant and
secret fields would drift.

**Future impact:** Frontend or additional workers can consume safe contracts
without receiving provider secrets or internal persistence details.

### G. Partitioning Strategy

| Dimension | Risk | Strategy |
|---|---|---|
| Tenant | Medium at 100x because local tables share PostgreSQL. | Keep `tenantId` on local rows, composite keys/FKs/indexes now; evaluate physical partitioning only with measured hot tenants. |
| Time | High for audit, low for mutable Identity state. | Use existing audit retention/time indexes; keep claim/cleanup timestamps indexed. |
| Volume | Low for roles/teams, medium for memberships/invitations. | Bounded pages, partial pending uniqueness, cleanup batches, no unbounded API reads. |

No physical partitioning is required in Phase 1. The composite tenant/time key
shape permits a future migration without changing the provider ownership model.

**Decision:** Do not physically partition mutable Identity tables in Phase 1;
preserve tenant/time keys and indexes for a measured future migration.

**Rationale:** Roles, teams, memberships, and invitations have bounded tenant
volume; premature partitioning would increase migration and operational risk.

**Alternative:** Partition every Identity table immediately. Rejected without a
measured hot-tenant or retention threshold.

**Future impact:** Tenant/time partitioning can be introduced after metrics show
pressure, without changing local API contracts.

---

## 16. Interfaces / Contracts

The following shapes are design contracts; implementation types live in the
Working Set files.

```typescript
export interface IdentityPrincipal {
  tenantId: string;             // Host-derived only
  userId: string;               // local User.id
  betterAuthUserId: string;     // provider user.id
  email: string;
  roleNames: string[];
}

export type ProviderLookupStatus =
  | 'valid'
  | 'missing'
  | 'mismatched'
  | 'provider_unavailable'
  | 'invalid_context';

export type ProviderRole = 'owner' | 'admin' | 'member' | (string & {});

export interface ProviderUserRecord {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
}

export interface ProviderSessionRecord {
  sessionId: string;
  user: ProviderUserRecord;
  activeOrganizationId: string | null;
  expiresAt: string;
}

export interface ProviderOrganizationRecord {
  id: string;
  slug: string;
  name: string;
}

export interface ProviderMemberRecord {
  id: string;
  organizationId: string;
  user: ProviderUserRecord;
  role: ProviderRole;
}

export interface ApprovedProviderWorkerContext {
  kind: 'approved-migration-worker';
  headers: Headers;
  actorProviderUserId: string;
  organizationId: string;
  authorizationId: string;
}

export type ProviderContext =
  | { kind: 'request'; headers: Headers }
  | ApprovedProviderWorkerContext;

export type ProviderValidation<T> =
  | { status: 'valid'; value: T }
  | {
      status: Exclude<ProviderLookupStatus, 'valid'>;
      code: string;
      retryable: boolean;
    };

export interface AuthProviderPort {
  getSession(input: { headers: Headers }): Promise<ProviderValidation<ProviderSessionRecord>>;
  getOrganization(input: {
    organizationId: string;
    context: ProviderContext;
  }): Promise<ProviderValidation<ProviderOrganizationRecord>>;
  validateSessionMember(input: {
    headers: Headers;
    organizationId: string;
  }): Promise<ProviderValidation<ProviderMemberRecord>>;
  validateOrganizationMember(input: {
    organizationId: string;
    providerUserId: string;
    expectedEmail: string;
    context: ApprovedProviderWorkerContext;
  }): Promise<ProviderValidation<ProviderMemberRecord>>;
  createInvitation(input: CreateProviderInvitationInput): Promise<ProviderValidation<ProviderInvitation>>;
  getInvitation(input: {
    invitationId: string;
    headers: Headers;
  }): Promise<ProviderValidation<PendingProviderInvitation>>;
  acceptInvitation(input: {
    invitationId: string;
    headers: Headers;
  }): Promise<ProviderValidation<ProviderAcceptance>>;
  listPendingUserInvitations(input: PendingProviderLookup): Promise<ProviderValidation<PendingProviderInvitation[]>>;
  cancelInvitation(input: {
    invitationId: string;
    headers: Headers;
  }): Promise<ProviderValidation<void>>;
}

export interface PendingProviderLookup {
  email: string;
  organizationId: string;
  context: ApprovedProviderWorkerContext;
}

export type ProviderInvitationAvailability =
  | 'pending'
  | 'unavailable'
  | 'provider_unavailable';

export interface CreateInvitationInput {
  email: string;
  roleId: string;
  teamId?: string;
  idempotencyKey?: string;
}

export interface CreateProviderInvitationInput {
  email: string;
  organizationId: string;
  providerRole: 'member' | 'admin';
  headers: Headers;
  idempotencyKey: string;
}

export interface AcceptInvitationInput {
  token: string;
  signature: string;
}

export type LocalInvitationStatus =
  | 'creating'
  | 'pending'
  | 'processing'
  | 'accepted'
  | 'expired'
  | 'cancelled'
  | 'quarantined';

export type InvitationProviderLinkState =
  | 'creating'
  | 'mapped'
  | 'legacy_unmapped'
  | 'quarantined'
  | 'reconciliation_required';

export interface InvitationResponse {
  invitationId: string;
  status: Exclude<LocalInvitationStatus, 'creating'>;
  providerLinkState: InvitationProviderLinkState;
  expiresAt: string;
  deliveryStatus: 'queued' | 'sent' | 'failed';
}

export type IdentityMutationOutcome =
  | 'success'
  | 'failure'
  | 'committed_audit_pending';

export interface IdentityMutationEvent {
  eventId: string;
  tenantId: string;
  actorId: string;
  resourceType: 'team' | 'role' | 'membership' | 'invitation' | 'policy' | 'migration';
  resourceId: string;
  action: string;
  outcome: IdentityMutationOutcome;
  correlationId: string;
  occurredAt: string;
}
```

The local Prisma relation shape must include tenant fields in every local
relationship that can otherwise cross a tenant:

```prisma
model User {
  id                String  @id @default(uuid())
  tenantId          String  @map("tenant_id")
  email             String
  betterAuthUserId  String? @map("better_auth_user_id")

  @@unique([tenantId, email])
  @@unique([tenantId, betterAuthUserId])
}

model Team {
  id           String  @id @default(uuid())
  tenantId     String  @map("tenant_id")
  parentTeamId String? @map("parent_team_id")

  parentTeam Team? @relation("TeamHierarchy", fields: [tenantId, parentTeamId], references: [tenantId, id])
  children   Team[] @relation("TeamHierarchy")

  @@unique([tenantId, id])
}

model Membership {
  id       String @id @default(uuid())
  tenantId String @map("tenant_id")
  userId   String @map("user_id")
  teamId   String @map("team_id")
  roleId   String @map("role_id")

  user User @relation(fields: [tenantId, userId], references: [tenantId, id], onDelete: Cascade)
  team Team @relation(fields: [tenantId, teamId], references: [tenantId, id], onDelete: Cascade)
  role Role @relation(fields: [tenantId, roleId], references: [tenantId, id], onDelete: Restrict)

  @@unique([tenantId, userId, teamId])
}

model Invitation {
  id                     String   @id @default(uuid())
  tenantId               String   @map("tenant_id")
  betterAuthInvitationId String?  @unique @map("better_auth_invitation_id")
  providerLinkState      String   @default("legacy_unmapped") @map("provider_link_state")
  email                  String
  roleId                 String   @map("role_id")
  teamId                 String?  @map("team_id")
  tokenHash              String   @unique @map("token_hash")
  status                 String   @default("pending")
  claimVersion           Int      @default(0) @map("claim_version")
  processingAt           DateTime? @map("processing_at")
  reconcileAttempts      Int      @default(0) @map("reconcile_attempts")
  nextReconcileAt        DateTime? @map("next_reconcile_at")
  expiresAt              DateTime @map("expires_at")
  acceptedAt             DateTime? @map("accepted_at")
  idempotencyKey         String?  @map("idempotency_key")

  role Role @relation(fields: [tenantId, roleId], references: [tenantId, id], onDelete: Restrict)
  team Team? @relation(fields: [tenantId, teamId], references: [tenantId, id], onDelete: SetNull)

  @@unique([tenantId, idempotencyKey])
  @@index([tenantId, email, status, providerLinkState])
}
```

Prisma manages representable fields, relations, scalar indexes, and composite
uniqueness. SQL manages the partial unique index for mapped active invitations,
the depth/status checks, and any generated provider SQL that Prisma cannot
represent. `identity-constraint-drift.spec.ts` owns the allowlist and fails on
unapproved drift. The optional invitation team relation and team-parent
relation are not deferred to implementation time.

### API boundary rules

- `tenantId` is derived request context and absent from create/update DTOs.
- Local IDs are opaque and are always looked up through the active scoped client.
- Provider IDs are internal except in the provider port and redacted migration
  evidence.
- Controllers translate domain/provider failures to the stable error codes in
  `spec.md` without exposing provider exception text.
- No response serializes token hashes, raw tokens, passwords, provider access
  tokens, or sessions.

The provider adapter maps provider failures to `missing`, `mismatched`,
`provider_unavailable`, or `invalid_context` with a stable internal code and a
retryable flag. It logs only the correlation ID and code. A missing provider
user/member, a foreign organization, a mismatched email, and an inactive local
projection are non-success validation results; timeouts and provider 5xx errors
are retryable but never authorize or finalize a local mutation.

---

## 17. Migration Strategy

The migration is additive with respect to historical table creation: the older
identity migration is never edited. Constraint replacement for local User
projection uniqueness is a deliberate new forward migration and is protected
by preflight checks.

### Preflight and backfill contract

1. **Capture scope baseline.** Before Apply, generate
   `evidence/scope-manifest.json` with dirty paths, SHA-256 hashes, approved
   Working Set paths, generated-output source hashes, protected paths, and the
   four preserved review/refinement hashes. Preserve those hashes throughout
   the change.
2. **Generate provider schema.** Run the exact `auth@1.6.23` command from
   Section 7 with `apps/api/scripts/better-auth-schema.config.ts`; record the
   generated artifact hash. Review only the generated provider delta and stop
   if it requires an undocumented adapter mapping, a model/table collision, or
   a physical column change outside the allowlist.
3. **Run read-only preflight.** `identity-migration-preflight` enumerates
   tenants through its trusted maintenance boundary and validates:
   - tenant/provider organization mappings;
   - User, Team, Role, Membership, Invitation, and Team parent references;
   - duplicate local relationships and recomputable team depth/cycles;
   - existing provider IDs against the exact provider organization;
   - provider user email, email verification, provider member role, and local
     `User.isActive` status;
   - active local invitations against pending/non-expired provider API results;
   - active local users with null provider IDs;
   - provider required-field/expiry reconciliation rows;
   - permission strings and role names against the canonical grammar.
4. **Resolve only deterministic mappings.** Existing non-null provider IDs are
   accepted only after provider validation. A null local User link requires an
   explicit content-hashed `evidence/identity-provider-mapping.json` containing
   local user ID, tenant ID, and provider user ID. Email is not a mapping key.
   The same provider user may map to multiple tenants only after separate
   organization-member validation. A local pending invitation maps only
   when exactly one provider pending/non-expired invitation matches the tenant
   organization and normalized email. Zero or multiple candidates are errors;
   no provider ID is invented.
5. **Report and exit.** Write the fixed artifacts
   `evidence/identity-migration-report.json`,
   `evidence/identity-migration-audit.jsonl`, and
   `evidence/identity-migration-report.sha256`. The report contains run ID,
   stable source row key, tenant ID, disposition, error code, counts,
   manifest hash, and correlation ID. Email is represented by a hash where
   needed; raw email, tokens, passwords, provider credentials, session tokens,
   and provider exception text are excluded. Fatal unresolved active rows cause
   exit code 1 and block migration/enablement.
6. **Apply the additive migration.** Add nullable provider link state and claim
   fields, tenant-composite local constraints/relations, projection uniqueness,
   depth checks, indexes, and SQL-managed partial uniqueness. Generated provider
   fields are applied in the same provider-owned Prisma migration output only
   after the provider-row preflight passes. The migration must not rewrite
   `20260720230000_add_identity` or unrelated SPEC-0027/SPEC-0028 migrations.
7. **Backfill idempotently.** Apply only the preflight-approved manifest and
   exact provider invitation matches. Upsert `Everyone` at `(tenantId,name)`;
   map existing role names deterministically using the provider/local role
   table; upsert memberships by their tenant composite key. Conditional updates
   use row IDs/version/state. Each disposition emits the same deterministic
   migration event ID on rerun. No existing provider/local row is deleted.
8. **Handle unresolved rows.** Active unmapped users, cross-tenant references,
   duplicate-conflict rows, ambiguous invitations, and provider-unavailable
   mappings remain unchanged and are errors. A maintainer-approved forward-fix
   may mark local invitations `quarantined` and reissue them through
   Better-Auth only when `evidence/identity-quarantine.json` explicitly names
   the row and reason; it may not invent a provider ID, attach a user by email,
   delete a membership, or accept a provider invitation. Historical terminal
   invitations may remain `legacy_unmapped` and report-only.
9. **Verify before enablement.** The migration runner returns zero only when
   the final report has no fatal errors, all active Identity rows are mapped or
   deliberately excluded, scope generation is current, constraint drift is
   allowlisted, provider schema/catalog reconciliation is exact, and the
   post-Verify scope manifest matches. Routes and cleanup remain disabled until
   this result is zero.

### Idempotency and audit

The mapping manifest is content-hashed and keyed by stable local/provider IDs.
Rerunning a completed row is a no-op. Every mapping, repair/quarantine,
skip/unmapped row, tenant failure, and final report emits a required audit
event through the migration's audit port. Reports never log secrets.

### Rollback and forward-fix boundary

Before migration execution, stop and discard only the phase's uncommitted
schema/contract/report artifacts. After the additive migration is applied,
disable Identity routes and cleanup rather than dropping tables or restoring raw
tokens. Use a maintainer-approved additive forward fix or database restore for
constraint/data repair. Never delete provider users/sessions/invitations or
local users as a rollback shortcut. The historical migration and unrelated
worktree changes are immutable.

---

## 18. Open Questions and Exit Conditions

| # | Question | Status | Resolution/exit condition |
|---:|---|---|---|
| 1 | Which local tenant key may Identity models use? | Resolved | `tenantId` only; provider `organizationId` remains provider metadata. |
| 2 | What owns provider schema fields required by Better-Auth organization flows? | Resolved | Better-Auth v1.6.23 generated Prisma schema plus Prisma migration; no invented fields or direct provider CRUD. |
| 3 | How are Identity routes resolved to a tenant? | Resolved | Real Host subdomain, explicit source marker, required Identity guard, and non-empty `forTenant()`. |
| 4 | Who creates and accepts provider invitations? | Resolved | Better-Auth typed server APIs with request/provider context; local Identity stores a projection only. |
| 5 | How is a session mapped to local authorization? | Resolved | Provider `user.id` maps to tenant-scoped `User.betterAuthUserId`, then local `User.id` drives RBAC. |
| 6 | May a provider user belong to multiple tenants? | Resolved | Yes. Local User email/provider-ID uniqueness is tenant-scoped; ADR-0025 records the exception to ADR-003. |
| 7 | What happens to null provider links? | Resolved | Explicit provider-validated mapping manifest only; no email-only attach; active unmapped rows block migration. |
| 8 | What is the team depth maximum? | Resolved | Root `0`; valid range `0..3`; maximum inclusive `3`. |
| 9 | What permission grammar is canonical? | Resolved | Resource actions, `resource:*`, and `*:admin`; `write` and `*:*` invalid. |
| 10 | How are revocations made effective immediately? | Resolved | Synchronous affected-user/tenant cache purge plus typed event; TTL is fallback only. |
| 11 | What does required audit failure mean? | Resolved | Committed local mutation returns `committed_audit_pending` with idempotent audit retry; no silent downgrade. |
| 12 | How are crashed invitation claims reconciled? | Resolved | Typed pending provider API only. Pending proof releases; unavailable/terminal ambiguity stays processing and retryable. |
| 13 | How are existing local invitations mapped? | Resolved | Exact one pending/non-expired provider match; ambiguous/unmapped active rows error/quarantine by explicit forward fix. |
| 14 | Which constraints are Prisma versus SQL managed? | Resolved | Prisma owns representable relations/fields/indexes; SQL owns partial unique/check/provider-generated deltas with allowlisted drift tests. |
| 15 | Who owns module/provider wiring? | Resolved | Core owns Identity import; AppModule imports composition modules only; one Identity permission guard path and no Identity-local duplicate providers. |
| 16 | Are Apply phase paths overlapping? | Resolved | `tasks.md` assigns every path to one phase and declares queue/migration entrypoints. |
| 17 | How is unrelated dirty worktree state protected? | Resolved | Pre-Apply and post-Verify changed-path/content-hash manifests with protected-path allowlist. |
| 18 | Is any clarification required before Apply? | Resolved for planning | Repeat Direct Architecture Review, Tasks Review, and Workload Guard are complete. `stacked-to-main` is selected with no size exception. Apply remains the next phase but is not executed by this planning continuation. |

---

> **End of document.**
> This artifact retains all 18 Enterprise Design Standard sections and the required Architecture Review Preparation topics A-G.
