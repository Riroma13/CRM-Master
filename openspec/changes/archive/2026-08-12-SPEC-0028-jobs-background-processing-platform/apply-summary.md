# Apply 7.6 Summary: SPEC-0028 — Jobs & Background Processing Platform

> **SPEC:** SPEC-0028-jobs-background-processing-platform
> **Nested Apply:** 7.6 Apply Summary
> **Status:** PASS WITH BASELINE_DEBT AND CONDITIONS — handoff to Verify (HIGH)
> **Delivery:** Three chained PR seams, `stacked-to-main`
> **Executor:** MID / BUILDER — project-local `sdd-direct-apply`
> **Date:** 2026-08-11

## 7.6.1 CHECKPOINT

### Provenance and boundary

This checkpoint consumed the approved Design, Architecture Review, Tasks, PASS
Tasks Review, READY HUMAN-approved Workload Guard, all prior Apply evidence
(`7.1`, `7.2`, `7.3`, `7.3.3`, `7.4.1`, `7.5.1`, recovered `7.5.2`, and PASS
`7.5.3`), and the maintainer recovery record in `apply-7.5.2-doorbell-green.md`.
Completed phases were not recreated or reopened. No implementation change was
made in 7.6. The generated tenant-scope outputs were clean before this action
and were not invoked or modified.

### RED → GREEN → REFACTOR evidence

| Nested work | RED evidence | GREEN evidence | REFACTOR / final evidence | Result |
|---|---|---|---|---|
| 7.1 Foundation | Activity Timeline ownership assertion failed before production changes: `BullModule.forRoot` remained local. | Foundation focused test: 1 suite / 4 tests; API build and lint PASS. | Foundation boundary preserved; no separate refactor required. | PASS |
| 7.2 Core Engine | Jobs client/lifecycle suites failed to compile because the approved core services/APIs did not yet exist; 0 tests executed. | 2 suites / 10 tests; API build/lint PASS. | Core behavior preserved by later focused regression. | PASS |
| 7.3 Feature Implementation | Metrics/health assertions failed on missing metrics and provider contract; 0 tests executed. | Metrics/health: 1 suite / 10 tests; API build/lint PASS. | Health readiness and redacted aggregate metrics remained passing. | PASS |
| 7.3.3 Wiring RED → 7.4.1 GREEN | Wiring test: 5/6 passed, 1 intentional failure for missing `JobsModule` in `InfrastructureModule`. | Wiring test: 1 suite / 6 tests; API build/lint PASS. | Queue registration/options and health composition remained passing. | PASS |
| 7.5 Testing | Real-DB doorbell: 3 assertions passed and scoped reload failed intentionally. | Recovered GREEN: doorbell 1 suite / 4 tests; Jobs unit 2 suites / 10 tests. | Refactor regressions: Jobs 10/10, wiring 6/6, metrics/health 10/10, real-DB doorbell 4/4. | PASS |

The 7.5.3 bounded mechanical correction removed the stale generic type
argument exposed by refactoring. It changed no public contract, queue policy,
tenant authority, handler boundary, or architecture boundary.

### Final evidence checks executed in 7.6

No database generation command was run.

| Command | Exact result | Classification |
|---|---|---|
| `pnpm sdd:validate` | PASS — CRM-SDD governance validation; canonical phases, local Direct wiring, hybrid persistence, role map, and maintainer gates valid. | PASS |
| `pnpm --filter api build` | PASS — `nest build`. | PASS |
| `pnpm --filter api lint` | PASS — `eslint src --ext .ts`. | PASS |
| `pnpm test` | FAIL. Database 31/31, shared 159/159, UI 15/15, and admin-web 74/74 passed. Tenant-web: 34/36 files and 183/185 tests passed; the two failures were `calendar-picker.test.tsx` day selection and `upload-dialog.test.tsx` oversized-file timeout. API failures were database-backed suites unable to initialize because `DATABASE_URL` was absent (`schema.prisma:7`); the SPEC-0028 Jobs, metrics, wiring, and doorbell evidence remained passing. | BASELINE_DEBT — unrelated untouched tenant-web tests and unavailable baseline DB environment; no SPEC-0028 causal path. No fix made. |
| `pnpm lint` | PASS — all 5 lint tasks successful. Existing tenant-web React-hook/image warnings and Next.js deprecation/root warnings were non-failing. | PASS with non-blocking warnings |
| `git diff --check` | PASS. | PASS |

