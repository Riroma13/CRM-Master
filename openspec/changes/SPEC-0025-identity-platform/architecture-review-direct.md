# Architecture Review: SPEC-0025 - Identity & Organization Platform

status: REFINEMENT_REQUIRED
change: SPEC-0025-identity-platform
phase: Architecture Review
artifact: `openspec/changes/SPEC-0025-identity-platform/architecture-review-direct.md`
historical_artifact: `openspec/changes/SPEC-0025-identity-platform/architecture-review.md`
decision: design-refinement
next: Design Refinement

## Verdict

**REFINEMENT_REQUIRED.** Apply is unsafe until the four open blockers below are
resolved in the Design and its declared Working Set. The package has a useful
18-section architecture, explicit tenant-local contracts, and a disciplined
five-phase TDD plan, but the current repository evidence exposes execution paths
that contradict the contract.

This is an independent Direct review. The historical rejected
`architecture-review.md` is preserved byte-for-byte and is not reclassified.
The findings below use new repository and Better-Auth v1.6.23 evidence. A
condition is mandatory downstream acceptance criteria; only a blocker requires
Design Refinement under the Direct workflow.

## Review Evidence

| Review area | Result | Evidence |
|---|---|---|
| Enterprise Design Standard | PASS | `design.md` contains sections 1-18 and the required Architecture Review Preparation topics A-G. |
| Tenant isolation | BLOCKER | The development tenant fallback can match the Identity URL, and `createPrismaClient()` returns an unscoped client for a falsy tenant ID. |
| Better-Auth feasibility and ownership | BLOCKER | The configured organization plugin requires provider fields absent from the current Prisma provider models; the Design also excludes those provider models from change. |
| Invitation lifecycle | BLOCKER | Existing local invitation rows have no safe provider-ID backfill, and the cleanup flow has no session-safe provider status read after a crash. |
| Prisma schema and migration | BLOCKER / CONDITION | Composite tenant relationships are planned, but additive migration behavior for existing data and manual partial uniqueness are not executable contracts yet. |
| RBAC and audit delivery | CONDITION | Cache purge is specified, but required audit enqueue failure semantics and the permission grammar do not align with current contracts and seed data. |
| Nest module and API boundary | CONDITION | The intended CoreModule composition path is not reconciled with the current global feature module, duplicate providers, and global guard registration. |
| TDD and bounded phases | CONDITION | Several high-conflict files and schema changes are owned by multiple phases, and cleanup/migration execution entry points are not declared. |
| Scope isolation | CONDITION | The worktree contains unrelated SPEC-0027, SPEC-0028, and SDD-v3 recovery changes in shared paths. |

## Findings

### BLOCKER

#### AR-001 - Better-Auth organization flow is incompatible with the provider schema

- **Classification:** BLOCKER
- **State:** OPEN
- **Owner:** Identity Design and database/provider integration owner
- **Decision:** design-refinement
- **Evidence:**
  - `apps/api/src/common/auth.ts:7-20` enables the Better-Auth Prisma adapter and the organization plugin.
  - `packages/database/prisma/schema.prisma:90-101` defines the provider `invitation` model without `expiresAt`, while Better-Auth v1.6.23's organization invitation schema requires and writes that field.
  - `packages/database/prisma/schema.prisma:120-130` defines the provider `session` model without `activeOrganizationId`.
  - Better-Auth v1.6.23 `organization/routes/crud-invites.ts` accepts an invitation and then calls `setActiveOrganization`, which persists the active organization on the provider session.
  - Better-Auth v1.6.23 `organization/schema.ts` declares the provider invitation expiry and the organization plugin session field.
  - `design.md:158-166` explicitly says the Better-Auth provider models are expected not to change.
- **Why Apply is unsafe:** `auth.api.createInvitation` cannot reliably create a provider invitation with the provider schema currently declared, and `auth.api.acceptInvitation` cannot complete the provider session update required by the official acceptance flow. Implementing the local bridge without resolving these fields would either fail at runtime or force forbidden direct provider-table writes. The current Working Set has no declared provider-schema migration or supported adapter mapping that closes this gap.
- **Required disposition:** Refine the Design and Working Set to define an additive, provider-owned schema compatibility path for `expiresAt` and `activeOrganizationId`, or an explicitly supported Better-Auth adapter mapping that is proven against the exact Prisma models. Add integration tests for provider invitation creation, provider acceptance, and session organization persistence before Apply can proceed.
- **New evidence relation:** This is new feasibility evidence against the refined provider contract, not a rewrite of historical finding #6.

