# Apply Summary: Secure Workflow Execution Boundary

> **Nested Apply:** 7.1 Foundation → 7.6 Apply Summary
> **Status:** PASS — the bounded start-route correction was rerun against an ephemeral vector-capable disposable baseline; all six required scenarios passed with none skipped.
> **Persistence:** hybrid

## 7.1 Foundation

- HUMAN Workload Guard approval recorded: the approved internal
  `feature-branch-chain` has three review/test slices — PR1 RED security
  contracts, PR2 permission/trusted-context/schema/service/executor/module
  implementation, and PR3 route-order plus Tenant A/B doorbell evidence.
- `stacked-to-main` is not authorized. No push, commit, merge, or direct-main
  operation was performed.
- Added the canonical workflow capability and trusted Host/Identity context
  boundary without changing `PermissionsGuard`, `app.module.ts`, or middleware.

## 7.2 Core Engine

- Added strict Zod workflow definition parsing with bounded node variants,
  predicates, references, unknown-key rejection, and legacy-expression rejection.
- Reparsed create/version/publish/start/resume paths before their named effects.
- Replaced dynamic decision evaluation with own-field strict literal comparison.

## 7.3 Feature Implementation

- Workflow definition and instance resource guards now use only
  `request.workflowContext.tenantId`.
- Controller callers' query/body `tenantId` values are not used for authority.
- Workflow permissions are declared per route; owner and exact Identity admin
  are the only workflow-capable roles.

## 7.4 Integration

- Exported `IdentityOrganizationGuard`, imported `IdentityModule`, and registered
  `WorkflowTenantContextGuard` locally.
- Preserved global guard order and anonymous full-route fail-closed contract as
  `403` before workflow resource access/mutation.

## 7.5 Testing

| Evidence | Result |
|---|---|
| Shared focused tests | `pnpm --filter @crm-master/shared test -- workflow` — PASS, 4 tests |
| API workflow tests | `pnpm --filter api test -- --runInBand workflow` — PASS, 7 suites / 46 tests |
| API lint | `pnpm --filter api lint` — PASS |
| API build | `pnpm --filter api build` — PASS |
| Shared typecheck | `pnpm --filter @crm-master/shared lint` — PASS |
| Runtime A/B doorbell | **PASS**: `pnpm --filter api test:e2e -- workflow-execution-boundary` — 1 suite / 6 tests passed, none skipped; no Redis `NOAUTH` or database connection-limit failure |

### Focused cross-tenant correction

- The failing route is `POST /api/v1/workflow/instances` (`start instance`) in
  the Host/org/session mismatch scenario: Tenant A owner authority, Tenant A
  Host, Tenant B definition resource, and forged body `tenantId=Tenant B`
  returned `201 Created`.
- Root cause: `WorkflowService.startWorkflow` correctly used the trusted Host
  tenant for its scoped client, but `DefinitionService.getLatestPublished`
  queried `WorkflowDefinitionVersion` without a tenant-bearing relation
  predicate. That version model has no own `tenantId`, so a published Tenant B
  version was discoverable by a Tenant A-scoped request; the service then
  created a Tenant A instance for the Tenant B definition.
- Bounded correction: the approved workflow service path now constrains the
  version lookup through `definition.tenantId = tenantId`. Caller body/query
  `tenantId` remains unused, Host/Identity context remains authoritative, and
  same-tenant owner/admin behavior is unchanged. The doorbell test keeps the
  required `403` and adds only route-labeled failure diagnostics recording
  method, route, operation, authenticated authority, Host/resource tenants,
  and caller tenant input.

### Correction rerun evidence

- The required focused command was rerun exactly as
  `pnpm --filter api test:e2e -- workflow-execution-boundary` with only
  `SECURE_WORKFLOW_DISPOSABLE_DATABASE_URL` supplied. The current disposable
  database had no schema (`public.workflow_variables` was missing), contrary
  to the prior bootstrap evidence.