The full regression failure is not claimed as a clean-repository result. Its
failures are recorded as BASELINE_DEBT because the failing tenant-web paths
were not in the SPEC-0028 Working Set and the API failures are caused by the
missing external `DATABASE_URL`, not by Jobs code. No generated output was
rerun to investigate or repair this debt.

### Exact 17-path Working Set and unchanged-file audit

The approved Working Set is exactly 17 implementation/test paths: 9 creates and
8 modifies. The canonical Apply evidence artifacts are separate evidence paths
and are not implementation Working Set expansion.

**Creates (9):**

1. `apps/api/src/modules/jobs/jobs.module.ts`
2. `apps/api/src/modules/jobs/jobs-redis.config.ts`
3. `apps/api/src/modules/jobs/jobs.contracts.ts`
4. `apps/api/src/modules/jobs/jobs-client.service.ts`
5. `apps/api/src/modules/jobs/jobs-tenant-authority.service.ts`
6. `apps/api/src/modules/jobs/jobs-lifecycle.service.ts`
7. `apps/api/src/modules/jobs/__tests__/jobs-client.spec.ts`
8. `apps/api/src/modules/jobs/__tests__/jobs-lifecycle.spec.ts`
9. `apps/api/test/doorbell/jobs-tenant-isolation.e2e-spec.ts`

**Modifies (8):**

1. `apps/api/src/modules/activity-timeline/activity-timeline.module.ts`
2. `apps/api/src/modules/activity-timeline/activity-timeline-queue.constants.ts`
3. `apps/api/src/modules/activity-timeline/__tests__/activity-timeline-redis-connection.spec.ts`
4. `apps/api/src/modules/infrastructure/infrastructure.module.ts`
5. `apps/api/src/modules/health/health.module.ts`
6. `apps/api/src/modules/health/health.controller.ts`
7. `apps/api/src/modules/observability/metrics/metrics-registry.ts`
8. `apps/api/src/modules/observability/__tests__/metrics-registry.spec.ts`

The unchanged-file audit is PASS: no files outside these 17 paths plus the
canonical SPEC-0028 evidence artifacts changed. The three generated paths
remain clean; no package, lockfile, Prisma schema/migration, Identity,
notification, producer, standalone-worker, `app.module.ts`, or unrelated
domain path changed. Git state was inspected only; no Git operation was run.

### Chained-PR seams and rollback boundaries

| Seam | Apply scope | Rollback boundary |
|---|---|---|
| PR 1 — Foundation | 7.1.1–7.1.2: Jobs root/config/contracts/lifecycle and Activity Timeline root ownership extraction. | Remove `apps/api/src/modules/jobs/`; restore Activity Timeline root/config ownership while preserving queue identities/options. |
| PR 2 — Core and telemetry | 7.2.1–7.3.2: client/lifecycle behavior, retry/outage/drain, metrics, and health readiness. | Revert the Jobs client/authority/core lifecycle and telemetry/health changes; preserve PR 1 and domain state. |
| PR 3 — Wiring and tenant proof | 7.3.3–7.5.3: Infrastructure/Health wiring, queue-preservation assertions, real-DB doorbell, and refactor. | Revert only the integration/proof changes; preserve Jobs foundation/core/telemetry, queues, domain records, and schema. |

The approved forecast was **650–900 changed lines**, above the 400-line budget.
Workload Guard found three independently reviewable seams and the HUMAN /
MAINTAINER approved **Chained PRs with `stacked-to-main`**. No size exception,
branch, commit, push, merge, release, or tag was performed.

### Queue, Identity compatibility, and tenant-isolation doorbell

- Activity Timeline queue identities remain `activity-timeline-ingestion` and
  `activity-timeline-dlq`; attempts, exponential backoff, delay, and removal
  options remain asserted and passing.