#### AR-002 - Tenant resolution and scoped-client acquisition are fail-open

- **Classification:** BLOCKER
- **State:** OPEN
- **Owner:** Tenant boundary and database scope owner
- **Decision:** design-refinement
- **Evidence:**
  - `apps/api/src/common/middleware/tenant-resolve.middleware.ts:33-43` assigns the first database tenant when `NODE_ENV=development` and the path contains `/tenant/`.
  - The declared Identity prefix is `/api/v1/tenant/identity`, so the existing fallback matches Identity requests without a tenant subdomain.
  - `packages/database/src/index.ts:32-45` treats a falsy `tenantId` as permission to return the unscoped admin client.
  - `apps/api/src/common/guards/better-auth.guard.ts:80-90` currently overwrites the middleware-derived tenant with the legacy user's tenant after an unscoped provider/session lookup. The Design requires this boundary to be corrected, but the host fallback itself is not in the declared Working Set.
  - `spec.md:49-62` and `design.md:283-297` require Host-derived tenant context and prohibit caller-selected tenant context.
- **Why Apply is unsafe:** Requiring each Identity service to call `forTenant(tenantId)` does not guarantee isolation if the request context can be synthesized from a missing Host header or if an empty tenant value creates an unscoped client. In development and in direct service tests, an invalid context can therefore select an arbitrary tenant or bypass the tenant filter. This violates the first acceptance criteria and makes a negative isolation test insufficient unless the boundary itself fails closed.
- **Required disposition:** Refine the Design and Working Set to remove or explicitly mark the development fallback so Identity routes reject requests without a real Host-derived tenant, make `forTenant()` reject empty or invalid tenant IDs instead of returning an admin client, and preserve the Host tenant as the authority while comparing provider and local mappings. Add tests for missing Host, development fallback, empty tenant IDs, foreign provider sessions, and all five Identity doorbells.
- **New evidence relation:** This is new fail-closed boundary evidence against the refined tenant contract, not a rewrite of historical finding #1.

#### AR-003 - Additive hardening migration has no safe path for existing local identity data

- **Classification:** BLOCKER
- **State:** OPEN
- **Owner:** Identity schema migration owner
- **Decision:** design-refinement
- **Evidence:**
  - The existing identity migration `packages/database/prisma/migrations/20260720230000_add_identity/migration.sql:45-60` creates local invitations without `better_auth_invitation_id`, claim state, or idempotency state.
  - `design.md:518-557` makes `betterAuthInvitationId` required and unique and requires composite tenant relationships for local identity entities.
  - `tasks.md:103-113` describes the new migration as additive but does not define a backfill or quarantine policy for existing local invitations that have no corresponding provider invitation.
  - Existing local memberships, teams, roles, and invitations were created under single-column or missing relationship constraints in the older migration. The new composite foreign keys require a deterministic preflight for cross-tenant references.
  - `design.md:235-247` says inconsistent rows will be preflighted, reported, and audited, but the migration has no declared report artifact, repair script, or application-level audit boundary. SQL migration execution cannot call the existing `AuditService` queue.
- **Why Apply is unsafe:** Adding a required provider invitation ID to a populated `invitations` table will fail or require inventing provider IDs. Adding composite foreign keys without a defined treatment for inconsistent existing rows will either fail mid-migration or encourage unsafe cleanup. The current plan cannot prove that the additive migration is forward-safe for a deployed database.
- **Required disposition:** Refine the migration contract with an explicit preflight and report owner, an abort-without-mutation behavior, and a deterministic disposition for pending and historical local invitations without provider IDs. Define the exact drop-and-replace sequence for old single-column foreign keys, the complete composite relationship set including team parent and optional invitation team, and tests against populated consistent and inconsistent fixtures. Do not claim a required non-null provider link until its backfill or quarantine path is specified.

#### AR-004 - Cleanup cannot reconcile a crashed invitation claim through the declared Better-Auth APIs

