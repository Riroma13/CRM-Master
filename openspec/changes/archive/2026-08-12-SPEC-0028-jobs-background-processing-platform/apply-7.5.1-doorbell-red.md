# Apply 7.5.1 Doorbell RED Evidence

> **SPEC:** SPEC-0028-jobs-background-processing-platform
> **Nested Apply:** 7.5.1 RED
> **Status:** PASS — RED evidence recorded; handoff to Apply 7.5.2 GREEN
> **Delivery:** Third chained PR slice, `stacked-to-main`
> **Executor:** MID / BUILDER — project-local Direct wiring
> **Date:** 2026-08-11

## Scope and provenance

Consumed PASS `apply-7.4-integration.md`, approved Design §§12/14/17, Tasks
7.5.1–7.5.2, PASS Tasks Review, and READY HUMAN-approved Workload Guard before
the bounded implementation read. The existing Identity doorbell harness was
followed. All completed SDD artifacts remain unchanged.

Only the approved real-DB doorbell RED test was created. No production worker
behavior was modified. Apply 7.5.2 GREEN, 7.5.3 REFACTOR, 7.6, Verify, Archive,
Health Report, Repository Ready, and Git operations were not started.

## Environment classification

`DATABASE_URL` or `DATABASE_TEST_URL` was available: the real-DB branch of the
doorbell executed. No fallback or mocked database harness was invented.

## RED scenarios

Created `apps/api/test/doorbell/jobs-tenant-isolation.e2e-spec.ts` using the real
`AppModule`, `PrismaService`, and `JobsLifecycleService` pipeline. Assertions
cover:

1. Tenant A cannot execute an envelope carrying tenant B's target context.
2. A forged tenant context is rejected even while both tenants are active.
3. An inactive tenant is denied before handler execution.
4. Active execution must reload through `PrismaService.forTenant(tenantId)`
   before invoking effects.

The first three assertions pass against the current implementation. The fourth
fails as intended because the current worker path does not yet call
`PrismaService.forTenant`; that is the approved 7.5.2 GREEN behavior.

## Exact RED evidence

| Stage | Command | Exact result |
|---|---|---|
| 7.5.1 RED | `pnpm --filter api test:e2e -- jobs-tenant-isolation.e2e-spec.ts` | Expected RED — 1 suite, 4 tests: 3 passed, 1 failed. Failure: expected `PrismaService.forTenant(TENANT_A_ID)`, received 0 calls. |

The command exited non-zero because the scoped-reload assertion intentionally
proves the missing 7.5.2 production behavior. Nest emitted unrelated
ActivityTimeline processor FK error logs from existing queued work during app
startup; they did not determine the asserted test failure and no existing
production behavior was changed.

## Files changed

| File | Action | Bounded change |
|---|---|---|
| `apps/api/test/doorbell/jobs-tenant-isolation.e2e-spec.ts` | Created | Approved real-DB cross-tenant, forged-context, inactive-tenant, and scoped-reload RED doorbell. |
| `openspec/changes/SPEC-0028-jobs-background-processing-platform/apply-7.5.1-doorbell-red.md` | Created | This exact bounded RED evidence artifact. |

## Tenant-isolation and compatibility notes

- The test uses real `AppModule` boot and real Prisma tenant clients.
- Cross-tenant and inactive authority failures are asserted as terminal denials.
- The scoped reload assertion explicitly requires `PrismaService.forTenant`;
  no unscoped client or mocked substitute is accepted.
- Identity, queue policy, Activity Timeline registrations/options, notifications,
  schema/migrations, producers, and standalone worker topology are untouched.

## Rollback boundary

Remove only `apps/api/test/doorbell/jobs-tenant-isolation.e2e-spec.ts` and this
evidence artifact. No production behavior, tenant data, schema, migration, or
prior Apply 7.1–7.4 state is removed.

## Deviations and blockers

- Deviations: **none**.
- Unexpected files/dependencies: **none**.
- Missing database environment: **not applicable**; the required real-DB
  environment was available and exercised.
- The single failing scoped-reload assertion is the intentional RED gate for
  7.5.2 GREEN, not baseline debt.

## Canonical next action

**Apply 7.5.2 GREEN only** — implement the approved worker validation,
execution-time tenant authority, scoped `PrismaService.forTenant` reload, and
terminal failure behavior, then rerun this doorbell. Do not begin 7.5.3, 7.6,
Verify, or later phases.
