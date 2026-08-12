# Apply 7.4.1 Integration Evidence

> **SPEC:** SPEC-0028-jobs-background-processing-platform
> **Nested Apply:** 7.4.1 GREEN
> **Status:** PASS — bounded handoff to Apply 7.5.1 RED
> **Delivery:** Third chained PR slice, `stacked-to-main`
> **Executor:** MID / BUILDER — project-local Direct wiring
> **Date:** 2026-08-11

## Scope and provenance

Consumed PASS `apply-7.3-feature.md`, PASS `apply-7.3-wiring-red.md`, approved
Design/Tasks/Tasks Review, and READY HUMAN-approved Workload Guard before the
bounded implementation read. The intentional 7.3.3 RED failure was confirmed
as the missing `InfrastructureModule` JobsModule wiring. All completed SDD
artifacts remain unchanged.

Only 7.4.1 GREEN was executed. No Apply 7.5.1, 7.5.2, 7.5.3, 7.6, Verify,
Archive, Health Report, Repository Ready, or Git operation was performed.

## RED → GREEN evidence

| Stage | Command | Exact result |
|---|---|---|
| Prior RED | `pnpm --filter api test -- --runInBand src/modules/activity-timeline/__tests__/activity-timeline-redis-connection.spec.ts` | FAIL — 6 tests total, 5 passed, 1 failed because `InfrastructureModule` lacked the `JobsModule` import. |
| GREEN | Same focused wiring/Activity Timeline command after implementation | PASS — 1 suite, 6 tests passed, 0 failed. |
| Build | `pnpm --filter api build` | PASS |
| Lint | `pnpm --filter api lint` | PASS |
| Governance validation | `pnpm sdd:validate` | PASS — CRM-SDD governance validation. |

## Implementation

Added `JobsModule` to `InfrastructureModule` alphabetically after
`HealthModule` and before `NotificationsModule`. No other production wiring was
changed.

## Files changed

| File | Action | Bounded change |
|---|---|---|
| `apps/api/src/modules/infrastructure/infrastructure.module.ts` | Modified | Imported and included `JobsModule` in alphabetical infrastructure composition. |
| `openspec/changes/SPEC-0028-jobs-background-processing-platform/apply-7.4-integration.md` | Created | This exact bounded GREEN evidence artifact. |

## Queue and Health compatibility

- Activity Timeline remains free of `BullModule.forRoot` and local `REDIS_URL`
  ownership.
- Existing Activity Timeline queue identities remain
  `activity-timeline-ingestion` and `activity-timeline-dlq`.
- Existing registration options remain asserted and passing: attempts,
  exponential backoff delay, `removeOnComplete`, and `removeOnFail`.
- HealthModule continues importing JobsModule and HealthController continues
  consuming `JobsLifecycleService.getReadiness()`.
- No Identity queue registration, producer, notification scheduler, schema,
  migration, tenant authority, or standalone worker behavior changed.

## Tenant and security notes

This integration change adds composition only. It introduces no tenant data
path, query, payload label, or authority decision. Existing Jobs tenant
revalidation and scoped execution remain unchanged for the downstream doorbell.

## Rollback boundary

Remove the `JobsModule` import and `JobsModule` entry from
`apps/api/src/modules/infrastructure/infrastructure.module.ts`, preserving the
completed Jobs foundation/core/telemetry and Activity Timeline root extraction.
No queue, domain record, schema, migration, Identity state, or unrelated work
is removed.

## Deviations and unexpected files

- Deviations: **none** — implementation matches the approved 7.4.1 boundary.
- Unexpected files: **none** within the bounded action.
- Unexpected dependencies: **none**; no package or lockfile changes.

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused wiring test | PASS — 1 suite / 6 tests |
| Runtime harness | N/A — this unit is composition-only; API build is the bounded compile/runtime wiring evidence, while real DB/doorbell execution is downstream 7.5. |
| Rollback boundary | Revert only the JobsModule import and composition entry in InfrastructureModule. |

## Canonical next action

**Apply 7.5.1 RED only** — create the approved real-DB tenant-isolation
doorbell. Do not begin 7.5.2, 7.5.3, 7.6, Verify, or later phases.