- **Classification:** BLOCKER
- **State:** OPEN
- **Owner:** Better-Auth provider boundary and invitation cleanup owner
- **Decision:** design-refinement
- **Evidence:**
  - `spec.md:205-216` requires stale `processing` claims to be reconciled through Better-Auth invitation status APIs before a claim is released or finalized.
  - `design.md:91-95` and `tasks.md:325-328` require the same recovery behavior while forbidding direct provider-table reads and local sessions.
  - Better-Auth v1.6.23 `organization/routes/crud-invites.ts` requires an authenticated session for `getInvitation` and checks the recipient email; `listInvitations` requires an authenticated organization member; `listUserInvitations` can be queried server-side by email but returns pending invitations and cannot distinguish accepted, canceled, and expired state for an arbitrary invitation ID.
  - `invitation-cleanup.processor.ts` is new and has no declared service-session, provider webhook, or other provider-owned status-read contract in the Working Set.
- **Why Apply is unsafe:** A process crash after provider acceptance and before local finalization leaves a local `processing` row. Without a supported background-job status read, cleanup cannot distinguish a provider-accepted invitation from a canceled, expired, or still-pending invitation. Releasing and retrying blindly can create inconsistent local/provider membership state; finalizing blindly can create membership for a provider action that never succeeded.
- **Required disposition:** Refine the provider port to define one official, background-safe status/reconciliation mechanism and its authorization context without creating local sessions or reading provider tables directly. Specify the status transition matrix for accepted, canceled, expired, missing, and still-pending provider invitations, then add crash/restart tests for each branch.

### CONDITION

#### AR-005 - Permission grammar, seed roles, and evaluator behavior are inconsistent

- **Classification:** CONDITION
- **State:** OPEN
- **Owner:** Identity RBAC owner
- **Decision:** continue after recording condition
- **Evidence:**
  - `packages/shared/src/identity/permission.types.ts:1-17` allows only `resource:create|read|update|delete|admin` and `*:admin`.
  - `packages/database/seeds/identity-roles.seed.ts:13-27` persists `workflows:*`, `documents:*`, and `teams:*`.
  - `apps/api/src/modules/identity/rbac/rbac-engine.ts:13-29` implements both `resource:*` and `*:admin` wildcard matching.
  - Existing RBAC tests use `documents:write`, while `PermissionAction` does not include `write`.
- **Required downstream criterion:** Choose one canonical permission grammar and apply it consistently to shared types, DTO validation, seed data, evaluator matching, role mutation, and tests. The contract must state whether `resource:*`, `*:admin`, and `write` are valid. Invalid strings must be rejected before persistence.

#### AR-006 - Required audit delivery and mutation outcome semantics are underspecified

- **Classification:** CONDITION
- **State:** OPEN
- **Owner:** Identity mutation and Audit platform owners
- **Decision:** continue after recording condition
- **Evidence:**
  - `apps/api/src/modules/audit/audit.service.ts:102-129` silently returns after logging a warning when the audit queue is unavailable.
  - `spec.md:167-173` requires synchronous cache invalidation, typed mutation events, required audit enqueue, and observable enqueue failures.
  - `tasks.md:221-228` requires a required enqueue path but does not define whether a mutation is committed before enqueue, how a queue failure is reported, or how a caller retry avoids an ambiguous committed mutation.
- **Required downstream criterion:** Define the ordering and failure contract for role, membership, team, invitation, cleanup, and migration mutations. The implementation must either use a durable transactional outbox/append path or explicitly return a committed-but-undelivered result with idempotent retry semantics. Add tests for queue absence, enqueue rejection, cache purge ordering, event delivery, and retry behavior. Preserve the existing optional legacy audit behavior unless the Design explicitly authorizes a broader change.

#### AR-007 - Core composition and global guard wiring are not executable as currently described

- **Classification:** CONDITION
- **State:** OPEN
- **Owner:** Nest module composition owner
- **Decision:** continue after recording condition
- **Evidence:**
  - `apps/api/src/app.module.ts:6-14,22-54` directly imports `IdentityModule`, provides the identity `PermissionGuard` as a global guard, and provides `PrismaService` at the root.
  - `apps/api/src/modules/core/core.module.ts:28-55` does not currently import `IdentityModule`.
  - `apps/api/src/modules/identity/identity.module.ts:1-32` is `@Global()` and provides another `PrismaService`, while `AuditModule` and `AuthModule` also provide database/auth providers.
  - `docs/architecture/module-composition.md:126-135` forbids feature modules as direct `AppModule` imports and requires composition-only root wiring.
  - `design.md:45-57` chooses CoreModule aggregation without making the required export or `APP_GUARD` registration path explicit.
