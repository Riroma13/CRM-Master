# Repeat Architecture Review: SPEC-0025 - Identity & Organization Platform

status: REFINEMENT_REQUIRED
verdict: REFINEMENT_REQUIRED
change: SPEC-0025-identity-platform
phase: Architecture Review (repeat)
artifact: `openspec/changes/SPEC-0025-identity-platform/architecture-review-direct-repeat.md`
review_kind: independent SDD-Direct repeat review
skill_resolution: paths-injected
decision: design-refinement
next: Design Refinement
review_date: 2026-07-25

## Verdict

**REFINEMENT_REQUIRED.** The blocker refinement materially improves the package
and safely bounds the Host fallback, pending-only invitation cleanup, phase
ownership, permission grammar, audit outcomes, constraint drift, and dirty
scope. Apply is still unsafe for three independently demonstrated reasons:

1. The declared Better-Auth schema-generation boundary cannot execute against
   this repository as written and has not produced a reconciled provider-schema
   artifact.
2. The declared typed provider port cannot validate legacy provider-user
   mappings because it has no provider member/user lookup or approved migration
   authorization context.
3. ADR-0025 is explicitly required for the schema decision but does not exist
   and is outside the declared Working Set.

No runtime code, migration, package script, dispatcher state, or destructive
operation was changed by this review.

## Review Basis

The review compared the refined `spec.md`, `design.md`, `tasks.md`, and
`design-refinement.md` with:

- `apps/api/src/common/auth.ts`, `auth-client.provider.ts`, and
  `apps/api/package.json`;
- `packages/database/prisma/schema.prisma`, the historical identity migration,
  generated tenant-scope output, the scope generator, and package scripts;
- `PrismaService`, `createPrismaClient`, its helpers, tenant middleware, the
  existing Better-Auth and tenant guards, Identity services/tests, and the
  current CoreModule/AppModule/AuditModule graph;
- Better-Auth v1.6.23 CLI and organization-plugin source; and
- NestJS request-lifecycle documentation for guard ordering.

The historical evidence remains unchanged:

| Artifact | SHA-256 before and after review |
|---|---|
| `architecture-review.md` | `89ccbad3a166e62be4068ae3a1d9105f8c1d18869157b2f2c90adb62b0989dcd` |
| `architecture-review-direct.md` | `f9b1c738ef84684a441124cc6ebd57d02d7e80f2bedb9bc008c59dc6414a53c1` |

## AR-001..AR-011 Disposition

| Finding | Repeat disposition | Evidence-based result |
|---|---|---|
| AR-001 provider schema fields | OPEN through fresh AR-012 | Provider ownership is stated, but generation is not executable/reconciled. |
| AR-002 Host/scope fail-open | CLOSED with Apply evidence required | The refined contract assigns the middleware, guard, and `forTenant()` boundary and requires negative tests. |
| AR-003 existing data/backfill | OPEN through fresh AR-013 | Manifest/report/idempotency rules exist, but provider validation for mappings is not executable. |
| AR-004 stale claims | CLOSED with Apply evidence required | Better-Auth pending-only lookup and retryable uncertainty are concretely bounded. |
| AR-005 permission grammar | CONDITION | Grammar and rejection rules are explicit; parser, seed, evaluator, and persistence tests remain required. |
| AR-006 audit outcomes | CONDITION | Outcome names and committed-pending behavior are explicit; delivery implementation and retry identity remain required. |
| AR-007 module ownership | CONDITION | Core ownership and AppModule removal are explicit; the executable provider/export and guard-order graph remains to be proven. |
| AR-008 phase ownership | CLOSED with phase-summary evidence required | The refined path-owner table has one owner per listed path and explicit Phase 1-5 dependencies. |
| AR-009 Prisma/SQL drift | CONDITION | Ownership categories and a drift test are declared; the concrete constraint inventory is still absent. |
| AR-010 null provider IDs | CONDITION through fresh AR-013 | Explicit manifest/no-email-match policy is safe, but provider-side validation context is missing. |
| AR-011 dirty scope | CONDITION | Hash protection is required, but the exact manifest artifact/schema is not declared. |

