# Tasks: SPEC-0032 — Data Retention & Lifecycle Platform

status: APPLY 7.3 — PR3 blocked at runtime evidence gate
change: SPEC-0032-data-retention-lifecycle-platform
phase: Apply 7.3 Feature Implementation

## Review Workload Forecast

Estimated changed lines: 800–1,100; risk: High; delivery: feature-branch-chain.
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Autonomous Work Units

| Unit/base | Finish, focused command, runtime harness, rollback |
|---|---|
| PR1 / base `feature/SPEC-0032-data-retention-lifecycle-platform` | Schema, migration, shared contracts. Finish: reviewed `packages/database/prisma/migrations/20260815000000_add_data_lifecycle_platform/migration.sql`, then `pnpm --filter database prisma migrate dev --name add_data_lifecycle_platform && pnpm --filter database test:scope`; runtime: N/A (additive schema only). Roll back migration/tables and shared exports. |
| PR2 / base PR1 branch | Lifecycle engine, owner adapters, module wiring. Finish: `pnpm --filter api test -- lifecycle` and `pnpm --filter api test -- retention`; runtime: N/A (worker/unit harness is the bounded proof). Disable schedules/remove LifecycleModule; retain ledger evidence. |
| PR3 / base PR2 branch | API, doorbell, ADR evidence, regression. Finish: `pnpm --filter api test:e2e -- data-lifecycle-isolation && pnpm --filter api lint && pnpm --filter api build`; runtime: real HTTP with distinct Host tenants and forged job envelope. Disable policy/scheduler and revert API/tests/ADR independently. |

## Exact Working Set (path — action)

- Modify `packages/database/prisma/schema.prisma`; create `packages/database/prisma/migrations/20260815000000_add_data_lifecycle_platform/migration.sql` (generated, then review only).
- Create `packages/shared/src/lifecycle/lifecycle.types.ts`, `packages/shared/src/lifecycle/index.ts`; modify `packages/shared/src/index.ts`.
- Create `apps/api/src/modules/lifecycle/lifecycle.module.ts`.
- Create `apps/api/src/modules/lifecycle/lifecycle-policy.service.ts`.
- Create `apps/api/src/modules/lifecycle/lifecycle-runner.processor.ts`.
- Create `apps/api/src/modules/lifecycle/lifecycle.controller.ts`.
- Create `apps/api/src/modules/lifecycle/lifecycle-job.definition.ts`.
- Modify `apps/api/src/modules/audit/retention/retention-engine.ts` and `apps/api/src/modules/document-engine/retention/retention-service.ts`.
- Modify `apps/api/src/modules/audit/audit.module.ts`, `apps/api/src/modules/document-engine/document-engine.module.ts`, and `apps/api/src/modules/infrastructure/infrastructure.module.ts`.
- Create `apps/api/src/modules/lifecycle/__tests__/lifecycle-policy.service.spec.ts` and `apps/api/src/modules/lifecycle/__tests__/lifecycle-runner.processor.spec.ts`.
- Modify `apps/api/src/modules/audit/__tests__/retention-engine.spec.ts` and `apps/api/src/modules/document-engine/retention/__tests__/retention-service.spec.ts`.
- Create `apps/api/test/doorbell/data-lifecycle-isolation.e2e-spec.ts`.
- Create/review proposed `docs/architecture/adr/ADR-0032-data-retention-lifecycle-platform.md` (evidence only; no unrelated ADR edits).

## Read Order and Protected Exclusions

Read exactly: schema; lifecycle contracts; `apps/api/src/modules/jobs/jobs.contracts.ts` and `jobs-lifecycle.service.ts`; policy service; runner; owner services/modules; focused tests. Exclude `apps/api/src/app.module.ts`, `apps/api/src/modules/jobs/*`, frontends, other active changes, and all unlisted paths. Generated `packages/database/prisma/generators/tenant-scope/*` outputs are generator-owned: run generation/verification, never hand-edit.

## Ordered RED → GREEN → REFACTOR Tasks

- [x] 1.1 RED: add schema/scope expectations for tenant uniqueness, tenant/date indexes, and generated participation. Checkpoint: failing proof.
- [x] 1.2 GREEN: add models, contracts, exports, and migration at the exact path above. Checkpoint: migration SQL reviewed separately from schema.
- [x] 1.3 REFACTOR: run `pnpm --filter database generate` and `generate:scope:verify`; record fresh outputs and no hand edits. Rollback: drop additive migration/tables/exports.
- [x] 2.1 RED: policy tests for Host authority, mismatches/unsupported fields, masked 404s, scheduler ID, enable/disable.
- [x] 2.2 GREEN: implement policy persistence, validation, and deterministic scheduling; tenantId never comes from input.
- [x] 2.3 REFACTOR: clean policy boundaries and rerun focused tests.
- [x] 2.4 RED: runner tests for forged tenant rejection/no mutation, claim/idempotency, terminal duplicate, redacted failure, dispatch.
- [x] 2.5 GREEN: implement job definition, runner, transactional ledger, retries, and audit publication.
- [x] 2.6 REFACTOR: export owner tokens and wire cycle-free Lifecycle through pure InfrastructureModule; no `forwardRef`.
- [x] 2.7 RED: adapter tests for held audit survival and restored/unexpired document-trash survival plus eligible counts.
- [x] 2.8 GREEN: implement owner-scoped, hold/expiry-safe adapters.
- [x] 2.9 REFACTOR: prove adapter predicates and retention regressions.
- [x] 3.1 RED: controller tests for CRUD, auth, pagination, and indistinguishable foreign 404s.
- [x] 3.2 GREEN: implement Host-scoped policy/run endpoints.
- [x] 3.3 REFACTOR: run API tests and reconcile contracts.
- [x] 3.4 RED: add real-HTTP doorbell fixtures for two Hosts and forged job tenant.
- [x] 3.5 GREEN: satisfy no cross-tenant visibility/mutation and no forged-job mutation.
- [x] 3.6 REFACTOR: run e2e, lint, build, and regression commands above.
- [x] 3.7 ACCEPTANCE: review migration SQL independently; verify generated-scope freshness/no hand edits; record proposed ADR-0032 with AR-003 confirmation or changed 24-month window **before enabling any tenant policy**. No policy seeding/backfill.

Next: Apply 7.3 is complete; the canonical next lifecycle phase is Verify. Do not enter Archive, Health Report, Repository Ready, or Git lifecycle phases in this executor.
