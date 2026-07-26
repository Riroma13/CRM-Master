# Tasks: SPEC-0025 - Identity & Organization Platform

**Planning mode:** SDD-Direct
**Task status:** Apply Slice 1 / Phase 1A COMPLETE; Phase 1B pending
**Source of truth:** `spec.md`, `design.md`, `architecture-review-direct-repeat-2.md`, `design-refinement.md`, `design-refinement-repeat.md`, `tasks-review.md`, `workload-guard.md`, and `docs/adr/0025-identity-organization-platform.md`
**Apply phases:** 1-5
**Delivery strategy:** `stacked-to-main`
**Size exception:** Rejected; the 400-line budget is handled with chained review slices.
**Workload Guard:** `workload-guard.md` is `READY`; canonical complexity score `12`.

The approved repeat Direct Architecture Review, Tasks Review, and Workload Guard
authorized Apply. Slice 1 / Phase 1A is complete; later slices remain pending.
The implementation does not invoke Gentle-AI, any dispatcher, native review
lifecycle, commit, push, merge, release, or tag operation.

## Direct Apply Slice Progress

- [x] Slice 1 / Phase 1A: exact Better-Auth toolchain/config, provider-only
  generated artifact, provider model/catalog reconciliation, and provider
  schema contract tests.
- [ ] Slice 2 / Phase 1B: local schema hardening, migration/constraint
  inventory, scoped-client operation matrix, Host/guard boundary, and shared
  Identity contracts.
- [ ] Slice 3 / Phase 2: typed provider adapter/context, session mapping, RBAC,
  cache invalidation, mutation events, and required audit outcomes.
- [ ] Slice 4 / Phase 3: provider invitation bridge, HMAC/hash-only projection,
  claim state machine, and pending-only cleanup.
- [ ] Slice 5 / Phase 4: DTOs, controllers, bounded directory/policy API,
  stable errors, and response redaction.
- [ ] Slice 6 / Phase 5A: migration preflight/backfill, fixed reports/audit
  artifacts, role seed, and exit-code gates.
- [ ] Slice 7 / Phase 5B: queue/scheduler, Core/App composition, provider
  ownership, five doorbells, and final scope verification.

Every Apply phase is strictly:

```text
RED -> GREEN -> REFACTOR -> phase verification -> standard phase summary
```

A phase cannot mark an implementation task complete without a failing test,
the smallest implementation that makes it pass, and a focused refactor. A
phase may consume a prior phase's artifact but may not edit a path owned by a
different phase.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated implementation changes | ~2,100-2,700 lines including tests, provider schema migration, migration runner, DTOs, cleanup, module wiring, and five doorbells |
| 400-line budget risk | High |
| Complexity score | 12: multiple bounded contexts, shared contracts, existing consumers, provider/schema migration, multiple modules, and backward compatibility; the canonical Workload Guard criteria do not award a separate dirty-worktree point |
| Recommendation | Chained review slices, `stacked-to-main`, subject to Direct Workload Guard after clean Tasks Review |
| Apply boundaries | Five independently verifiable phases; one owner per shared path; additive schema plus report-driven migration gate |
| Workload Guard timing | Only after a clean Tasks Review, as required by Direct mode |
| Runtime work in this refinement | None |

The forecast is advisory. It cannot bypass Architecture Review, Tasks Review,
or the pre-Apply scope manifest.

## Architecture Review Disposition

The historical `architecture-review.md`, prior Direct review
`architecture-review-direct.md`, repeat review artifacts
`architecture-review-direct-repeat.md` and
`architecture-review-direct-repeat-2.md`, and prior refinement
`design-refinement.md` remain unchanged. The resolution artifacts are
`design-refinement.md`, `design-refinement-repeat.md`, and ADR-0025.

| Finding | Classification | Owner | Required evidence |
|---|---|---|---|
| AR-001 provider schema fields | BLOCKER resolved in Design | Phase 1 schema/provider boundary | Better-Auth v1.6.23 generated Prisma output, provider integration tests, migration diff, no provider-table Identity access |
| AR-002 fail-open Host/scope | BLOCKER resolved in Design | Phase 1 boundary | Missing/reserved/development Host tests, strict `forTenant()` test, foreign-session test, five doorbells |
| AR-003 existing data/backfill | BLOCKER resolved in Design | Phase 5 migration owner | Preflight report, explicit mapping manifest, deterministic dispositions, populated fixtures, idempotent rerun, non-zero exit |
| AR-004 stale claims | BLOCKER resolved in Design | Phase 3 cleanup owner | Typed pending-provider port, status matrix, crash/restart/retry tests, no direct provider reads |
| AR-005 permission grammar | CONDITION | Phase 1 contract + Phase 2 RBAC | Parser/DTO/seed/evaluator/test agreement; `write` and `*:*` rejected |
| AR-006 audit outcomes | CONDITION | Phase 2 publisher + Phase 5 module wiring | Required enqueue failure, committed-pending result, deterministic retry, legacy optional behavior preserved |
| AR-007 module ownership | CONDITION | Phase 5 composition owner | Core-owned Identity import, AppModule composition-only, one guard/provider path, graph test |
| AR-008 phase overlap | CONDITION | This Tasks artifact | Exclusive path ownership table, explicit queue/migration entrypoints, no later-phase dependency hidden |
| AR-009 Prisma/SQL drift | CONDITION | Phase 1 schema owner | Prisma validation, migration diff, SQL allowlist, exact composite relation test |
| AR-010 null provider ID | CONDITION | Phase 5 migration owner | Explicit mapping manifest, no email-only attach, tenant-scoped uniqueness, unmapped error/exit test |
| AR-011 dirty scope contamination | CONDITION | Phase 5 scope owner | Pre-Apply and post-Verify changed-path/hash manifests and protected-path comparison |
| AR-012 provider schema generation | BLOCKER resolved in Design; evidence gate remains | Phase 1 schema/provider boundary | Exact `auth@1.6.23` package, exported CLI config, pinned `cwd/config/output` command, provider-only artifact, model/table/field/catalog reconciliation, provider-row preflight |
| AR-013 provider-user legacy mapping | BLOCKER resolved in Design; evidence gate remains | Phase 2 provider port + Phase 5 migration owner | Typed organization-member validation with approved worker context, canonical content-hashed manifest, role/email/organization checks, populated failure fixtures, non-zero unresolved exit |
| AR-014 ADR authorization | BLOCKER resolved in Design; maintainer acceptance gate remains | Maintainer/schema owner before Phase 1 schema Apply | `docs/adr/0025-identity-organization-platform.md` in Working Set and accepted before migration generation |
| AR-015 guard/module order | CONDITION | Phase 5 composition owner | Core/App graph, `IdentitySessionGuard -> IdentityPermissionGuard` integration test, legacy metadata isolation |
| AR-016 scoped operation/raw coverage | CONDITION | Phase 1 scope owner | Full Prisma read/write/bulk/transaction matrix, every raw method rejection, invalid scope and admin/provider model rejection |
| AR-017 provider/local roles | CONDITION | Phase 2/3 provider owner | Exact role mapping matrix, missing actor/org rejection, no provider call on invalid mapping |
| AR-018 Prisma/SQL drift inventory | CONDITION | Phase 1 schema owner | Named constraint/index/FK/check allowlist, normalized diff and applied catalog parity |
| AR-019 migration artifacts | CONDITION | Phase 5 migration owner | Fixed evidence paths, report schema/redaction, command integration, rerun/no-op and exit-code tests |
| AR-020 audit retry identity | CONDITION | Phase 2 publisher + Phase 5 queue owner | Stable event/correlation/job/retry IDs, ordering, queue rejection, retry no-replay tests |
| AR-021 scope manifest | CONDITION | Phase 5 scope owner | `sdd-direct/scope-manifest/v1` schema, protected-path hashes, generated-output source hashes, pre/post verification |
| AR-022 version/Host trust | CONDITION | Phase 1 boundary owner | Exact package/Prisma versions, `CRM_BASE_DOMAIN`, trusted proxy and Host parser tests |

