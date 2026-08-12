# Tasks: SPEC-0028 — Jobs & Background Processing Platform

## Review Workload Forecast
Estimated changed lines: 650–900 (9 creates, 8 modifications, tests/integration).
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High
Forecast disposition: the >400 estimate and any chain/exception choice remain downstream Workload Guard analysis and HUMAN approval; this Tasks artifact is not Apply authorization.

| Unit | Goal | Focused test | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| 1 | Jobs root/contracts/lifecycle | `pnpm --filter api test -- --runInBand jobs` | Redis readiness probe | Revert `modules/jobs/` |
| 2 | Root extraction and wiring | activity-timeline Redis test | API boot + health endpoint | Restore Activity Timeline root/imports |
| 3 | Tenant/telemetry proof | doorbell + metrics tests | `DATABASE_TEST_URL` doorbell | Revert integration/test files |

## Exact Working Set
Create: `apps/api/src/modules/jobs/{jobs.module.ts,jobs-redis.config.ts,jobs.contracts.ts,jobs-client.service.ts,jobs-tenant-authority.service.ts,jobs-lifecycle.service.ts}`, `apps/api/src/modules/jobs/__tests__/{jobs-client.spec.ts,jobs-lifecycle.spec.ts}`, `apps/api/test/doorbell/jobs-tenant-isolation.e2e-spec.ts`.
Modify: `activity-timeline/{activity-timeline.module.ts,activity-timeline-queue.constants.ts}`, `activity-timeline/__tests__/activity-timeline-redis-connection.spec.ts`, `infrastructure/infrastructure.module.ts`, `health/{health.module.ts,health.controller.ts}`, `observability/metrics/metrics-registry.ts`, `observability/__tests__/metrics-registry.spec.ts`. The Redis regression test is tied to 7.1.1 and rolls back with the Activity Timeline root/config ownership boundary.
Do not change Identity files, notification reminders, knowledge/reporting/billing/audit modules, `app.module.ts`, Prisma schema, or migrations; no generic JobDefinition/JobRun/JobSchedule persistence or producer migration.

## Bounded Read Order
Consume, in order: `activity-timeline.module.ts`; `activity-timeline-queue.constants.ts`; `infrastructure.module.ts`; `identity.module.ts`; `identity-audit-dispatcher.service.ts`; `common/prisma.service.ts`; `notifications/notification-reminders.service.ts`; `metrics-registry.ts` and `health.controller.ts`; `test/doorbell/identity-isolation.e2e-spec.ts`. No additional reads without a recorded contradiction or missing fact.

## Apply 7.1–7.6 Tasks
- [x] **7.1.1 RED** Extend the activity-timeline connection test to fail if it owns `BullModule.forRoot`/`REDIS_URL`; **depends:** none.
- [x] **7.1.2 GREEN** Create fail-closed Redis config, typed contracts, `JobsModule` root, and lifecycle provider; preserve queue options/identities; **depends:** 7.1.1.
- [x] **7.2.1 RED** Add client/lifecycle tests for forged fields, schema failure, deterministic IDs, delay/scheduler/cancel, transient/terminal retry, outage, drain/recovery, and bounded concurrency; **depends:** 7.1.2.
- [x] **7.2.2 GREEN** Implement `JobsClient`, tenant-authority revalidation, and API-process pause/drain/close/metrics behavior; definitions own policy and handlers remain replay-safe; **depends:** 7.2.1.
- [x] **7.3.1 RED** Add metrics redaction/label assertions and health Redis readiness assertions; **depends:** 7.2.2.
- [x] **7.3.2 GREEN** Add aggregate job metrics without payload labels and replace health `unknown` with the Jobs provider result; **depends:** 7.3.1.
- [x] **7.3.3 RED** Add InfrastructureModule/Health provider-wiring assertions for Jobs readiness and preservation of existing queue registration/options; **depends:** 7.3.2.
- [x] **7.4.1 GREEN** Wire `JobsModule` alphabetically in `infrastructure.module.ts`; remove only Activity Timeline root/config ownership while retaining registrations/options; import health provider; **depends:** 7.3.3.
- [x] **7.5.1 RED** Create the real-DB doorbell for cross-tenant, forged, inactive, and scoped-reload denial; **depends:** 7.4.1.
- [x] **7.5.2 GREEN** Make the worker validate envelope, require active tenant, use `PrismaService.forTenant`, fail terminally, and pass the doorbell; run focused tests, build, lint, generation verification, and full regression gates; **depends:** 7.5.1.
- [x] **7.5.3 REFACTOR** Remove duplication and temporary test scaffolding, preserve approved boundaries/queue ownership, and rerun focused jobs, wiring, health, metrics, and doorbell verification without scope expansion; **depends:** 7.5.2.
- [x] **7.6.1 CHECKPOINT** Record RED→GREEN→REFACTOR evidence, unchanged-file audit, tenant-isolation proof, commands/results, forecast, and any condition; **depends:** 7.5.3.
- [x] **7.6.2 APPLY SUMMARY** Confirm no schema/migration, generic job persistence, standalone worker, notification migration, or Identity DLQ change; **depends:** 7.6.1.

## Acceptance and Gates
All approved contracts pass; queue names/options and Identity outbox/DLQ behavior regress unchanged; Redis outage fails closed; shutdown is bounded; status/cancel semantics are exact; no secrets/payload labels leak. The wiring RED proves InfrastructureModule/Health readiness and queue-registration preservation before 7.4.1 GREEN, and the focused REFACTOR verification proves cleanup did not expand scope. Doorbell proves A cannot execute/read B or inactive/forged context. Commands: `pnpm --filter api test -- --runInBand jobs`; `pnpm --filter api test:e2e -- jobs-tenant-isolation.e2e-spec.ts`; `pnpm --filter api build && pnpm --filter api lint`; `pnpm --filter @crm-master/database generate && pnpm --filter @crm-master/database generate:scope:verify`; `pnpm test && pnpm lint`. Schema/migration gate: N/A, do not run `db:migrate`.

## Non-blocking Conditions
- **TR-004 — CONDITION:** Owner: future domain-adoption Design/owner. Evidence: `architecture-review.md:35,44,70`; conservative per-definition concurrency must be chosen and tested before first consumer adoption.
- **TR-005 — CONDITION:** Owner: Workload Guard plus HUMAN / MAINTAINER. Evidence: 650–900 forecast, `docs/SDD-WORKFLOW.md:145-158`; bounded analysis and approval are required after fresh Tasks Review and before Apply.

## Pre-gate Evidence
`pnpm sdd:validate` → `CRM-SDD governance validation: PASS`. `pnpm sdd:validate:design -- "openspec/changes/SPEC-0028-jobs-background-processing-platform/design.md"` → `Enterprise Design validation: FAIL (openspec/changes/SPEC-0028-jobs-background-processing-platform/design.md)`; `SPEC-0028 is protected and is not read by this validator`; `ELIFECYCLE Command failed with exit code 1.` Classify as expected non-blocking VAL-01, owner: manual bounded Design/Architecture Review, evidence: `architecture-review.md:73-80`.

**Canonical next action: Tasks Review only.**
