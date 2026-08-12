# Apply 7.2 Core Engine Evidence

> **SPEC:** SPEC-0028-jobs-background-processing-platform
> **Nested Apply:** 7.2 Core Engine
> **Status:** PASS — bounded handoff to Apply 7.3
> **Delivery:** Chained PR slice, `stacked-to-main`
> **Executor:** MID / BUILDER — project-local Direct wiring
> **Date:** 2026-08-11

## Scope and provenance

This artifact records only Apply 7.2.1 RED and 7.2.2 GREEN. The existing
`apply-7.1-foundation.md`, approved Design §§5/6/14/17, approved `tasks.md`,
PASS `tasks-review.md`, and READY HUMAN-approved `workload-guard.md` were
consumed before additional implementation reads. All completed SDD artifacts
remain unchanged.

No Apply 7.3, 7.4, 7.5, 7.6, Verify, Archive, Health Report, Repository Ready,
or Git operation was performed.

## Substep status

| Substep | Result | Evidence |
|---|---|---|
| 7.2.1 RED | PASS | Added the approved Jobs client/lifecycle tests. Before production implementation, both suites failed at TypeScript compilation because the new core services and lifecycle APIs did not exist. |
| 7.2.2 GREEN | PASS | Implemented validated enqueue/schedule/cancel, trusted-context envelope handling, execution-time tenant revalidation, terminal/transient error classification, bounded worker lifecycle, and lifecycle metrics snapshot. |

## RED → GREEN evidence

| Stage | Command | Exact result |
|---|---|---|
| RED | `pnpm --filter api test -- --runInBand src/modules/jobs/__tests__/jobs-client.spec.ts src/modules/jobs/__tests__/jobs-lifecycle.spec.ts` | FAIL as intended — 2 suites could not compile; missing `jobs-client.service.ts`, `jobs-tenant-authority.service.ts`, lifecycle APIs, and worker options. 0 tests executed. |
| GREEN | Same focused Jobs command after implementation | PASS — 2 suites, 10 tests passed, 0 failed. |
| Build | `pnpm --filter api build` | PASS |
| Lint | `pnpm --filter api lint` | PASS |

### Scenario coverage

- Forged payload tenant fields fail closed before authority lookup.
- Zod schema failures are terminal and do not touch Redis.
- Stable `definition.key:idempotencyKey` job IDs are used for enqueue.
- Definition-owned attempts/backoff are applied; caller input only supplies
  the bounded delay option.
- Scheduler creation uses stable scheduler IDs and definition retry policy.
- Pending, active, and missing cancellation statuses are exact.
- Redis failures surface sanitized infrastructure errors without secrets.
- Transient handler failures are preserved for BullMQ retry; terminal failures
  become `UnrecoverableError`.
- Shutdown pauses workers before closing them and exposes bounded worker metrics.
- Worker registration can be explicitly unregistered; concurrency is validated
  and returned from the definition-owned worker options.

Triangulation was completed in both approved test files: happy paths and
different validation, cancellation, retry, shutdown, and registration paths
are covered by 10 passing tests.

## Files changed

| File | Action | Bounded change |
|---|---|---|
| `apps/api/src/modules/jobs/jobs-client.service.ts` | Created | JobsClient adapter for validation, deterministic enqueue, delay, scheduler, cancel, and sanitized outage errors. |
| `apps/api/src/modules/jobs/jobs-tenant-authority.service.ts` | Created | Execution-time active-tenant lookup through scoped platform Prisma access. |
| `apps/api/src/modules/jobs/__tests__/jobs-client.spec.ts` | Created | Client RED/GREEN behavior coverage. |
| `apps/api/src/modules/jobs/__tests__/jobs-lifecycle.spec.ts` | Created | Lifecycle, retry classification, shutdown, metrics, and concurrency coverage. |
| `apps/api/src/modules/jobs/jobs-lifecycle.service.ts` | Modified | Added execution, terminal/transient classification, bounded worker options, metrics snapshot, and pause-before-close shutdown behavior. |
| `apps/api/src/modules/jobs/jobs.contracts.ts` | Modified | Added shared terminal-error contract to avoid a lifecycle/authority circular dependency. |
| `apps/api/src/modules/jobs/jobs.module.ts` | Modified | Registered/exported the core Jobs services and required Prisma authority provider. |
| `openspec/changes/SPEC-0028-jobs-background-processing-platform/apply-7.2-core-engine.md` | Created | This bounded evidence artifact. |

## Compatibility and tenant-isolation notes

- Definitions remain the authority for queue name, attempts, backoff, and
  concurrency; JobsClient does not accept caller-supplied queue policy.
- Payload fields cannot replace trusted envelope context. A conflicting
  payload tenant is rejected before execution.
- The active-tenant check runs immediately before handler invocation.
- Handler execution receives the trusted context and schema-parsed data only;
  no producer or domain handler was migrated.
- No generic job persistence, schema/migration, Identity behavior, notification
  scheduler, standalone worker, or tenant doorbell was added.
- Real Redis and real-DB tenant harnesses remain outside this seam; Redis outage
  behavior is unit-tested and the real tenant proof remains downstream 7.5.

## Bounded mechanical corrections and deviations

The following already-created Foundation paths were changed only because the
approved 7.2.2 lifecycle behavior could not be wired otherwise:

1. `jobs-lifecycle.service.ts` was extended with the assigned execution,
   retry-classification, bounded shutdown, and metrics behavior.
2. `jobs.contracts.ts` owns `JobsTerminalError` so tenant authority and lifecycle
   share the error without a circular runtime import.
3. `jobs.module.ts` registers the newly created core providers so Nest can
   construct the API-process Jobs services.

These are strictly necessary, mechanical core wiring corrections; they do not
change the approved architecture, public package surface, tenant boundary, or
rollback seam. No other deviation was made.

## Rollback boundary

Revert only the second chained seam: remove `jobs-client.service.ts`,
`jobs-tenant-authority.service.ts`, and the two core test files; restore the
Foundation lifecycle/contracts/module versions recorded by
`apply-7.1-foundation.md`. Preserve the Foundation root extraction, queue
identities/options, unrelated work, domain records, schema, migrations, and
Identity state.

## Validators and unexpected files

- Focused Jobs tests: PASS — 10/10.
- API build: PASS.
- API lint: PASS.
- Unexpected files within the approved Jobs/core seam: **none**.
- Unexpected dependencies: **none**; no package or lockfile changes.
- Design, Tasks, review, Workload Guard, Activity Timeline, Identity,
  notifications, schema/migrations, packages, and Git state were not modified
  by this seam beyond the already-completed Foundation state.

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | PASS — 2 suites / 10 tests |
| Runtime harness | N/A for this bounded unit — client/lifecycle tests use mocked queue/authority boundaries; real Redis/API boot and tenant DB harnesses are downstream integration/doorbell work. |
| Rollback boundary | Revert only the core Jobs services/tests and restore Foundation lifecycle/contracts/module wiring. |

## Canonical next action

**Apply 7.3 Feature Implementation only** (`7.3.1 RED` then `7.3.2 GREEN`),
using the approved next chained seam. Do not begin 7.4, 7.5, 7.6, or Verify
from this handoff.