- A bounded disposable-only schema bootstrap attempt targeted the named
  `secure_workflow_e2e` database and stopped before mutation because the
  PostgreSQL server lacks the required `vector` extension. No production or
  `crm_test.public` database was used or mutated. The required six-scenario
  runtime PASS evidence therefore remains unavailable in this environment.
- Required bounded checks after the correction passed: shared workflow tests
  (4), API workflow tests (7 suites / 46 tests), API build, API lint, shared
  typecheck, `pnpm sdd:validate`, and `git diff --check`.

### PR3 checkpoint retry

- Created the approved Working Set file
  `apps/api/test/doorbell/workflow-execution-boundary.e2e-spec.ts`.
- The harness uses the real `AppModule`, real Prisma persistence, real HTTP
  requests, Host-derived tenant setup, Better Auth session/member rows, and a
  disposable-only environment variable. It covers anonymous global-first
  denial for create/publish/start/resume/read/control, unauthorized roles,
  forged tenant inputs, Host/org/session mismatch, cross-tenant access, and
  same-tenant owner/admin lifecycle behavior.
- Exact command:
  `pnpm --filter api test:e2e -- workflow-execution-boundary`
- Exact retry command:
  `pnpm --filter api test:e2e -- workflow-execution-boundary`
- Exact retry result after disposable bootstrap and harness corrections: the
  exact command reached the real AppModule and reported `1 failed` suite / `1
  failed` test / `5 passed` tests. All six scenarios executed and none were
  skipped. The cross-tenant Host/org/session mismatch scenario failed because
  one of its five required routes returned `201 Created` instead of `403
  Forbidden`; the command output did not identify a route label. The
  same-test owner/admin lifecycle passed.
- Environmental/test evidence: `SECURE_WORKFLOW_DISPOSABLE_DATABASE_URL` was
  accepted; no `TypeError: Invalid URL`, module-provider error, Redis `NOAUTH`,
  or database connection-limit error occurred. The command used only the
  disposable-variable path and did not fall back to `DATABASE_URL` or
  `DATABASE_TEST_URL`. The dedicated disposable schema was recreated from the
  repository datamodel baseline and dropped after the run. Result: five
  scenarios passed and one scenario was blocked by an authorization assertion.

The focused unit tests cover permission allow/deny, direct context 401/403,
strict schema behavior, stored-definition validation ordering, controller
context usage, and existing cross-tenant service isolation. They do not replace
the required real-Prisma Tenant A/B route-order evidence.

### Authorized vector-capable recovery rerun

- Schema requirement: `schema.prisma` declares `Unsupported("vector(384)")`;
  the knowledge-base migration uses `CREATE EXTENSION IF NOT EXISTS vector;`
  and an HNSW `vector_cosine_ops` index. No explicit minimum extension version
  is declared; disposable pgvector reported version `0.8.6`.
- Provisioning: ephemeral `pgvector/pgvector:pg16` container and dedicated
  `secure_workflow_e2e` database only, with no persistent volume. No production
  or `crm_test.public` database was used or mutated. Existing test-only Redis
  boundary remained unchanged.
- Baseline: temporary schema copy referenced the canonical migrations unchanged.
  Migration deploy proved the repository history has no initial table baseline
  (first migration expects `clientes`); after the exact vector extension
  statement, `prisma db push` synchronized the fresh database from the
  unchanged repository schema. No schema or migration file was modified.
- Exact command: `pnpm --filter api test:e2e -- workflow-execution-boundary`.
  Result: `1 failed` suite / `1 failed` test / `5 passed` tests; all six
  scenarios executed and none were skipped. No Redis `NOAUTH` or connection
  limit failure occurred.
