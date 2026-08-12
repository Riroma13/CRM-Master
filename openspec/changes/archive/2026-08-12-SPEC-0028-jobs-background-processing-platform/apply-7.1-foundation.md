# Apply 7.1 Foundation Evidence

> **SPEC:** SPEC-0028-jobs-background-processing-platform
> **Nested Apply:** 7.1 Foundation
> **Status:** PASS — bounded handoff to Apply 7.2
> **Delivery:** Chained PR slice, `stacked-to-main`
> **Executor:** MID / BUILDER — project-local Direct wiring
> **Date:** 2026-08-11

## Scope and provenance

This artifact records only Apply 7.1.1–7.1.2 from the approved Tasks artifact.
The approved Design, Architecture Review PASS, Tasks Review PASS, and READY
Workload Guard were consumed before implementation. The first approved chained
seam was used: Foundation only. `design.md`, `architecture-review.md`,
`tasks.md`, `tasks-review.md`, and `workload-guard.md` were not modified.

No Apply 7.2, 7.3, 7.4, 7.5, 7.6, Verify, Archive, Health Report, Repository
Ready, or Git operation was performed.

## Substep status

| Substep | Result | Evidence |
|---|---|---|
| 7.1.1 RED | PASS | Extended the Activity Timeline Redis test; the new ownership assertion failed before production changes because Activity Timeline contained `BullModule.forRoot`. |
| 7.1.2 GREEN | PASS | Added the fail-closed Jobs Redis root/configuration, typed contracts, `JobsModule`, lifecycle provider, and removed Activity Timeline root/config ownership while retaining queue registrations/options. |

## RED → GREEN evidence

| Stage | Command | Exact result |
|---|---|---|
| Safety net | `pnpm --filter api test -- --runInBand src/modules/activity-timeline/__tests__/activity-timeline-redis-connection.spec.ts` | PASS — 1 suite, 3 tests |
| RED | Same focused command after 7.1.1 test extension and before production changes | FAIL — 1 of 4 tests failed; ownership assertion found `BullModule.forRoot` in Activity Timeline |
| GREEN | Same focused command after 7.1.2 implementation | PASS — 1 suite, 4 tests |
| Build | `pnpm --filter api build` | PASS |
| Lint | `pnpm --filter api lint` | PASS |
| Governance validator | `pnpm sdd:validate` | PASS — CRM-SDD governance validation |
| Diff hygiene | `git diff --check` | PASS |

Triangulation was not added as a separate test file: this bounded unit is
configuration, type, module, and lifecycle foundation work; the lifecycle
behavior scenarios belong to the approved downstream 7.2.1 RED task.

## Files changed

| File | Action | Bounded change |
|---|---|---|
| `apps/api/src/modules/jobs/jobs-redis.config.ts` | Created | Fail-closed `REDIS_URL` connection factory. |
| `apps/api/src/modules/jobs/jobs.contracts.ts` | Created | Trusted context, typed definition/client, and worker lifecycle contracts. |
| `apps/api/src/modules/jobs/jobs-lifecycle.service.ts` | Created | Registers workers and pauses then closes them during application shutdown. |
| `apps/api/src/modules/jobs/jobs.module.ts` | Created | Owns the single BullMQ root and exports the lifecycle provider. |
| `apps/api/src/modules/activity-timeline/__tests__/activity-timeline-redis-connection.spec.ts` | Modified | RED ownership regression and Jobs configuration coverage. |
| `apps/api/src/modules/activity-timeline/activity-timeline.module.ts` | Modified | Removed local `BullModule.forRoot`; retained queue registrations and options. |
| `apps/api/src/modules/activity-timeline/activity-timeline-queue.constants.ts` | Modified | Retained queue identities; removed local Redis configuration ownership. |
| `openspec/changes/SPEC-0028-jobs-background-processing-platform/apply-7.1-foundation.md` | Created | This bounded evidence artifact. |

## Compatibility and tenant-isolation evidence

- Activity Timeline queue identities remain `activity-timeline-ingestion` and
  `activity-timeline-dlq`.
- Existing Activity Timeline attempts, backoff, and removal options remain
  unchanged.
- Identity behavior, Identity outbox/DLQ ownership, producers, handlers,
  schema, migrations, and tenant behavior were not modified.
- No tenant data path was introduced in Foundation. The approved tenant
  isolation proof remains the downstream 7.5 doorbell and is not claimed here.

## Rollback boundary

Revert only the Foundation slice: remove `apps/api/src/modules/jobs/` and
restore the Activity Timeline Redis configuration function and its
`BullModule.forRoot` ownership, while preserving all unrelated work and the
existing Activity Timeline queue identities/options. No queue, domain record,
schema, migration, or Identity state is deleted.

## Unexpected files and dependencies

- Unexpected files within the approved Foundation Working Set: **none**.
- Unexpected dependencies: **none**; no package or lockfile changes.
- Required bounded deviation: **none**.
- `tasks.md` checkbox state was intentionally left unchanged because the user
  explicitly prohibited modifying the approved Tasks artifact; this evidence
  artifact is the exact Apply 7.1 progress record.

## Canonical next action

**Apply 7.2 Core Engine only** (`7.2.1 RED` then `7.2.2 GREEN`), using the next
approved chained seam. Do not begin later Apply substeps or Verify from this
handoff.