- **Required downstream criterion:** Specify one Nest dependency graph in which CoreModule owns the feature import, AppModule imports composition modules only, `PermissionGuard` has one provider instance and a deterministic guard order after the Identity session guard, and Prisma/auth/audit providers are not accidentally duplicated. Add a module integration test that fails on direct AppModule feature imports, duplicate providers, or missing guard visibility. Keep composition imports alphabetically ordered.

#### AR-008 - Apply phase ownership and execution dependencies overlap

- **Classification:** CONDITION
- **State:** OPEN
- **Owner:** Direct task-planning owner
- **Decision:** continue after recording condition
- **Evidence:**
  - `tasks.md:71-87` assigns schema, migration, generated scope, and seed work to Phase 1, while `tasks.md:277-290` assigns the same schema and migration paths to Phase 3.
  - `apps/api/src/modules/identity/identity.module.ts` is listed in Phases 2-4; `core.module.ts` and `app.module.ts` are listed in Phases 2 and 5; the mutation publisher is listed in Phases 2, 3, and 5.
  - The cleanup processor has no declared queue/scheduler registration path, and the migration acceptance criterion requiring a non-zero process outcome has no declared CLI runner or package script.
- **Required downstream criterion:** Assign each migration/schema change and each high-conflict module file to one phase or define an explicit additive sub-step and verification gate. Add the cleanup trigger and queue dependency to the Working Set. Define the migration command/runner that returns non-zero when the final report contains errors. A phase must not silently depend on a path owned by a later phase.

#### AR-009 - Prisma representation and database-only uniqueness need a drift contract

- **Classification:** CONDITION
- **State:** OPEN
- **Owner:** Prisma schema and migration owner
- **Decision:** continue after recording condition
- **Evidence:**
  - `design.md:533-551` models invitation idempotency and status indexes in Prisma, while the plan also requires a partial unique pending-email index that Prisma schema syntax does not express directly.
  - `design.md:553-557` defers optional-team composite relation representation to an implementation-time fallback, rather than declaring the exact Prisma relation and SQL constraint pair.
  - `packages/database/prisma/generators/tenant-scope/integrity.spec.ts:66-106` verifies generated model-field lists but does not verify manual partial-index preservation or composite foreign-key parity.
- **Required downstream criterion:** Define which indexes/constraints are Prisma-managed and which are intentionally SQL-managed, make generation/migration verification fail on drift, and specify the exact composite relation fields for every local relationship. Include a real Prisma schema validation and migration-diff check in Phase 1.

#### AR-010 - Legacy-user mapping needs a deterministic null-link policy

- **Classification:** CONDITION
- **State:** OPEN
- **Owner:** Identity migration owner
- **Decision:** continue after recording condition
- **Evidence:**
  - `spec.md:83-85,194-196` correctly requires `betterAuthUserId -> User.id` mapping and rejects a session without a local projection.
  - `tasks.md:474-497` requires Better-Auth ID migration and audit reporting but does not define how a legacy local `User` with `betterAuthUserId = null` is matched to a provider user, or whether such a user is quarantined permanently for the phase.
  - `packages/database/prisma/schema.prisma:169,177` keeps local email and provider ID uniqueness global, as recorded by ADR-003, which constrains a provider user that belongs to multiple organizations.
- **Required downstream criterion:** Define an explicit, auditable mapping policy for null links. Email-only heuristics must not silently attach identities. If the invariant is one local projection per Better-Auth user, enforce and report it; if provider users may belong to multiple tenants, reconcile the current global uniqueness constraints before accepting the projection model.

#### AR-011 - Shared dirty worktree creates SPEC-0027/SPEC-0028 and SDD-v3 scope contamination risk