## Dependency Graph and Exclusive Ownership

```text
Phase 1: Provider schema + local schema + fail-closed shared boundary + contracts
    |
    +--> Phase 2: Scoped services + session mapping + RBAC + audit outcomes
              |
              +--> Phase 3: Provider invitation bridge + cleanup state machine
                        |
                        +--> Phase 4: Controller/API + directory + policy
                                  |
                                  +--> Phase 5: Migration/backfill + seed + queue/module wiring + doorbells
```

### Path owner table

Each path below has exactly one phase owner. A later phase may read or test an
earlier artifact but cannot modify its path.

| Phase | Owned paths |
|---|---|
| 1 | `packages/database/prisma/schema.prisma`; `packages/database/prisma/migrations/20260725120000_identity_platform_hardening/migration.sql`; `packages/database/src/index.ts`; `packages/database/src/prisma-helpers.ts`; `packages/database/src/__tests__/index.test.ts`; `packages/database/src/__tests__/scope-operation-matrix.spec.ts`; `packages/database/prisma/__tests__/identity-schema.spec.ts`; `packages/database/prisma/__tests__/better-auth-schema-reconciliation.spec.ts`; `packages/database/prisma/__tests__/identity-constraint-drift.spec.ts`; `packages/database/prisma/generators/tenant-scope/integrity.spec.ts`; generated tenant-scope files; `apps/api/package.json`; `pnpm-lock.yaml`; `apps/api/scripts/better-auth-schema.config.ts`; `apps/api/src/common/auth.ts`; `apps/api/src/common/auth-client.provider.ts`; `apps/api/src/common/prisma.service.ts`; `apps/api/src/common/middleware/tenant-resolve.middleware.ts`; its spec; `apps/api/src/common/guards/better-auth.guard.ts`; `apps/api/src/common/guards/tenant-scope.guard.ts`; its spec; `apps/api/src/common/__tests__/better-auth-schema-config.spec.ts`; `apps/api/src/common/__tests__/identity-tenant-boundary.spec.ts`; `packages/shared/src/identity/*` contracts/tests; `docs/adr/0025-identity-organization-platform.md` |
| 2 | `apps/api/src/modules/identity/auth/auth-provider.port.ts`; `auth-provider.adapter.ts`; `auth/__tests__/auth-provider.adapter.spec.ts`; `identity-session.resolver.ts`; `identity-session.guard.ts`; their tests; `team/team.service.ts`; team tests; `membership/membership.service.ts`; membership tests; `role/role.service.ts`; role tests; `rbac/rbac-engine.ts`; `permission.guard.ts`; `permission.decorator.ts`; RBAC tests; `events/identity-mutation.publisher.ts`; publisher tests; `apps/api/src/modules/audit/audit.service.ts` |
| 3 | `apps/api/src/modules/identity/invitation/invitation-engine.ts`; `invitation-delivery.port.ts`; `invitation-cleanup.processor.ts`; invitation engine tests; cleanup tests |
| 4 | `apps/api/src/modules/identity/dto/identity.dto.ts`; `identity.controller.ts`; `directory/directory.service.ts`; directory tests; `policy/security-policy.service.ts`; policy tests; controller tests |
| 5 | `apps/api/src/modules/identity/scripts/identity-migration-preflight.script.ts`; `migration-report.ts`; `migrate-users.script.ts`; `scope-manifest.ts`; migration script tests; `packages/database/seeds/identity-roles.seed.ts`; `packages/database/src/seed.ts`; `packages/database/package.json`; `apps/api/src/modules/identity/invitation/invitation-cleanup.queue.ts`; `invitation-cleanup.scheduler.ts`; `apps/api/src/modules/identity/identity.module.ts`; `identity.module.spec.ts`; `apps/api/src/modules/audit/audit.module.ts`; `apps/api/src/modules/core/core.module.ts`; `apps/api/src/app.module.ts`; `apps/api/src/modules/infrastructure/platform-runtime.module.ts`; `apps/api/src/modules/auth/auth.module.ts`; all five Identity doorbells; `openspec/changes/SPEC-0025-identity-platform/evidence/better-auth.generated.prisma`; `identity-provider-mapping.json`; `identity-quarantine.json`; `identity-migration-report.json`; `identity-migration-audit.jsonl`; `identity-migration-report.sha256`; `scope-manifest.json`; `scope-manifest.schema.json` |