Closed findings are not reopened as historical evidence. The OPEN
dispositions above are caused by the fresh evidence recorded below.

## Fresh Findings

### AR-012 - Better-Auth provider schema generation is not executable or reconciled

- **Classification:** `BLOCKER`
- **State:** `OPEN`
- **Owner:** Phase 1 provider-schema/database owner
- **Decision:** `design-refinement`
- **Evidence:**
  - `apps/api/src/common/auth.ts:6-24` exports `createAuth(prisma)`, not a
    Better-Auth config instance or an `auth`/`default` options export that the
    CLI can load.
  - The declared command in `design.md:341-344` and `tasks.md:192-194` is
    `pnpm exec auth generate --adapter prisma`. Better-Auth v1.6.23's
    `packages/cli/src/commands/generate.ts` still calls `getConfig()` even when
    `--adapter` is supplied, defaults its working directory to the process
    directory, and defaults its output to `./prisma/schema.prisma`.
  - The repository schema is
    `packages/database/prisma/schema.prisma`, while the current auth source is
    under `apps/api/src/common/`. No `--cwd`, `--config`, or `--output` is
    declared, and no generated provider-schema artifact or hash is part of the
    Working Set.
  - The current provider models at
    `packages/database/prisma/schema.prisma:62-161` are lowercase and mapped to
    `ba_*` tables. Better-Auth's v1.6.23 Prisma generator capitalizes generated
    model names and only augments an exact existing model name. The current
    schema also has `organization.slug String?` and `metadata Json?`, lacks
    `invitation.expiresAt`, and lacks `session.activeOrganizationId`.
  - Better-Auth v1.6.23 `organization/schema.ts` and the Prisma generator are
    the provider source of truth; manually adding only the two missing fields
    would not prove compatibility with the complete generated model boundary.
- **Why Apply is unsafe:** The prescribed generator either fails to load a
  config or writes/produces a schema outside the canonical database path. If an
  implementer hand-merges the expected fields, duplicate model names, changed
  nullability/types, relation fields, or physical mappings can produce a
  Prisma schema/migration that conflicts with the existing `ba_*` tables or
  provider migration history. This forces the forbidden undocumented adapter
  mapping or direct provider-table workaround.
- **Required disposition:** Add an executable v1.6.23 generator configuration
  and exact `cwd/config/output` contract, or declare a reviewed generated
  provider-schema artifact with its source/version hash. Prove that the full
  generated provider schema reconciles with the existing Prisma model names,
  `@@map` values, field types, nullability, relations, and existing provider
  rows. Add the provider migration diff and an existing-row preflight to the
  gate. Stop before Apply if reconciliation is not exact.
- **External references:**
  - Better-Auth v1.6.23 CLI generate command:
    `https://github.com/better-auth/better-auth/blob/v1.6.23/packages/cli/src/commands/generate.ts`
  - Better-Auth v1.6.23 Prisma generator:
    `https://github.com/better-auth/better-auth/blob/v1.6.23/packages/cli/src/generators/prisma.ts`
  - Better-Auth v1.6.23 organization schema:
    `https://github.com/better-auth/better-auth/blob/v1.6.23/packages/better-auth/src/plugins/organization/schema.ts`

### AR-013 - Legacy provider-user mapping has no executable typed validation boundary

- **Classification:** `BLOCKER`
- **State:** `OPEN`
- **Owner:** Phase 2 provider-port and Phase 5 migration owners
- **Decision:** `design-refinement`
- **Evidence:**
  - `design.md:717-730` declares `AuthProviderPort` methods for sessions,
    invitation creation/read/acceptance, pending invitations, and cancellation,
    but no method to list or validate organization members or provider users.
  - `design.md:900-905` requires existing provider IDs and explicit null-link
    mappings to be validated against the exact provider organization.
  - Better-Auth v1.6.23 `listMembers` requires request headers and an
    authenticated organization-member context. `listUserInvitations` is a
    server-side pending-invitation lookup and cannot validate arbitrary user or
    membership mappings.
  - The current `migrate-users.script.ts:77-92` reads
    `prisma.admin.member` directly. The refined contract forbids provider
    Prisma-model access, so the declared replacement has no concrete supported
    operation or authorization context.
