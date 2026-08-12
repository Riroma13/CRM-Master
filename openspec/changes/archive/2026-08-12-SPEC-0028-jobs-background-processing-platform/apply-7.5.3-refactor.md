# Apply 7.5.3 REFACTOR Evidence

> **SPEC:** SPEC-0028-jobs-background-processing-platform
> **Nested Apply:** 7.5.3 REFACTOR
> **Status:** PASS — bounded refactor complete; handoff to Apply 7.6
> **Delivery:** Third chained PR slice, `stacked-to-main`
> **Executor:** MID / BUILDER — project-local Direct wiring
> **Date:** 2026-08-11

## Scope and provenance

Consumed the approved Design Working Set and Read Order, PASS Apply 7.1–7.4
evidence, PASS `apply-7.5.1-doorbell-red.md`, recovered PASS
`apply-7.5.2-doorbell-green.md`, PASS Tasks Review, READY HUMAN-approved
Workload Guard, and its maintainer recovery record. The three generated
tenant-scope outputs were clean before execution and were not touched.

Only the approved 7.5.3 REFACTOR task was executed. No Design, Architecture
Review, Tasks, Tasks Review, Workload Guard, prior Apply evidence, schema,
migration, generated tenant-scope output, Identity, notifications, producers,
standalone worker, package, lockfile, Git, 7.6, Verify, Archive, Health Report,
or Repository Ready operation was performed.

## Exact refactor changes

1. Removed the unused generic parameter from the internal `JobEnvelope` type
   and its validation helper in `jobs-lifecycle.service.ts`.
2. Removed the dead `JobsValidationError` scaffolding and its unreachable error
   classification branch; terminal behavior remains governed by
   `JobsTerminalError` and Zod validation as before.
3. Removed the doorbell's no-database fallback test scaffold. The approved
   real-DB doorbell now always exercises the required real application/Prisma
   path and cannot report a synthetic `NEEDS_EVIDENCE` pass.

No queue policy, queue identity, tenant authority, scoped reload, handler
boundary, retry classification, health contract, or metrics label contract was
changed.

## RED → GREEN → REFACTOR evidence

| Stage | Command / evidence | Exact result |
|---|---|---|
| Prior RED | `apply-7.5.1-doorbell-red.md` | PASS evidence preserved: real-DB doorbell had 3 passing assertions and the intentional scoped-reload failure. |
| Prior GREEN | `apply-7.5.2-doorbell-green.md` | PASS evidence recovered: worker validation, active-tenant authority, terminal denial, and `PrismaService.forTenant` scoped reload; 2 Jobs suites / 10 tests and doorbell 1 suite / 4 tests passed. |
| Refactor safety net | `pnpm --filter api test -- --runInBand src/modules/jobs/__tests__/jobs-client.spec.ts src/modules/jobs/__tests__/jobs-lifecycle.spec.ts` | PASS — 2 suites, 10 tests, 0 failures. |
| Refactor wiring regression | `pnpm --filter api test -- --runInBand src/modules/activity-timeline/__tests__/activity-timeline-redis-connection.spec.ts` | PASS — 1 suite, 6 tests, 0 failures. |
| Refactor health/metrics regression | `pnpm --filter api test -- --runInBand src/modules/observability/__tests__/metrics-registry.spec.ts` | PASS — 1 suite, 10 tests, 0 failures. |
| Refactor real-DB doorbell | `pnpm --filter api test:e2e -- jobs-tenant-isolation.e2e-spec.ts` | PASS — 1 suite, 4 tests, 0 failures; real DB branch exercised. |

During the first post-edit Jobs/metrics run, TypeScript reported the expected
mechanical stale generic reference (`TS2315` at the private envelope helper).
The single bounded correction removed that remaining type argument; the
complete focused rerun passed. No production behavior or scope changed.

## Tenant and queue compatibility

- Cross-tenant payload, forged context, and inactive tenant execution remain
  terminally denied.
- Active execution still revalidates authority and calls
  `PrismaService.forTenant(TENANT_A_ID)` before handler effects.
- Activity Timeline queue identities remain `activity-timeline-ingestion` and
  `activity-timeline-dlq`; attempts, backoff, delay, and removal options remain
  asserted and passing.
- Jobs definitions still own queue policy, attempts, backoff, and concurrency;
  no producer or Identity outbox/DLQ behavior changed.
- Metrics remain aggregate and redacted: no payload, tenant, correlation, or
  job-data labels were introduced.

## Working Set and unchanged-file audit

Files modified by this bounded refactor:

| File | Action | Change |
|---|---|---|
| `apps/api/src/modules/jobs/jobs-lifecycle.service.ts` | Modified | Removed unused generic/error scaffolding; preserved execution and terminal behavior. |
| `apps/api/test/doorbell/jobs-tenant-isolation.e2e-spec.ts` | Modified | Removed the synthetic no-DB fallback; retained all four real-DB assertions. |
| `openspec/changes/SPEC-0028-jobs-background-processing-platform/apply-7.5.3-refactor.md` | Created | This exact refactor evidence. |

The generated tenant-scope paths remain clean. No files outside the approved
17-path Working Set plus this canonical evidence artifact changed. No package,
lockfile, Prisma schema/migration, Identity, notification, producer, or
standalone-worker dependency was added.

## Rollback boundary

Revert only the two implementation/test changes listed above and restore the
prior 7.5.2 versions. This removes cleanup and restores the prior doorbell
fallback without removing Jobs worker behavior, tenant authority, queue state,
domain records, schema, migrations, Identity state, or generated outputs.

## Baseline debt and conditions

- No new baseline debt was found. All required focused checks passed.
- TR-004 remains a non-blocking condition: future domain adoption must choose
  and test conservative per-definition concurrency values.
- TR-005 remains satisfied by the recorded HUMAN `stacked-to-main` decision;
  no Size Exception was used.
- The protected SPEC-0028 Design-validator notice remains the previously
  recorded non-blocking condition and was not re-run or reinterpreted.

## Deviations and blockers

- **Bounded mechanical correction:** removed the stale generic type argument
  exposed by the refactor; required to restore compilation and did not alter a
  contract or boundary.
- **No material deviation:** the fallback removal and dead scaffolding cleanup
  are inside the approved doorbell/Jobs Working Set.
- **Unexpected files/dependencies:** none.
- **Blockers:** none for this nested work unit.

## Canonical next action

**Apply 7.6 only** — record the consolidated Apply Summary. Do not begin
Verify, Archive, Health Report, Repository Ready, or any Git operation.