The migration file is authored as a Prisma migration generated from the
approved provider/local schema. Provider SQL is not hand-written as runtime
access. Generated tenant-scope files are owned by Phase 1 and may change only
as a reproducible result of the Phase 1 schema source.

## Phase 1: Provider Schema, Local Schema, Fail-Closed Boundary, and Contracts

**Goal:** Make the provider adapter schema, local tenant relationships, scope
boundary, and shared contracts capable of enforcing the Identity invariants
before Identity services are changed.

**Dependencies:** None. Historical identity and unrelated feature migrations
remain immutable.

**Owner paths:** Phase 1 row in the Path owner table.

### RED

1. Add a toolchain/config test that fails when `better-auth`,
   `@better-auth/prisma-adapter`, or `auth` is not exactly `1.6.23`, when the
   CLI config does not export an `auth` instance with the organization plugin,
   or when the exact `cwd/config/output` command is not reproducible.
2. Add a provider schema contract test that fails while the current Prisma
   provider models lack the Better-Auth v1.6.23 organization fields required by
   invitation expiry and active organization session persistence.
3. Add a generated-output reconciliation test that fails for generated model
   collisions, duplicate `ba_*` physical maps, changed provider field types or
   nullability, missing catalog columns, or an unallowlisted migration diff.
4. Add a provider integration contract test that fails if Identity can satisfy
   a session/invitation flow with direct provider Prisma access or a custom
   undocumented model mapping.
5. Add schema tests that fail for missing tenant-composite local keys,
   projection uniqueness, invitation provider link/claim state, optional team
   relation parity, and invalid depth lower/upper bounds.
6. Add constraint-drift tests that fail when SQL-managed partial indexes/checks
   or provider-generated constraints are absent, renamed without an allowlist,
   or proposed for deletion by migration diff.
7. Add scoped-client tests that fail when `forTenant(undefined)`,
   `forTenant(null)`, `forTenant('')`, or `forTenant('   ')` returns a client.
8. Add middleware/guard tests that fail for missing Host, reserved/apex Host,
   localhost, development first-tenant fallback, missing source marker, and
   legacy session tenant overwrite on the Identity prefix.
9. Add contract tests that fail for `documents:write`, `*:*`, unknown
   resources, malformed wildcards, raw invitation fields, or an audit event
   without an explicit outcome.
10. Add generated-scope integrity tests that fail unless all Identity models
   with `tenantId` appear in generated output and no generated list is hand-
   maintained.

### GREEN

1. Load `apps/api/scripts/better-auth-schema.config.ts` through the exact
   `pnpm --filter api exec auth generate --cwd . --config
   scripts/better-auth-schema.config.ts --adapter prisma --dialect postgresql
   --output ../../openspec/changes/SPEC-0025-identity-platform/evidence/better-auth.generated.prisma --yes`
   command. Merge only the reviewed provider model delta into
   `schema.prisma`. Required provider fields come from generated output; do not
   invent names or table access.
2. Generate the additive Prisma migration at
   `20260725120000_identity_platform_hardening`. It may add provider-owned
   generated fields and local hardening, but must not rewrite
   `20260720230000_add_identity` or unrelated SPEC-0027/SPEC-0028 migrations.
3. Pin `better-auth`, `@better-auth/prisma-adapter`, and `auth` to `1.6.23`
   in `apps/api/package.json`, preserve Prisma at the lock-resolved `6.19.3`,
   and declare `identity:migration:scope-gate`, `identity:preflight`,
   `identity:backfill`, and `identity:migration:verify` without allowing
   unrelated pending migrations to run.
4. Add local tenant-composite keys and relations for User, Team, Role,
   Membership, and Invitation. Replace global local User email/provider-ID
   uniqueness with tenant-scoped uniqueness as required by ADR-0025.
5. Add nullable local invitation provider link state, `claimVersion`,
   `processingAt`, `reconcileAttempts`, `nextReconcileAt`, and idempotency key.
   Historical rows remain representable without an invented provider ID.
6. Add SQL-managed depth/status checks and the partial unique index for mapped
   pending/processing invitations; record their names in the drift allowlist.
7. Make `PrismaService.forTenant()` reject empty/non-string values before
   calling the database client factory. Preserve the explicit admin boundary
   for trusted non-Identity maintenance only.
8. Make tenant middleware mark only real subdomain resolution as Host-derived
   and remove the first-tenant development fallback for Identity routes.
   Update the legacy Better-Auth guard so it cannot replace an Identity Host
   tenant; Identity session validation remains in its own guard.
9. Implement shared Identity contracts and the canonical permission grammar:
   resource actions, `resource:*`, and `*:admin`; reject `write`, `*:*`, and
   unknown/global forms.
10. Regenerate Prisma client and tenant-scope artifacts from the schema source.

### REFACTOR

1. Keep provider schema generation, Prisma migration, and local Identity
   schema sections visibly separate in migration review.
2. Ensure all composite relation fields are explicit in Prisma and SQL; remove
   any implementation-time fallback for optional invitation team or team parent.
3. Keep scope validation centralized; do not scatter empty-tenant checks across
   Identity services or introduce a service locator.
4. Ensure generated files are reproducible and contain no unrelated model or
   recovery changes beyond the approved schema source diff.
5. Keep shared contracts secret-free and use typed `IdentityMutationOutcome`
   values rather than arbitrary strings where practical.

### Acceptance Criteria

- [ ] `better-auth`, `@better-auth/prisma-adapter`, and `auth` are exact
  `1.6.23`, Prisma is lock-resolved at `6.19.3`, and the exported CLI config
  loads the organization plugin.
- [ ] The exact provider schema command produces the provider-only evidence
  artifact and reconciliation proves model names, physical `ba_*` maps, field
  types/nullability/relations, database catalog parity, and migration diff
  allowlist before schema Apply.
- [ ] Better-Auth schema generation and Prisma validation prove the provider
  fields required by the configured organization plugin.