- **Why Apply is unsafe:** Backfill cannot prove that a manifest provider user
  belongs to the tenant's Better-Auth organization without either retaining
  the forbidden provider-table read or fabricating a provider session. Either
  path can attach a local user to the wrong organization. Leaving all mappings
  unresolved makes the migration permanently non-zero, while guessing by email
  violates the explicit null-link safety rule.
- **Required disposition:** Add a typed provider operation for provider-user /
  organization-member validation and define its approved server-side
  authorization context, secret source, tenant/organization comparison, and
  failure behavior. Define the mapping-manifest schema, content hash,
  duplicate/cross-tenant rejection, audit event, quarantine disposition, and
  non-zero exit behavior. Add populated fixtures proving valid, missing,
  ambiguous, cross-tenant, and provider-unavailable mappings without direct
  provider Prisma access.
- **External reference:**
  `https://github.com/better-auth/better-auth/blob/v1.6.23/packages/better-auth/src/plugins/organization/routes/crud-members.ts`

### AR-014 - Schema Apply lacks the required ADR-0025 artifact

- **Classification:** `BLOCKER`
- **State:** `OPEN`
- **Owner:** Maintainer and schema architecture owner
- **Decision:** `design-refinement`
- **Evidence:**
  - `spec.md:359-369` and `design.md:470-483` explicitly require a new
    `ADR-0025` for the Identity schema, provider boundary, projection
    uniqueness, RBAC, invitations, migration/backfill, audit, and retention.
  - No `docs/architecture/adr/0025-*.md` exists in the repository.
  - The `tasks.md` Working Set contains schema and migration paths but no ADR
    path. The design also states that ADR-0025 is a prerequisite for schema
    Apply.
  - `AGENTS.md` makes an ADR or an existing ADR reference mandatory for Prisma
    schema changes; ADR-0002 and ADR-0003 do not decide the new Identity schema
    and migration constraints.
- **Why Apply is unsafe:** Schema Apply would violate the repository's
  non-negotiable architecture rule, or it would require an unplanned path and
  an unreviewed decision during Apply. The provider migration and local
  uniqueness/relationship changes cannot be authorized from the current ADR
  set.
- **Required disposition:** Create and approve the ADR before Tasks Review /
  Apply, or explicitly prove that the existing ADRs fully cover the decision.
  If a new ADR is required, add its canonical path and acceptance gate to the
  package Working Set without modifying it in this review.

## Conditions

The following findings do not independently stop the next phase once the three
blockers are resolved, but they are mandatory acceptance criteria.

### AR-015 - Core/App module graph and guard order need executable proof

- **Classification:** `CONDITION`
- **Owner:** Phase 5 composition owner
- **Evidence:** `app.module.ts:22-54` currently imports `IdentityModule` and
  registers `PermissionGuard` globally. `core.module.ts:28-55` does not import
  Identity. `PermissionGuard:21-29` reads `request.user` before evaluating
  identity metadata. NestJS runs global guards before controller and route
  guards. The refined package says the Identity session guard precedes the
  permission guard but does not declare whether both are global, both are
  controller/route-scoped, or how the provider/export path makes that order
  executable.
- **Required evidence:** One graph in which Core owns Identity, AppModule has
  no direct feature import, the session guard runs before Identity permission
  evaluation for cookie and bearer requests, legacy permission metadata is
  isolated, and exactly one Identity guard/provider instance is visible. Add a
  Nest module/guard-order integration test.
- **Reference:**
  `https://docs.nestjs.com/faq/request-lifecycle#guards`

### AR-016 - Scoped-client raw and operation coverage is incomplete

- **Classification:** `CONDITION`
- **Owner:** Phase 1 scope owner
- **Evidence:** `packages/database/src/index.ts:93-108` blocks
  `$queryRaw`, `$queryRawUnsafe`, and `$executeRaw`, but not
  `$executeRawUnsafe`. The operation allowlist at `49-85` also does not
  explicitly handle Prisma bulk-return operations available in the locked
  Prisma 6.19.3 toolchain. The current factory still returns an unscoped
  client for empty input at `36-45`; the refinement assigns this fix to Phase
  1 but does not enumerate every bypass in its acceptance matrix.