- Jobs definitions remain authoritative for queue policy, attempts, backoff,
  and concurrency. Callers cannot replace trusted queue policy.
- Identity queue registrations, outbox lease/delivery semantics, producers,
  and Identity-owned DLQ behavior were not changed.
- The real-DB doorbell proves cross-tenant payload denial, forged-context
  denial, inactive-tenant denial, and active execution through
  `PrismaService.forTenant(TENANT_A_ID)` before handler effects.
- The worker validates the envelope, requires an active tenant, reloads through
  the scoped Prisma client, and terminally rejects invalid or foreign authority.
- Metrics remain aggregate and redacted: no payload, tenant, correlation, or
  job-data labels were introduced.

### Recovery, conditions, and deviations

The maintainer recovery restored the three unrelated timestamp-only generated
tenant-scope diffs produced by the prior generation verification:

- `packages/database/prisma/generators/tenant-scope/generated/tenant-metadata.json`
- `packages/database/prisma/generators/tenant-scope/generated/tenant-models.ts`
- `packages/database/prisma/generators/tenant-scope/generated/tenant-scope.spec.ts`

The recovery was verified clean, and all remaining tracked changes were within
the approved SPEC-0028 implementation Working Set. This summary does not
invoke or modify generated outputs again.

Carried non-blocking conditions:

- **TR-004 — CONDITION:** Future domain adoption must choose and test
  conservative per-definition concurrency values before its first consumer.
  Owner: future domain-adoption Design/owner.
- **TR-005 — CONDITION:** The 650–900 forecast required bounded Workload Guard
  analysis and HUMAN approval. That condition is satisfied by the recorded
  `stacked-to-main` decision; no Size Exception was used.
- **Protected Design-validator condition:** The expected protected-path notice
  from `pnpm sdd:validate:design` remains the previously recorded condition:
  `SPEC-0028 is protected and is not read by this validator`. It was not rerun
  or reinterpreted in 7.6.

No bounded deviation was required in 7.6. Prior bounded deviations and the
recovery-resolved lifecycle scope extension are preserved in their originating
evidence artifacts.

## 7.6.2 APPLY SUMMARY

### Explicit exclusions confirmed

This Apply did **not** add or change:

- Prisma schema or migrations;
- generic job persistence (`JobDefinition`, `JobRun`, or `JobSchedule` tables);
- a standalone worker or multi-process worker topology;
- notification scheduler migration;
- producer/domain migration;
- Identity queue, outbox, or DLQ behavior;
- generated tenant-scope outputs;
- Git state or any Git lifecycle operation.

### Structured result

```yaml
status: PASS
change: SPEC-0028-jobs-background-processing-platform
phase: Apply
nested_action: 7.6 Apply Summary
checkpoint: 7.6.1 CHECKPOINT
summary: 7.6.2 APPLY SUMMARY
implementation_changes_in_7_6: none
working_set: 17 paths (9 creates, 8 modifies)
unexpected_files_or_dependencies: none
generated_outputs: clean; not invoked in 7.6
tenant_isolation: PASS — real-DB doorbell and scoped Prisma reload evidence
queue_identity_compatibility: PASS
identity_compatibility: PASS
forecast_changed_lines: 650-900
delivery_strategy: stacked-to-main
conditions:
  - TR-004: CONDITION
  - TR-005: CONDITION satisfied by HUMAN approval
  - protected Design-validator notice: CONDITION carried forward
baseline_debt:
  - full pnpm test unavailable for baseline DB suites without DATABASE_URL
  - two unrelated untouched tenant-web tests failed (183/185 passed)
validators:
  - pnpm sdd:validate: PASS
  - pnpm --filter api build: PASS
  - pnpm --filter api lint: PASS
  - pnpm lint: PASS with existing warnings
  - git diff --check: PASS
next_action: Verify (HIGH) only
```

**Apply 7.6 is complete. Stop here and hand off to Verify (HIGH).** Verify,
Archive, Health Report, Repository Ready, and all Git operations were not
invoked.