- [ ] The new migration is additive relative to historical identity creation;
  historical and unrelated migrations are unchanged.
- [ ] User, Team, Role, Membership, and Invitation relations cannot cross
  tenants at database level.
- [ ] Local User email/provider-ID uniqueness is tenant-scoped and tested for
  one provider user projected into two tenants without same-tenant duplicates.
- [ ] Invitation legacy link/claim fields are nullable/representable for old
  rows and active new rows require provider link state `mapped` in service tests.
- [ ] Depth `0..3` is valid and negative/depth-4 values fail service/schema/SQL.
- [ ] `forTenant()` rejects empty/non-string scope values and Identity code has
  no admin/raw provider access.
- [ ] The scoped-client matrix covers supported read/write/bulk operations,
  interactive/array transactions, every raw SQL method, and rejection of
  provider/platform/admin models.
- [ ] Missing/reserved/development Host cannot resolve an Identity tenant.
- [ ] Permission contracts reject `write`, `*:*`, unknown resources, and
  malformed wildcards before persistence.
- [ ] Generated scope output and drift allowlist tests pass.

### Verification Commands

```bash
pnpm --filter api exec auth generate --cwd . --config scripts/better-auth-schema.config.ts --adapter prisma --dialect postgresql --output ../../openspec/changes/SPEC-0025-identity-platform/evidence/better-auth.generated.prisma --yes
pnpm --filter database exec prisma validate --schema prisma/schema.prisma
pnpm --filter database generate
pnpm --filter database generate:scope:verify
pnpm --filter database test:scope
pnpm --filter database test -- prisma/__tests__/identity-schema.spec.ts prisma/__tests__/identity-constraint-drift.spec.ts
pnpm --filter database exec prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/20260725120000_identity_platform_hardening/migration.sql
pnpm --filter shared lint
pnpm --filter shared test -- src/identity/__tests__/identity.contracts.spec.ts
pnpm --filter api test -- common/middleware/tenant-resolve.middleware.spec.ts common/__tests__/identity-tenant-boundary.spec.ts common/__tests__/better-auth-schema-config.spec.ts --runInBand
```

### Rollback Boundary

Before migration execution, revert only uncommitted Phase 1 planning-owned
runtime files. After the additive migration is applied, stop enablement and use
an approved additive forward fix or database restore. Do not drop provider/local
tables, rewrite the historical migration, restore raw tokens, or change
unrelated worktree paths.

## Phase 2: Scoped Services, Session Mapping, RBAC, Events, and Audit Outcomes

**Goal:** Make local Identity services tenant-safe, map provider sessions to
local projections, make permissions deterministic, and make cache/event/audit
effects observable.

**Dependencies:** Phase 1 schema/contracts and fail-closed boundary.

**Owner paths:** Phase 2 row in the Path owner table. Phase 2 does not edit
`identity.module.ts`; it tests services with explicit providers and leaves final
composition to Phase 5.

### RED

1. Add provider-port tests that fail unless `auth.api.getSession` receives
   request headers and returns the provider user ID without creating/querying a
   local session.
2. Add provider-member validation tests that fail unless organization/member
   lookup receives an approved authenticated worker context, verifies exact
   provider user ID, organization ID, normalized email, provider role, and
   local active status, and returns typed missing/mismatched/unavailable
   results without reading provider Prisma models.
3. Add resolver/guard tests that fail for missing Host-derived tenant, absent
   session, expired session, provider organization mismatch, null local link,
   inactive local projection, and foreign provider user.
4. Add static and runtime service tests that fail if Team, Membership, Role,
   RBAC, or session mapping uses `prisma.admin`, unscoped Prisma, raw SQL, or a
   caller-selected tenant.
5. Add team tests for root depth 0, inclusive depth 3, depth 4 rejection,
   cross-tenant parent, subtree/delete behavior, and audit/event outcomes.
6. Add membership/role tests for cross-tenant User/Team/Role IDs, system-role
   protection, permission grammar, cache purge, typed event, and required audit.
7. Add evaluator tests for exact permission, `resource:*`, `resource:admin`,
   `*:admin`, invalid permission rejection, and denial of `write`/`*:*`.
8. Add audit tests that fail while a missing/rejected queue is silently ignored
   by the Identity mutation path or while a committed mutation is replayed on
   audit retry.
9. Add guard metadata tests proving Identity permission metadata does not react
   to the legacy permission metadata and vice versa.

### GREEN

1. Implement `AuthProviderPort` around the injected `AUTH_CLIENT`; include
    request header propagation, typed provider/session/organization/member/
    invitation method signatures, and the approved migration-worker context.
    Provider table Prisma models are not dependencies of this port.
2. Implement `IdentitySessionResolver` and `IdentitySessionGuard`. Require the
   middleware source marker, call Better-Auth session API, compare the mapped
   provider organization, and resolve local User with
   `prisma.forTenant(tenantId)` by `betterAuthUserId`.
3. Replace unscoped local service reads/writes and transaction callbacks with
   `const db = prisma.forTenant(tenantId)`. A maintenance tenant enumeration is
   not a service shortcut and cannot be used by request handlers.
4. Implement same-tenant validation for User/Team/Role and rely on composite
   constraints as the final relationship boundary.
5. Implement role CRUD, canonical permission parsing, system-role protection,
   membership mutations, and team depth/reassignment rules.
6. Implement RBAC cache lookup and synchronous invalidation for affected users,
   all affected users in a team, and the whole tenant for role permission
   changes. Keep TTL as fallback only.
7. Implement `IdentityMutationPublisher` to purge cache, emit typed mutation
   events, and call a required audit enqueue method with tenant, actor, resource,
   action, outcome, correlation ID, and no secret metadata.
8. Add `AuditService.enqueueRequiredIdentityEvent` (or the exact approved
   equivalent) without changing optional legacy `AuditService.log()`. Missing
   queue or enqueue rejection must throw a typed delivery error.
9. Define ordering: local transaction commit, cache purge, typed event, required
   audit enqueue. If audit enqueue fails after commit, return/record
   `committed_audit_pending` and retry only the deterministic audit event ID.

### REFACTOR