- **Classification:** CONDITION
- **State:** OPEN
- **Owner:** Direct Apply/Verify scope owner
- **Decision:** continue after recording condition
- **Evidence:**
  - `git status --short` during this review reported modified shared files including `packages/database/prisma/schema.prisma`, generated tenant-scope artifacts, `apps/api/src/app.module.ts`, and `docs/sdd-workflow-guard.md`.
  - The same status reported untracked `openspec/changes/archive/2026-07-21-SPEC-0027-feature-flags/`, `openspec/changes/archive/2026-07-21-SPEC-0028-jobs-platform/`, and SDD-v3 architecture/recovery artifacts.
  - SPEC-0025 also changes the shared schema and generated scope artifacts, so regeneration can accidentally absorb future-spec models or recovery edits even when the implementation task is identity-only.
- **Required downstream criterion:** Capture a pre-Apply changed-path and content-hash manifest, preserve all pre-existing unrelated changes, and permit only the SPEC-0025 Working Set plus explicitly approved generated outputs. Verify that generated schema/scope diffs do not alter SPEC-0027, SPEC-0028, or SDD-v3 artifacts. Do not modify or consult recovery artifacts as part of this change.

### NON-BLOCKING

#### AR-NB-001 - Legacy provider-table writers remain outside the Phase 1 boundary

- **Classification:** NON-BLOCKING
- **State:** OPEN
- **Owner:** Future auth platform migration owner
- **Decision:** continue without refinement
- **Evidence:**
  - `apps/api/src/modules/auth/auth.service.ts:49-80` and `apps/api/src/modules/tenants/tenants.service.ts:27-130` still create Better-Auth provider users and sessions through direct SQL.
  - The SPEC-0025 Design limits its provider-ownership implementation to the Identity boundary and does not include those legacy services in its Working Set.
- **Risk:** The platform will temporarily have two provider-session ownership patterns. This does not block the scoped Identity bridge if the boundary is documented and the new Identity services never use those writers, but it must remain a separately bounded migration and must not be silently expanded into SPEC-0025.

#### AR-NB-002 - Current generated scope coverage is not proof of runtime isolation

- **Classification:** NON-BLOCKING
- **State:** OPEN
- **Owner:** Identity verification owner
- **Decision:** continue without refinement
- **Evidence:** `packages/database/prisma/generators/tenant-scope/generated/tenant-models.ts` already lists the current identity models, while the generator tests primarily validate list/schema consistency. Runtime isolation still depends on scoped-client behavior, composite constraints, and the required real tenant A/B doorbells.
- **Risk:** A green generator test alone could miss a service using `admin` or a relation query that bypasses tenant consistency. The planned doorbells and static Identity-path check must remain required evidence.

## Mandatory Downstream Acceptance Criteria

| ID | Criterion | Evidence required before Apply |
|---|---|---|
| DC-001 | Provider Prisma models support the exact Better-Auth v1.6.23 organization invitation and session flows without direct provider-table writes. | Provider integration tests for `getSession`, `createInvitation`, `acceptInvitation`, expiry, and active organization persistence. |
| DC-002 | Missing or invalid Host context and empty tenant IDs fail closed; no Identity path can obtain an unscoped client. | Middleware/guard tests, scoped-client fail-closed test, and all five Identity doorbells. |
| DC-003 | Existing local identity rows have a deterministic, audited migration path before composite constraints and required provider links become non-null. | Preflight report, populated consistent/inconsistent fixtures, migration SQL review, and rollback evidence. |
| DC-004 | Crashed invitation claims can be reconciled using a supported Better-Auth provider status boundary without local sessions or direct provider reads. | Provider-port contract, status transition matrix, and crash/restart tests. |
| DC-005 | RBAC permission grammar, seed roles, cache invalidation, mutation events, and required audit delivery form one tested contract. | Shared contract tests, role/membership/team mutation tests, queue failure tests, and tenant cache isolation doorbell. |
| DC-006 | IdentityModule is reachable through the approved composition graph with one guard/provider ownership path. | Nest module graph test and AppModule/CoreModule changed-path review. |
| DC-007 | Apply phases have non-overlapping ownership or explicit gates for shared schema/module files and declare cleanup/migration entry points. | Refined tasks Working Sets, phase summaries, queue registration evidence, and migration exit-code test. |
| DC-008 | SPEC-0027, SPEC-0028, and SDD-v3/recovery artifacts remain unchanged and outside the SPEC-0025 diff. | Pre-Apply and Verify changed-path/hash manifests. |

## Scope and Preservation

