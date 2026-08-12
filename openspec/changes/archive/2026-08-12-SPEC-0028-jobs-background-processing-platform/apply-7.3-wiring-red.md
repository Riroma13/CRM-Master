# Apply 7.3.3 Wiring RED Evidence

> **SPEC:** SPEC-0028-jobs-background-processing-platform
> **Nested Apply:** 7.3.3 RED
> **Status:** PASS — RED evidence recorded; handoff to Apply 7.4.1 GREEN
> **Delivery:** Third chained PR slice, `stacked-to-main`
> **Executor:** MID / BUILDER — project-local Direct wiring
> **Date:** 2026-08-11

## Scope and provenance

Consumed PASS `apply-7.3-feature.md`, approved Design §§5/6/11/14, Tasks
7.3.3–7.4.1, PASS Tasks Review, and READY HUMAN-approved Workload Guard before
the bounded target read. All completed SDD artifacts remain unchanged.

Only 7.3.3 RED was executed. No production wiring was modified. Apply 7.4.1
GREEN, 7.5, 7.6, Verify, Archive, Health Report, Repository Ready, and Git
operations were not started.

## RED assertions added

The approved existing Activity Timeline Redis ownership regression test now
uses bounded source assertions against the approved modules to prove:

1. `InfrastructureModule` must import and include `JobsModule` in its imports.
2. `HealthModule` must preserve its `JobsModule` provider import.
3. `HealthController` must consume `JobsLifecycleService.getReadiness()`.
4. Activity Timeline must retain both queue registrations, queue identities,
   attempts, backoff delay, and removal options after root extraction.

The InfrastructureModule assertion fails against the current pre-7.4 wiring;
the Health assertions and queue-preservation assertions pass, proving the RED
test isolates the remaining wiring seam without changing production code.

## Exact RED evidence

| Stage | Command | Exact result |
|---|---|---|
| Safety net | `pnpm --filter api test -- --runInBand src/modules/activity-timeline/__tests__/activity-timeline-redis-connection.spec.ts` | PASS — 1 suite, 4 tests passed before adding 7.3.3 assertions. |
| 7.3.3 RED | Same focused Activity Timeline command after assertions | FAIL as intended — 6 tests total: 5 passed, 1 failed. The failure is the missing `JobsModule` import in `InfrastructureModule`; no production wiring was changed. |

Prior 7.3.2 evidence remains valid: focused metrics/health tests 10/10,
API build/lint PASS, `pnpm sdd:validate` PASS, and `git diff --check` PASS.

## Files changed

| File | Action | Bounded change |
|---|---|---|
| `apps/api/src/modules/activity-timeline/__tests__/activity-timeline-redis-connection.spec.ts` | Modified | Added wiring RED and queue registration/options preservation assertions. |
| `openspec/changes/SPEC-0028-jobs-background-processing-platform/apply-7.3-wiring-red.md` | Created | This exact bounded RED evidence artifact. |

No production wiring file was modified. In particular,
`infrastructure.module.ts` remains unchanged for the next GREEN substep.

## Compatibility and tenant notes

- Existing Activity Timeline queue identities remain asserted as
  `activity-timeline-ingestion` and `activity-timeline-dlq`.
- Existing attempts, backoff delay, `removeOnComplete`, and `removeOnFail`
  options remain asserted.
- No tenant data path, Identity behavior, producer, schema/migration,
  standalone worker, package, lockfile, or downstream wiring was touched.

## Rollback boundary

Revert only the new assertions in
`apps/api/src/modules/activity-timeline/__tests__/activity-timeline-redis-connection.spec.ts`
and remove this evidence artifact. No production behavior or prior Apply
7.1–7.3.2 state is removed.

## Deviations and blockers

- Deviations: **none**.
- Unexpected files/dependencies: **none**.
- The single failing assertion is the intentional RED gate for the missing
  7.4.1 InfrastructureModule wiring; it is not baseline debt.

## Canonical next action

**Apply 7.4.1 GREEN only** — wire `JobsModule` alphabetically in
`InfrastructureModule`, preserve existing Activity Timeline root/queue options,
and retain Health provider composition. Do not begin 7.5 or later phases.