1. Centralize scoped-client acquisition and mutation publication without hiding
   the tenant ID or introducing a service locator.
2. Replace `any` public results with shared contracts or narrow mappers; retain
   constructor injection and explicit ports.
3. Keep provider errors translated at the Identity boundary; do not expose raw
   Better-Auth exception text.
4. Ensure one cache key format includes both tenant and local user ID and that
   tenant purge cannot touch another tenant.
5. Verify provider/auth/audit dependency tokens are injected rather than
   re-instantiated by services.

### Acceptance Criteria

- [ ] Every local Identity query/transaction uses `forTenant(tenantId)`.
- [ ] No Identity service/controller uses `prisma.admin`, raw SQL, or provider
  Prisma models.
- [ ] Session mapping uses Better-Auth user ID plus active Host tenant; null
  projection links are rejected.
- [ ] Provider user/member validation proves exact organization, normalized
  email, provider role, and approved worker context; missing/mismatched/
  unavailable results never authorize or mutate local state.
- [ ] Foreign User/Team/Role IDs fail as scoped not-found/conflict without a
  mutation.
- [ ] Permission grammar and wildcard behavior exactly match `spec.md` and
  seed contracts.
- [ ] Root/max depth is identical across service, schema, SQL, and tests.
- [ ] System roles cannot be deleted or weakened.
- [ ] Cache purge occurs before the next authorization decision and does not
  cross tenant keys.
- [ ] Mutation events and required audit enqueue include required outcome
  semantics and are secret-free.
- [ ] Audit queue failure is observable and produces a deterministic audit-only
  retry, not a second local mutation.
- [ ] `eventId`, `correlationId`, BullMQ `jobId`, and `retryKey` follow the exact
  contract and remain stable across retry.

### Verification Commands

```bash
pnpm --filter api test -- identity/auth identity/team identity/membership identity/role identity/rbac --runInBand
pnpm --filter api test -- common/guards/better-auth.guard common/guards/tenant-scope.guard --runInBand
pnpm --filter api lint
pnpm --filter api build
```

### Rollback Boundary

Disable Identity service/guard registration while retaining the additive schema.
Do not delete local rows or provider sessions. If an audit delivery change is
faulty, restore the required publisher path while preserving committed mutation
and retry evidence.

## Phase 3: Better-Auth Invitation Bridge and Cleanup

**Goal:** Make provider invitation creation/acceptance and local invitation
metadata signed, hash-only, expiring, single-use, concurrency-safe, and safe
under provider-unavailable cleanup.

**Dependencies:** Phase 1 schema/contracts and Phase 2 provider port, session
mapping, scoped services, publisher, and required audit contract.

**Owner paths:** Phase 3 row in the Path owner table. Queue registration and
module wiring are Phase 5 and are not edited here.

### RED

1. Add provider contract tests that fail unless creation calls the official
   `auth.api.createInvitation` with the tenant's mapped provider organization ID
   and actor headers.
2. Add tests that fail unless request acceptance requires an authenticated
   invitee session and calls `auth.api.getInvitation` and
   `auth.api.acceptInvitation` with the request headers.
3. Add HMAC tests for missing/short secret, canonical `tenantId.token` payload,
   malformed/cross-tenant signature, constant-time comparison, and secret
   redaction.
4. Add database tests that fail if a raw token is stored or an active local row
   lacks mapped provider link state/provider ID.
5. Add concurrency tests with two acceptance callers and a deterministic clock;
   exactly one local claim/provider acceptance/membership may succeed.
6. Add cleanup tests for stale threshold, exact pending provider result,
   provider unavailable, timeout, terminal/unavailable result, wrong context,
   retry/backoff, retry ceiling, alert/failure, claim version, and rerun.
7. Add tests that fail if cleanup calls a provider Prisma model, `$queryRaw`,
   `$executeRaw`, or invents a local/provider session.

### GREEN

1. Validate `INVITATION_SIGNING_SECRET` at configuration/module startup with no
   empty/default fallback.
2. Generate a random token, sign `tenantId.token` with HMAC-SHA-256, persist
   only its SHA-256 hash, and pass the signed link only to
   `InvitationDeliveryPort`.
3. Validate role/team with the tenant-scoped client, create a local
   `creating` row keyed by tenant/idempotency key, call Better-Auth provider
   invitation API, then conditionally finalize to `pending`/`mapped` with
   provider ID and provider expiry.
4. Normalize email and enforce one mapped pending/processing local invitation
   per tenant/email through the SQL-managed partial unique index and provider
   pending check.
5. On acceptance, verify Host tenant, signature, local state, expiry, session
   email, and provider pending state; claim `pending -> processing` with
   `claimVersion`; call provider `acceptInvitation`; then create/update the
   tenant-scoped local projection and membership and finalize accepted.
6. On provider failure, release only the matching local claim when the provider
   failure is known before acceptance. If provider outcome is unknown, retain
   `processing` and schedule reconciliation; never release blindly.
7. Implement cleanup with a stale threshold (default 15 minutes), bounded batch,
   `nextReconcileAt`, exponential backoff (initial 1 minute, capped at 1 hour),
   and a retry ceiling (default 8 attempts).
8. Cleanup must use the typed provider port's documented pending-invitation API:
   a request `getInvitation` only with the invitee session context, or the
   approved server-side pending-user-invitation call with exact email and
   organization validation. It may release a claim only for an exact pending,
   non-expired provider match.
9. For no result, terminal/unavailable result, missing provider context,
   authorization failure, timeout, or provider error, leave the row
   `processing`, increment retry state, alert at the ceiling, and fail the job.
   Never finalize from an unavailable result.

### REFACTOR

1. Keep all Better-Auth calls behind `AuthProviderPort` and all local calls
   behind the tenant-scoped client boundary.
2. Use one signer/verifier and one conditional state-transition helper for
   create, accept, cancel, and cleanup.
3. Keep provider unavailable/terminal ambiguity distinct from affirmative
   pending state in typed results.
4. Redact token, hash, provider exception, and session material from errors,
   logs, audit details, reports, and snapshots.
5. Keep cleanup batch and retry settings configurable without allowing a caller
   to disable safe reconciliation.