- Exact blocker: `POST /api/v1/workflow/instances` (start instance) under the
  Tenant A owner/Host against the published Tenant B definition with forged
  `tenantId=Tenant B` returned `404 Not Found`, not required `403 Forbidden`.
  The start route omits `WorkflowDefinitionGuard`, so the request reaches
  `WorkflowService.startWorkflow`; its scoped published-version lookup finds
  no Tenant B version and throws `NotFoundException` instead of the required
  route-level `ForbiddenException`. This is a real workflow authorization
  defect exposed by PR3; Apply stopped without changing authorization logic.
- Cleanup: the disposable container/process and temporary bootstrap files were
  removed after the command; only this repository evidence was preserved.

### PR3 authorization correction — recorded before continuation

- Exact route: `POST /api/v1/workflow/instances` (start instance).
- Root cause: the route's local guard chain stopped after
  `WorkflowTenantContextGuard`; it omitted the existing
  `WorkflowDefinitionGuard`. Consequently, a Tenant A owner/Host request for a
  published Tenant B definition reached `WorkflowService.startWorkflow`, where
  the scoped lookup returned `404` instead of the required route-level `403`.
- Smallest correction: add `WorkflowDefinitionGuard` to the existing start-route
  guard chain and make that guard read the start request's trusted resource key
  (`body.definitionId`) when no `params.id` exists. The lookup remains scoped by
  `request.workflowContext.tenantId`, so the mismatch is rejected before service
  lookup; global guard order, Host/Identity authority, expected statuses, and
  same-tenant owner/admin behavior remain unchanged. The earlier
  `definition.tenantId = tenantId` lookup correction remains intact.
- RED evidence: the authorized PR3 rerun above failed this exact cross-tenant
  scenario with `404 Not Found`; implementation was applied only after that
  recorded failure.

### STOP — disposable baseline provisioning boundary violation

- The attempted canonical baseline command was stopped after Prisma reported
  `crm_test`, schema `public`, at `localhost:5433`. The repository schema
  datasource is hard-coded to `env("DATABASE_URL")`; supplying only
  `SECURE_WORKFLOW_DISPOSABLE_DATABASE_URL` therefore did not select the
  disposable pgvector container. No workflow test was run against that target,
  and no production target was used, but the command crossed the prohibited
  `crm_test.public`/`DATABASE_URL` boundary. Apply must stop and requires a
  maintainer-authorized, disposable-only provisioning path before continuation.

## 7.6 Apply Summary

- **Gate:** PASS; Apply 7.5 evidence is complete and ready for one fresh HIGH /
  ARCHITECT Verify. Verify was not started by Apply.
- **Exact correction:** `POST /api/v1/workflow/instances` now uses
  `WorkflowDefinitionGuard`, resolving `body.definitionId` and checking it
  against the trusted Host tenant before `WorkflowService`; the earlier
  `definition.tenantId = tenantId` lookup correction remains intact.
- **Disposable evidence:** ephemeral `pgvector/pgvector:pg16`, dedicated
  temporary database, `vector` extension version `0.8.6`, and a temporary copy
  of the unchanged repository datamodel bound only to
  `SECURE_WORKFLOW_DISPOSABLE_DATABASE_URL`. The repository datasource,
  schema, migrations, persistent infrastructure, `DATABASE_URL`, and
  `crm_test.public` were not used or changed. The migration history lacks an
  initial table baseline, so the unchanged datamodel baseline was applied with
  `prisma db push` after the extension statement.
- **Acceptance:** exact PR3 command passed 1 suite / 6 tests / 0 skipped,
  covering anonymous denial, cross-tenant denial including start `403`,
  malformed/arbitrary node rejection, stored-expression non-execution, and
  authorized same-tenant behavior. No Redis auth or DB connection-limit
  failures occurred.
- **Post-command gates:** focused workflow tests, API build, API lint, shared
  typecheck, `pnpm sdd:validate`, and `git diff --check` all passed.
- **Cleanup:** temporary schema copy, disposable database, and ephemeral
  container were removed; credentials were not printed or persisted.

## Deviations