- **Required evidence:** Invalid scope values fail before client creation;
  every supported read/write/bulk operation injects the tenant predicate or is
  rejected; all raw SQL methods are rejected on scoped clients; and tests prove
  no scoped operation can reach `admin` or an unscoped transaction.

### AR-017 - Provider/local role and organization mapping is underspecified

- **Classification:** `CONDITION`
- **Owner:** Phase 2/3 Identity provider owner
- **Evidence:** Better-Auth `createInvitation` accepts provider organization roles
  such as `admin`, `member`, and `owner`, while the local contract accepts a
  `roleId` and the current seed includes `manager` and `viewer`. No mapping or
  rule stating that local RBAC is authoritative is specified. The local
  `Tenant.betterAuthOrganizationId` is nullable in the current schema, but the
  provider call contract does not state the fail-closed behavior for a missing
  mapping.
- **Required evidence:** A tested provider/local role mapping, explicit local
  authorization authority, and rejection before any provider call when the
  tenant has no validated provider organization.

### AR-018 - Prisma/SQL drift allowlist needs concrete constraint inventory

- **Classification:** `CONDITION`
- **Owner:** Phase 1 schema owner
- **Evidence:** The old identity migration creates single-column foreign keys
  and `teams_depth_check` at
  `packages/database/prisma/migrations/20260720230000_add_identity/migration.sql:96-104`.
  The refined design requires composite tenant relationships and a lower and
  upper depth bound, but the allowlist does not name the old constraints to
  drop, the replacement constraint names, or the provider-generated SQL delta.
- **Required evidence:** An exact drop/replace sequence, named Prisma-managed
  versus SQL-managed constraints, a migration diff allowlist, and a real
  applied-database parity test.

### AR-019 - Migration report, quarantine, audit, and command artifacts need exact paths

- **Classification:** `CONDITION`
- **Owner:** Phase 5 migration owner
- **Evidence:** `apps/api/package.json` currently has no Identity migration
  commands, and `packages/database/package.json:16` points `db:seed` at a
  `src/seed.ts` that does not exist. The design names preflight/backfill,
  quarantine, reports, and scope gates, but does not name the quarantine input,
  report artifact schema/path, or the exact command that returns non-zero after
  unresolved errors.
- **Required evidence:** Read-only preflight, deterministic manifest and
  quarantine input, redacted report under a declared evidence path, required
  audit result, rerun/no-op proof, and command exit-code tests.

### AR-020 - Audit retry identity and failure ordering need a complete contract

- **Classification:** `CONDITION`
- **Owner:** Phase 2 Audit/Identity publisher owner
- **Evidence:** Current `AuditService.log()` remains optional and silently skips
  a missing queue at `audit.service.ts:102-115`. The refinement introduces a
  required path and `committed_audit_pending`, but does not state the exact
  BullMQ `jobId`/event-ID relation or the outcome when event publication or
  cache purge fails after local commit.
- **Required evidence:** Deterministic event/job ID, no mutation replay on audit
  retry, explicit success/failure/committed-pending mapping, cache purge before
  the next authorization decision, and preservation of legacy optional audit
  behavior.

### AR-021 - Scope manifest format and protected-path set are not declared

- **Classification:** `CONDITION`
- **Owner:** Phase 5 Direct scope owner
- **Evidence:** `design.md` and `tasks.md` require pre-Apply/post-Verify
  changed-path and content-hash manifests, but no filename, JSON schema, or
  exact generated-output allowlist is in the Working Set. The current worktree
  contains dirty shared schema, generated scope, AppModule, workflow, and
  SPEC-0027/SPEC-0028/SDD-v3 artifacts.
- **Required evidence:** A declared manifest artifact containing pre-existing
  paths/hashes, approved paths, generated-output source hashes, both historical
  review hashes, and a post-Verify comparison that fails on unapproved drift.

### AR-022 - Provider version and Host trust assumptions need explicit pins