### Acceptance Criteria

- [ ] Creation/acceptance/cancellation use official Better-Auth APIs only; no
  provider-table writes or local sessions are created.
- [ ] Provider schema/API tests prove invitation expiry and active organization
  session behavior against the generated provider models.
- [ ] Empty/short signing secret fails configuration.
- [ ] Raw tokens are transient delivery data; local persistence contains only
  SHA-256 hashes.
- [ ] Signature, Host tenant, local state, provider pending state, expiry, and
  session email checks precede final local mutation.
- [ ] Concurrent acceptance produces one accepted provider/local invitation and
  one membership.
- [ ] Provider unknown/unavailable state leaves a claim retryable and never
  accepts twice.
- [ ] Cleanup is scoped, idempotent, audited, bounded, retried, and fails loudly
  after the retry ceiling.
- [ ] Responses/audit/reports contain no token, hash, password, secret, or
  session token.

### Verification Commands

```bash
pnpm --filter api test -- identity/invitation --runInBand
pnpm --filter api test -- identity/auth --runInBand
pnpm --filter api lint
pnpm --filter api build
```

### Rollback Boundary

Disable invitation routes and the cleanup trigger without deleting local or
provider records. Pending provider invitations are cancelled only through the
Better-Auth API by an approved operation. Keep `processing` claims and audit
evidence for forward reconciliation; never restore raw tokens or create local
sessions as rollback shortcuts.

## Phase 4: Controller/API Boundary, Directory, and Policy

**Goal:** Expose the contract through thin NestJS boundaries with validated
inputs, stable errors, Host-derived context, and secret-free outputs.

**Dependencies:** Phases 1-3 contracts/services/provider invitation bridge.

**Owner paths:** Phase 4 row in the Path owner table. Phase 4 does not edit
`identity.module.ts`; final registration is Phase 5.

### RED

1. Add controller contract tests for every route in `spec.md` section 5,
   including method/path, DTO validation, guard order, success shape, and
   status/error code.
2. Add tests that reject `tenantId` in body/query/input, requests without Host
   source, requests without Better-Auth session, and caller-selected provider
   organization.
3. Add directory tests for bounded pagination/search, tenant-scoped team/role
   filters, foreign IDs, and relationship consistency.
4. Add policy tests for valid/invalid ranges, unknown fields, tenant scope, and
   required mutation audit outcome.
5. Add response redaction tests that fail if invitation token/hash, HMAC secret,
   password, provider access/session token, or raw provider exception appears.

### GREEN

1. Implement DTOs with class-validator rules, reject unknown fields, bound
   pagination/limits, normalize email, and validate canonical permission strings.
2. Implement `IdentityController` at `/api/v1/tenant/identity` with
   middleware-derived `@TenantId()` and the Identity session principal; do not
   accept tenant context from request data.
3. Add explicit Identity permission decorators without overloading the legacy
   two-argument permission decorator.
4. Update DirectoryService and SecurityPolicyService to use scoped clients,
   stable mappers, bounded results, and validated policy updates.
5. Translate domain/provider failures to the stable error codes in `spec.md`;
   do not expose provider exception text or resource existence across tenants.
6. Map committed-audit-pending outcomes to the documented status and retry key
   without retrying the local mutation.

### REFACTOR

1. Keep controller methods thin: DTO validation, principal/tenant extraction,
   service call, response mapping only.
2. Centralize response serialization so secret redaction is not duplicated.
3. Verify OpenAPI decorators, route naming, pagination defaults, and error shape
   against `spec.md` without expanding scope.
4. Ensure every route has an explicit session/permission owner and no route
   depends on the legacy guard's permissive anonymous behavior.

### Acceptance Criteria

- [ ] Every route in `spec.md` section 5 has controller tests and explicit
  Identity session/permission boundaries.
- [ ] Tenant context comes from Host middleware and `@TenantId()` only.
- [ ] DTOs reject unknown, unbounded, secret-bearing, and caller-tenant inputs.
- [ ] Directory/policy reads and writes are tenant-scoped and bounded.
- [ ] Stable error codes include provider unavailable and committed audit pending.
- [ ] Responses contain no raw token, token hash, secret, password, or session
  token.
- [ ] Legacy permission routes remain unaffected and metadata remains separate.

### Verification Commands

```bash
pnpm --filter api test -- identity --runInBand
pnpm --filter api test -- identity.controller --runInBand
pnpm --filter api lint
pnpm --filter api build
```

### Rollback Boundary

Disable/remove only new route/controller registration while retaining the tested
service/schema changes. Existing legacy routes remain operational. Do not
weaken guards, DTO validation, tenant resolution, or response redaction.

## Phase 5: Migration/Backfill, Seed, Queue, Composition, and Doorbells

**Goal:** Execute the report-driven migration safely, make seeds real and
tenant-scoped, register one cleanup trigger, complete the approved Nest graph,
and prove cross-tenant isolation.

**Dependencies:** Passing focused tests from Phases 1-4. This phase owns final
composition and operational entrypoints; it does not change earlier phase
service paths.

### RED

1. Add migration preflight tests that fail for missing tenant/provider
   organization mapping, cross-tenant parent/membership/role/team references,
   cycles/depth violations, duplicate conflicts, invalid permissions, and
   provider-unavailable lookup.
2. Add null-link tests that fail if a local user is attached to a provider user
   by email alone. Require an explicit provider-validated mapping manifest.
3. Add invitation migration tests that fail unless exact one pending/non-expired
   provider matches are mapped, ambiguous/absent active rows are errors or
   explicitly quarantined by forward-fix input, and no provider ID is invented.
4. Add report tests that fail if raw email, token, hash, password, provider
   credential, session token, or provider exception text is serialized.
5. Add fixed-artifact tests for `evidence/identity-provider-mapping.json`,
   optional `evidence/identity-quarantine.json`,
   `evidence/identity-migration-report.json`,
   `evidence/identity-migration-audit.jsonl`,
   `evidence/identity-migration-report.sha256`, and
   `evidence/scope-manifest.json`, including schema/hash validation.
6. Add idempotency tests that run preflight/backfill twice and fail on duplicate
   Everyone team, membership, role, mapping, or audit records.