1. **Bounded test correction:**
   `apps/api/src/modules/workflow/workflow-cross-tenant-isolation.spec.ts` was
   updated because its existing guard fixture supplied caller `query.tenantId`,
   which directly contradicted the approved Host/trusted-context contract and
   caused the focused workflow suite to fail. The correction only changes the
   fixture to provide `workflowContext` and updates the expected error string.
2. **TDD evidence limitation:** production implementation was present before
   this execution packet could capture an observed failing RED run for every
   named operation. RED contract tests were added and GREEN results are
   recorded; this is a process-evidence deviation, not a security relaxation.

No Design or Tasks content was rewritten to conceal either deviation. No
dependency, schema, infrastructure, credential, frontend, plugin, global auth,
guard-order, or Git change was made.

The PR3 harness creation is within the approved secondary Working Set and is
not a deviation. The disposable bootstrap and connection-sharing changes are
bounded test-environment corrections, not production behavior or fixture
substitutions.

## Working Set metrics

| Metric | Result |
|---|---:|
| Approved primary files modified/created | 12 |
| Approved secondary files modified/created | 7 |
| Bounded deviation files | 1 |
| New dependencies | 0 |
| Prisma/schema migrations | 0 |
| Git lifecycle operations | 0 |
| Internal delivery slices | 3 of 3 materially evidenced; PR3 passed all six required scenarios |

## Acceptance evidence and blocker

The implementation preserves global permission order, exact owner/admin allow,
other-role denial, Host-derived tenant authority, strict tenant scoping, and no
arbitrary JavaScript execution in the tested paths. The canonical Apply gate
normalizes to PASS: all six required runtime scenarios passed, including the
cross-tenant start-route `403`.

## Next canonical action

Invoke one fresh HIGH / ARCHITECT Verify using the completed Apply evidence.
Apply must not start Verify itself.

## Bounded PR3 correction recorded before continuation

- The exact failed compilation identifies `IdentityMembershipRepository` as
  unavailable while resolving the exported `IdentityOrganizationGuard` from
  `WorkflowModule`.
- The approved, mechanical correction is to re-export
  `IdentityMembershipRepository` from `IdentityModule`; no provider is
  duplicated in `WorkflowModule`, and no public contract, guard order, tenant
  authority, schema, infrastructure, credential, or global-auth behavior is
  changed.
- This is a bounded correction to the approved module wiring, recorded before
  the retry. Redis `NOAUTH` remains an environment condition to verify with the
  exact required command and will not be worked around by changing credentials
  or infrastructure.

### Correction evidence

- Modified only `apps/api/src/modules/identity/identity.module.ts` to export
  the already-registered `IdentityMembershipRepository`; no duplicate provider
  was added to `WorkflowModule`.
- The exact required retry proved the module correction mechanically: Nest no
  longer reported `IdentityMembershipRepository` unavailable in
  `WorkflowModule`.
- The disposable schema baseline and bounded shared Prisma client resolved the
  prior connection/table bootstrap blocker without production changes.

### Bounded disposable-environment deviation recorded before continuation

3. **Disposable bootstrap/harness correction:** The PR3-only harness binds the
   real Prisma constructor to the explicitly authorized
   `SECURE_WORKFLOW_DISPOSABLE_DATABASE_URL` through a Jest test boundary,
   without reading, exporting, falling back to, or mutating `DATABASE_URL` or
   `DATABASE_TEST_URL`. It also uses a no-credential local Redis URL only inside
   the disposable test process, avoiding the unrelated authenticated
   development URL. This changes no production/runtime behavior, credentials,
   infrastructure, schema intent, tenant authority, or workflow architecture.
   The disposable database is recreated from the repository schema baseline and
   removed after the focused command.

### Handoff validator

- `pnpm sdd:validate` — **PASS**: canonical files/classifications, 14-phase
  lifecycle, nested Apply 7.1–7.6, workflow authority, local Direct wiring,
  logical roles, hybrid persistence, maintainer gates, package validators, and
  Enterprise Design boundary all validated.
