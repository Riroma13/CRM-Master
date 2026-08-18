# Apply 7.6 Summary: secure-public-api-tenant-binding

> Nested Apply: 7.6 Apply Summary
> Historical initial status: BLOCKED — implementation complete, required doorbell evidence unavailable
> Delivery: Chained PR slices, `feature-branch-chain`
> Executor: MID / BUILDER — project-local Direct wiring

> **Current status: PASS — Apply 7.5 correction closed the runtime blocker**

## 7.6.1 Checkpoint

Consumed the approved refined Design, refined Tasks, fresh PASS Tasks Review,
PASS Workload Guard with HUMAN Chained PR approval, and Apply 7.1–7.5 evidence.
No Verify, Archive, Health Report, Repository Ready, or Git lifecycle operation
was started.

## Orchestrator-owned Direct Fix for V-001

After the first BLOCKED Verify, the one authorized Direct Fix changed only the
doorbell fixture/assertion file and canonical Apply evidence. The corrected
doorbell seeds actual Tenant A/B workflow instances and documents in a
disposable PostgreSQL database, retrieves Tenant A resources successfully, and
proves Tenant A access to actual Tenant B workflow/document IDs is scoped 404
with no B data disclosed. Since public workflow/document routes are read-only,
bounded unsupported POST/DELETE probes are asserted as 404/405 and authoritative
Tenant B pre/post rows are equal, proving no indirect mutation.

## Historical blocked checkpoint (preserved)

The initial Apply 7.5 attempt timed out during AppModule startup with Redis
`NOAUTH Authentication required`; both doorbell suites had 0 executed scenarios.
The API unit Jest roots also discovered 0 doorbell tests. This historical blocker
and its original evidence remain in `apply-7.5-testing.md`; the single authorized
disposable Redis correction below closed it without touching persistent
`crm-master-redis` or production/runtime configuration.

## Consolidated RED → GREEN → REFACTOR

| Nested unit | Result | Evidence |
|---|---|---|
| 7.1 Foundation | PASS | Guard RED failed 4 new cases; guard suite 10/10 green |
| 7.2 Core Engine | PASS | Four handlers consume trusted request authority; controller suites green |
| 7.3 Feature Implementation | PASS | Cross-tenant regression and public API matrix 47/47 green |
| 7.4 Integration | PASS with baseline debt | Lint/build/validators/diff hygiene pass; doorbell runner config/environment issue recorded |
| 7.5 Testing | PASS | Authenticated disposable Redis harness; new doorbell 5/5 and existing default-deny doorbell 22/22, serially, 0 skips; cleanup PASS |

## Acceptance evidence

| Gate | Result |
|---|---|
| Tenant authority and selector/Host denial unit evidence | PASS — persisted token tenant, provenance, no-overwrite, 401/403 cases |
| Controller trusted propagation and document 404 | PASS — 47 focused tests across six named suites |
| Scope, revocation, quota, rate-limit regression | PASS — included in focused suites |
| Real HTTP A/B tenant isolation/no disclosure/no mutation | PASS — 5/5 scenarios in the new doorbell; actual B workflow/document fixtures, scoped 404/no disclosure, pre/post no-mutation state evidence; all executed |
| Existing default-deny doorbell | PASS — 22/22 scenarios; all executed |
| API lint/build | PASS |
| SDD/design validators and diff check | PASS |

## Exact implementation files changed

1. `apps/api/src/modules/public-api/auth/token-auth.guard.ts`
2. `apps/api/src/modules/public-api/v1/v1-workflows.controller.ts`
3. `apps/api/src/modules/public-api/v1/v1-documents.controller.ts`
4. `apps/api/src/modules/public-api/__tests__/token-auth.guard.spec.ts`
5. `apps/api/src/modules/public-api/__tests__/public-api-cross-tenant-isolation.spec.ts`
6. `apps/api/src/modules/public-api/__tests__/v1-workflows.controller.spec.ts`
7. `apps/api/src/modules/public-api/__tests__/v1-documents.controller.spec.ts`
8. `apps/api/test/doorbell/public-api-tenant-binding.doorbell.spec.ts`

The canonical Apply evidence artifacts and checkbox updates are lifecycle
records, not implementation scope expansion. No secondary conditional file was
changed. No schema, migration, document service, mapper, global guard,
token-management policy, dependency, or Git artifact was changed.

## Deviations, dependencies, and baseline debt

- Bounded command deviation: API unit Jest cannot discover doorbells because its
  configured roots are `src`; the project e2e Jest config was used only as the
  necessary runtime harness.
- The historical AppModule/BullMQ Redis `NOAUTH` startup blocker was closed by
  the authorized disposable harness; no production or infrastructure file was
  changed to bypass it.
- Disposable Redis correction: container
  `crm-master-secure-public-api-tenant-binding-redis` (`redis:7-alpine`, host
  port `56380`) required authentication. Unauthenticated `redis-cli ping`
  returned `NOAUTH Authentication required`; authenticated ping returned
  `PONG`. The generated credential was never printed or persisted and was
  unset during EXIT cleanup.
- V-001 disposable PostgreSQL: container
  `crm-master-secure-public-api-tenant-binding-postgres` using
  `pgvector/pgvector:pg16`, database `secure_public_api_tenant_binding`, schema
  `public`; `vector` extension enabled only in that disposable database and
  the container removed during EXIT cleanup. The persistent `crm_test.public`
  target was not used.
- V-001 fixture evidence: actual Tenant B workflow instance and document IDs
  were requested with Tenant A's valid token and returned 404 without tenant or
  resource disclosure. Unsupported POST workflow and DELETE document probes
  returned 404/405; authoritative Tenant B pre/post rows were equal.
- Cleanup evidence: PASS — the disposable container was removed and post-run
  inspection found no container with that name; persistent `crm-master-redis`
  remained running.
- Doorbells: PASS — 2 serial suites / 27 tests / 0 skipped. Jest emitted its
  existing one-second open-handle warning after each suite, but both commands
  returned exit 0.
- Unexpected implementation files: none. New dependencies: none.

## Rollback boundaries

- Slice 1: revert guard and guard tests only.
- Slice 2: revert the two controllers and their unit/regression changes only.
- Slice 3: remove the new doorbell; preserve the existing default-deny doorbell
  and all unrelated user work.

## Structured result

```yaml
status: PASS
change: secure-public-api-tenant-binding
phase: Apply
nested_action: 7.6 Apply Summary
completed_substeps:
  - 7.1 Foundation
  - 7.2 Core Engine
  - 7.3 Feature Implementation
  - 7.4 Integration
  - 7.5 Testing (disposable authenticated Redis correction; 27/27 scenarios)
  - 7.6 Apply Summary
files_changed: 8 implementation paths plus canonical Apply artifacts
unexpected_files_or_dependencies: none
tenant_isolation: unit/controller evidence PASS; actual foreign-resource real HTTP evidence PASS
baseline_debt:
  - API unit Jest roots exclude doorbell paths
  - Historical AppModule/BullMQ Redis NOAUTH startup timeout — closed by bounded disposable harness
validators:
  - focused API suites: PASS, 6 suites / 47 tests
  - doorbells: PASS, 2 suites / 27 tests / 0 skipped, serial execution
  - pnpm --filter api lint: PASS
  - pnpm --filter api build: PASS
  - pnpm sdd:validate:design: PASS
  - pnpm sdd:validate: PASS
  - git diff --check: PASS
next_action: Fresh Verify (HIGH) for V-001; Verify not started
```

**The single V-001 Direct Fix is complete as PASS evidence. Fresh HIGH Verify is
next; this executor did not start Verify.**