7. Add migration command tests that fail unless final fatal report errors return
   exit code 1 and success returns 0.
8. Add seed entrypoint tests that fail while `packages/database/package.json`
   points at a missing `src/seed.ts`, while the seed uses an unscoped tenant
   write, or while a permission violates the canonical grammar.
9. Add cleanup registration tests that fail when the queue/scheduler is missing,
   duplicated, uses a second queue name, or omits retry/backoff settings.
10. Add Nest graph tests that fail when AppModule directly imports IdentityModule,
   Identity provides duplicate Prisma/auth/audit providers, or more than one
   Identity PermissionGuard instance is registered.
11. Add five real tenant A/B doorbells before final module wiring is changed.
    They must exercise records and HTTP/service boundaries, not only mocked
    `where` objects.
12. Add pre-Apply scope-manifest tests that fail if protected dirty paths are
    not captured or if a planned generated output includes unapproved
    SPEC-0027/SPEC-0028/SDD-v3 changes.

### GREEN

1. Implement `migration-report.ts` with stable run ID, schema version, tenant
    counts, dispositions, error codes, correlation IDs, manifest hash, fixed
    output paths, and redaction rules. Emit the JSON report, JSONL audit, and
    report SHA-256 artifacts declared in `design.md`.
2. Implement `identity-migration-preflight.script.ts` as a read-only gate. It
   uses a trusted maintenance boundary only to enumerate tenants, calls typed
   Better-Auth APIs for provider validation, writes no local repair, and exits
   non-zero on fatal active errors.
3. Implement `migrate-users.script.ts` with the explicit content-hashed mapping
    manifest and approved migration-worker provider context:
    `forTenant(tenant.id)` for every local query/write, exact role mapping,
    idempotent `Everyone` upsert, membership upsert, provider-ID/member
    validation, report/audit emission, and non-zero final result.
4. Apply only deterministic repairs: exact provider mappings, exact invitation
   pending matches, canonical `Everyone` creation, and non-conflicting role/
   membership upserts. Preserve ambiguous/cross-tenant/unmapped rows and stop
   or require explicit quarantine/reissue forward fix.
5. Verify the Phase 1-owned command entrypoints for
    `identity:migration:scope-gate`, `identity:preflight`, `identity:backfill`,
    and `identity:migration:verify`. They must propagate exit code 1 and refuse
    to proceed when unrelated pending migrations are detected; Phase 5 does not
    edit `apps/api/package.json`.
6. Update the real database seed entrypoint and identity role seed. Enumerate
   tenants through the maintenance boundary, then perform every role write via
   `forTenant(tenant.id)`. Use only canonical permissions.
7. Register one `identity:invitation-cleanup` queue in
   `invitation-cleanup.queue.ts` with bounded attempts, exponential backoff,
   and retained failures. Register one scheduler in
   `invitation-cleanup.scheduler.ts` with a deterministic job ID.
8. Complete `IdentityModule` wiring without `@Global()` feature leakage or a
   second Prisma/auth/audit provider. Import the approved runtime/auth/audit
   boundaries and export only what the root guard path needs.
9. Add `PlatformRuntimeModule` as the explicit provider owner for the
   Identity-boundary Prisma/auth tokens. Make the narrow AuthModule/AuditModule
   changes required to consume that owner without expanding into unrelated
   module provider cleanup.
10. Add `IdentityModule` to `CoreModule` in alphabetical order and remove its
    direct import from `AppModule`. Keep AppModule limited to composition modules,
    global infrastructure providers, middleware, and the single approved
    `APP_GUARD useExisting` path.
11. Register the Identity permission guard once, after the Identity session
    guard on Identity controllers; the guard must no-op when Identity metadata
    is absent and never replace the legacy guard.
12. Run the five doorbells with real tenant-separated data:
    `identity-cross-tenant-isolation.spec.ts`,
    `identity-permission-isolation.spec.ts`,
    `identity-cross-tenant-invitation.spec.ts`,
    `identity-cross-tenant-role-mutation.spec.ts`, and
    `identity-cross-tenant-team-hierarchy.spec.ts`.
13. Capture `evidence/scope-manifest.json` before Apply and verify post-Apply
     that generated-output source hashes, protected hashes, and changed paths
     match the approved Working Set. Preserve all pre-existing unrelated
     changes and protected paths.

### REFACTOR

1. Extract report mapping/disposition types without hiding tenant context or
   allowing raw secret fields.
2. Make migration and doorbell setup deterministic and independently cleanable;
   no raw token/provider-secret snapshots.
3. Keep the cleanup queue trigger, provider boundary, and local processor
   separately testable; no scheduler call may bypass claim version or backoff.
4. Verify CoreModule/AppModule imports and provider lists are alphabetically
   ordered where the composition standard requires it.
5. Review every phase's standard summary against the exclusive Path owner table
   and record unexpected files/dependencies before Tasks Review can close.
6. Verify the final module graph does not broaden the SPEC-0025 provider owner
   boundary into a platform-wide Prisma refactor.

### Acceptance Criteria

- [ ] Preflight is read-only, report-driven, redacted, idempotent, and exits
  non-zero on unresolved active errors.
- [ ] Mapping, quarantine, migration report, migration audit, report hash, and
  scope manifest artifacts are written only to the fixed evidence paths and
  validate against their declared schemas/content hashes.
- [ ] Null provider links require an explicit provider-validated manifest; no
  email-only identity attachment occurs.
- [ ] Existing invitations map only through exact pending/non-expired provider
  API results; ambiguous/unmapped active rows are blocked or explicitly
  quarantined/reissued through forward fix.
- [ ] Migration uses scoped local clients for every tenant-owned query/write and
  never reads provider tables directly.
- [ ] Seed entrypoint exists, uses scoped tenant writes, and seeds only valid
  canonical permissions.
- [ ] Cleanup queue/scheduler is registered once with retry/backoff and
  provider-unavailable failure behavior.
- [ ] Migration and mutation audit records use stable event/correlation/job/
  retry identities and never replay a committed local mutation.