- **Classification:** `CONDITION`
- **Owner:** Phase 1 provider/tenant-boundary owner
- **Evidence:** `apps/api/package.json:14,25` declares
  `@better-auth/prisma-adapter` as `^1.6.23` and `better-auth` as `^1.0.0`,
  while the design requires v1.6.23 behavior. The current tenant resolver
  extracts only the first Host label at
  `tenant-resolve.middleware.ts:88-93` and does not validate the configured
  CRM base domain; the refined tests do not include an untrusted host suffix or
  missing provider-organization mapping.
- **Required evidence:** Exact package-version provenance for schema/API tests,
  configured base-domain/forwarded-host validation, reserved/apex/localhost
  rejection, and fail-closed behavior for a tenant without a provider
  organization mapping.

## Residual Risks

- Legacy direct Better-Auth provider-table writers in `auth` and `tenants`
  remain outside this bounded change. They are a documented non-blocking
  coexistence risk only if the new Identity boundary never calls them.
- Better-Auth cannot prove whether an absent invitation is accepted, canceled,
  or expired through the pending-only lookup. Keeping the local claim in
  `processing` with retry/backoff and alerting is safe but can require a manual
  forward fix.
- Generated tenant-scope coverage is not runtime isolation proof; real tenant A/B
  doorbells remain mandatory.
- The worktree is already dirty with unrelated feature, recovery, and generated
  changes. No such changes were reverted or modified by this review.

## Required Next Transition

The Direct transition is:

`Architecture Review (repeat) -> Design Refinement`

Design Refinement must close AR-012, AR-013, and AR-014. The conditions remain
mandatory evidence for Tasks Review and do not authorize Apply by themselves.
After refinement, run another independent Direct Architecture Review. Do not
run Tasks Review or Apply from this artifact while any blocker is open.

## Structured Result

```yaml
status: REFINEMENT_REQUIRED
change: SPEC-0025-identity-platform
phase: Architecture Review (repeat)
artifact: openspec/changes/SPEC-0025-identity-platform/architecture-review-direct-repeat.md
findings:
  - id: AR-012
    classification: BLOCKER
    state: OPEN
    decision: design-refinement
    evidence:
      - Better-Auth CLI config/cwd/output are not executable as declared
      - generated provider model/schema reconciliation is absent
      - current provider models and required fields do not match the proven generated boundary
    next: Design Refinement
  - id: AR-013
    classification: BLOCKER
    state: OPEN
    decision: design-refinement
    evidence:
      - AuthProviderPort has no typed provider-user/member validation operation
      - migration has no approved provider authorization context
      - current replacement path would require forbidden provider-table access or guessing
    next: Design Refinement
  - id: AR-014
    classification: BLOCKER
    state: OPEN
    decision: design-refinement
    evidence:
      - ADR-0025 is required by the package but absent
      - no ADR path is declared in the Working Set
    next: Design Refinement
  - id: AR-015
    classification: CONDITION
    state: OPEN
    decision: continue
    evidence:
      - Core/App ownership and session-before-permission guard order need an executable graph test
    next: Tasks Review
  - id: AR-016
    classification: CONDITION
    state: OPEN
    decision: continue
    evidence:
      - scoped raw SQL and Prisma bulk-operation coverage is incomplete
    next: Tasks Review
  - id: AR-017
    classification: CONDITION
    state: OPEN
    decision: continue
    evidence:
      - provider/local role mapping and missing organization behavior are unspecified
    next: Tasks Review
  - id: AR-018
    classification: CONDITION
    state: OPEN
    decision: continue
    evidence:
      - Prisma/SQL constraint names and replacement allowlist are not concrete
    next: Tasks Review
  - id: AR-019
    classification: CONDITION
    state: OPEN
    decision: continue
    evidence:
      - migration/report/quarantine/command artifact paths and exit tests are not concrete
    next: Tasks Review
  - id: AR-020
    classification: CONDITION
    state: OPEN
    decision: continue
    evidence:
      - required audit retry identity and post-commit failure ordering need proof
    next: Tasks Review
  - id: AR-021
    classification: CONDITION
    state: OPEN
    decision: continue
    evidence:
      - scope-manifest filename/schema and generated-output allowlist are absent
    next: Tasks Review
  - id: AR-022
    classification: CONDITION
    state: OPEN
    decision: continue
    evidence:
      - package version is a range and Host/base-domain assumptions are not pinned
    next: Tasks Review
```