- Runtime code was not modified by this review.
- `spec.md`, `design.md`, and `tasks.md` were not modified by this review.
- The historical `architecture-review.md` was not modified. Its pre-review SHA-256 was `89ccbad3a166e62be4068ae3a1d9105f8c1d18869157b2f2c90adb62b0989dcd`.
- No Gentle-AI process, dispatcher, native review lifecycle, SDD dispatcher, commit, push, merge, release, or tag action was invoked.

## External References

- Better-Auth v1.6.23 organization plugin endpoints and provider schema: `https://github.com/better-auth/better-auth/blob/v1.6.23/packages/better-auth/src/plugins/organization/organization.ts`
- Better-Auth v1.6.23 invitation creation, acceptance, cancellation, and status authorization: `https://github.com/better-auth/better-auth/blob/v1.6.23/packages/better-auth/src/plugins/organization/routes/crud-invites.ts`
- Better-Auth v1.6.23 organization and session field definitions: `https://github.com/better-auth/better-auth/blob/v1.6.23/packages/better-auth/src/plugins/organization/schema.ts`

## Explicit Next Transition

The Direct transition is:

`Architecture Review -> Design Refinement`

This transition is required because AR-001 through AR-004 are open
`BLOCKER` findings. After Design Refinement, the Architecture Review must run
again. Conditions and non-blocking risks remain recorded and must not be
silently dropped.

## Structured Result

```yaml
status: REFINEMENT_REQUIRED
change: SPEC-0025-identity-platform
phase: Architecture Review
artifact: openspec/changes/SPEC-0025-identity-platform/architecture-review-direct.md
findings:
  - id: AR-001
    classification: BLOCKER
    state: OPEN
    decision: design-refinement
    evidence:
      - provider invitation model lacks expiresAt
      - provider session model lacks activeOrganizationId
      - Design excludes provider model changes
    next: Design Refinement
  - id: AR-002
    classification: BLOCKER
    state: OPEN
    decision: design-refinement
    evidence:
      - development tenant fallback matches /api/v1/tenant/identity
      - falsy forTenant input returns an unscoped client
    next: Design Refinement
  - id: AR-003
    classification: BLOCKER
    state: OPEN
    decision: design-refinement
    evidence:
      - required provider invitation link has no existing-row backfill policy
      - composite constraint preflight has no executable report/repair boundary
    next: Design Refinement
  - id: AR-004
    classification: BLOCKER
    state: OPEN
    decision: design-refinement
    evidence:
      - cleanup has no background-safe Better-Auth status read
      - direct provider reads and local sessions are forbidden
    next: Design Refinement
  - id: AR-005
    classification: CONDITION
    state: OPEN
    decision: continue
    evidence:
      - shared permission grammar conflicts with seed and evaluator wildcards
    next: Tasks
  - id: AR-006
    classification: CONDITION
    state: OPEN
    decision: continue
    evidence:
      - current AuditService silently skips missing queue delivery
    next: Tasks
  - id: AR-007
    classification: CONDITION
    state: OPEN
    decision: continue
    evidence:
      - CoreModule/AppModule and global guard/provider ownership are unresolved
    next: Tasks
  - id: AR-008
    classification: CONDITION
    state: OPEN
    decision: continue
    evidence:
      - schema, migration, module, and publisher paths are shared by phases
      - cleanup and migration entry points are undeclared
    next: Tasks
  - id: AR-009
    classification: CONDITION
    state: OPEN
    decision: continue
    evidence:
      - manual partial uniqueness and composite relation parity need a drift contract
    next: Tasks
  - id: AR-010
    classification: CONDITION
    state: OPEN
    decision: continue
    evidence:
      - null Better-Auth user-link mapping policy is not deterministic
    next: Tasks
  - id: AR-011
    classification: CONDITION
    state: OPEN
    decision: continue
    evidence:
      - shared schema/generated/app paths overlap unrelated SPEC-0027, SPEC-0028, and SDD-v3 worktree changes
    next: Tasks
  - id: AR-NB-001
    classification: NON-BLOCKING
    state: OPEN
    decision: continue
    evidence:
      - legacy provider-table writers remain outside this bounded change
    next: Tasks
  - id: AR-NB-002
    classification: NON-BLOCKING
    state: OPEN
    decision: continue
    evidence:
      - generated scope coverage is not runtime isolation proof
    next: Tasks
```