- [ ] CoreModule owns Identity; AppModule has no direct feature import; one
  Identity PermissionGuard/provider path exists.
- [ ] All five doorbells pass against real tenant-separated data.
- [ ] Generated scope and Prisma/SQL drift checks pass.
- [ ] Pre-Apply/post-Verify manifests prove no SPEC-0027, SPEC-0028, SDD-v3,
  recovery, dispatcher, or historical review artifact changed.
- [ ] Full API/repository tests, lint, and build pass or unrelated pre-existing
  failures are explicitly recorded.

### Verification Commands

```bash
# Scope/migration gate before applying any pending migration
git status --short --untracked-files=all
pnpm --filter database exec prisma migrate status
pnpm --filter api identity:migration:scope-gate -- --allowed "20260725120000_identity_platform_hardening" --manifest ../../openspec/changes/SPEC-0025-identity-platform/evidence/scope-manifest.json

# Provider schema and migration sequence
pnpm --filter api exec auth generate --cwd . --config scripts/better-auth-schema.config.ts --adapter prisma --dialect postgresql --output ../../openspec/changes/SPEC-0025-identity-platform/evidence/better-auth.generated.prisma --yes
pnpm --filter api identity:preflight -- --mapping-manifest ../../openspec/changes/SPEC-0025-identity-platform/evidence/identity-provider-mapping.json --quarantine-manifest ../../openspec/changes/SPEC-0025-identity-platform/evidence/identity-quarantine.json --report-dir ../../openspec/changes/SPEC-0025-identity-platform/evidence
pnpm --filter database db:migrate
pnpm --filter api identity:backfill -- --mapping-manifest ../../openspec/changes/SPEC-0025-identity-platform/evidence/identity-provider-mapping.json --preflight-report ../../openspec/changes/SPEC-0025-identity-platform/evidence/identity-migration-report.json --report-dir ../../openspec/changes/SPEC-0025-identity-platform/evidence
pnpm --filter api identity:migration:verify -- --report-dir ../../openspec/changes/SPEC-0025-identity-platform/evidence --manifest ../../openspec/changes/SPEC-0025-identity-platform/evidence/scope-manifest.json

# Seed, focused tests, queue/module graph, and doorbells
pnpm --filter database db:seed
pnpm --filter api test -- identity --runInBand
pnpm --filter api test:e2e -- --runInBand test/doorbell/identity-cross-tenant-isolation.spec.ts test/doorbell/identity-permission-isolation.spec.ts test/doorbell/identity-cross-tenant-invitation.spec.ts test/doorbell/identity-cross-tenant-role-mutation.spec.ts test/doorbell/identity-cross-tenant-team-hierarchy.spec.ts
pnpm --filter database generate:scope:verify
pnpm test
pnpm lint
pnpm turbo build
```

If `prisma migrate status` reports pending migrations outside the approved
SPEC-0025 migration, the command must stop. It must not apply the dirty
worktree's SPEC-0027, SPEC-0028, or SDD-v3/recovery changes as a side effect.

### Rollback Boundary

If migration report, module graph, queue registration, or doorbells fail, stop
before enabling Identity routes/cleanup. The migration is rerunnable and no
destructive data cleanup is a rollback step. Disable only new module routes/jobs
or use a maintainer-approved database restore/additive repair. Preserve reports,
audit evidence, pre-existing dirty changes, and both historical review files.

## Required Apply Summary Shape

Each completed phase must end with exactly this engineering summary, filled with
actual evidence:

```markdown
=== PHASE X COMPLETE ===

Files created:
Files modified:

Working Set:
- Planned
- Actual
- Accuracy

Unexpected Files:
Unexpected Dependencies:

Acceptance Criteria:
(checklist)

Build:

Tests:

Ready for Phase X+1.
```

The summary must explicitly state that no unplanned path was changed or list the
approved deviation and stop condition.

## Tasks Review Exit Criteria

- [ ] `spec.md` is the canonical input/output, security, error, cleanup, and
  migration contract.
- [ ] `design.md` contains all 18 sections and Architecture Review topics A-G.
- [ ] `architecture-review-direct-repeat-2.md` is `APPROVED` with AR-012..AR-014
  closed and AR-015..AR-022 recorded as implementation conditions.
- [ ] `design-refinement.md` resolves AR-001..AR-011 and
  `design-refinement-repeat.md` resolves AR-012..AR-014 while recording
  residual risks and the AR-015..AR-022 implementation gates.
- [ ] `docs/adr/0025-identity-organization-platform.md` is accepted before
  schema Apply.
- [ ] `architecture-review.md`, `architecture-review-direct.md`,
  `architecture-review-direct-repeat.md`, `design-refinement.md`, and
  `design-refinement-repeat.md` remain byte-for-byte unchanged after this
  refinement.
- [ ] All five Apply phases have exclusive Working Sets, dependencies,
  RED/GREEN/REFACTOR tasks, acceptance criteria, commands, and rollback bounds.
- [ ] Provider schema generation, invitation API context, pending-only cleanup,
  and no-direct-provider-table rule are explicit.
- [ ] Every tenant-owned Identity query is explicitly assigned to
  `forTenant(tenantId)`; maintenance enumeration is the only declared admin
  boundary.
- [ ] Null Better-Auth links use an explicit mapping manifest and non-zero
  unresolved-error behavior.
- [ ] Migration preflight/backfill report, idempotency, audit/error semantics,
  quarantine/forward-fix, and protected-path scope manifest are executable.
- [ ] Permission grammar, seed roles, evaluator wildcards, cache invalidation,
  mutation events, and required audit outcomes form one tested contract.
- [ ] Cleanup queue/scheduler registration and migration exit-code entrypoints
  are declared.
- [ ] The exact Better-Auth CLI config/command, provider model/table collision
  policy, typed migration context, role mapping, constraint inventory, fixed
  evidence paths, audit retry IDs, and scope-manifest schema are assigned to
  exclusive phase owners.
- [ ] No runtime code has been changed by this planning refinement.

**Next phase:** Apply Phase 1. Apply was not executed because this continuation
records planning metadata only; the seven-slice `stacked-to-main` boundary is in
`workload-guard.md`.
