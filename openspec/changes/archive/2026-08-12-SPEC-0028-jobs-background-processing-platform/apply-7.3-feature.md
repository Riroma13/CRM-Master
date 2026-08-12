# Apply 7.3 Feature Implementation Evidence

> **SPEC:** SPEC-0028-jobs-background-processing-platform
> **Nested Apply:** 7.3 Feature Implementation
> **Status:** PASS — bounded handoff to Apply 7.3.3 RED
> **Delivery:** Chained PR slice, `stacked-to-main`
> **Executor:** MID / BUILDER — project-local Direct wiring
> **Date:** 2026-08-11

## Scope and provenance

The existing `apply-7.2-core-engine.md`, approved Design §§5/6/11/14,
approved Tasks 7.3.1–7.3.2, PASS Tasks Review, and READY HUMAN-approved
Workload Guard were consumed before the bounded target reads. Completed SDD
artifacts remain unchanged.

Execution stopped when 7.3.2 required a Jobs-provider readiness API that does
not exist in the completed 7.2 provider. Adding that API requires modifying
`apps/api/src/modules/jobs/jobs-lifecycle.service.ts`, which is outside the
explicit 7.3 allowed paths. The workflow requires stopping rather than
silently broadening the Working Set.

The prior 7.3.1 RED attempt is preserved below. This recovery executed only
7.3.2 GREEN. No 7.3.3 RED, 7.4, 7.5, 7.6, Verify, Archive, Health Report,
Repository Ready, or Git operation was performed.

## Substep status

| Substep | Result | Evidence |
|---|---|---|
| 7.3.1 RED | PASS | Added metrics label/redaction assertions and health readiness assertions to the approved metrics test. The focused test fails before implementation because the aggregate metrics and HealthController Jobs-provider constructor contract do not yet exist. |
| 7.3.2 GREEN | PASS | Added aggregate redacted job metrics, exposed the Jobs-provider readiness result from `JobsLifecycleService`, and replaced HealthController Redis `unknown` with the provider result. |

## RED evidence

| Command | Exact result |
|---|---|
| Safety net: `pnpm --filter api test -- --runInBand src/modules/observability/__tests__/metrics-registry.spec.ts` | PASS — 1 suite, 7 tests |
| 7.3.1 RED: same focused metrics command after test additions | FAIL as intended — TypeScript reports missing `jobDuration`, `jobFailuresTotal`, `activeJobs`, and the missing third Jobs-provider constructor argument; 0 tests executed. |

The RED assertions cover:

- aggregate job duration, failure, and active-work metrics;
- queue/job/error labels only;
- absence of `payload`, `tenantId`, `correlationId`, and `jobData` labels/output;
- Jobs-provider Redis readiness replacing `unknown`;
- degraded health when the provider reports Redis failure.

## GREEN evidence

| Command | Exact result |
|---|---|
| `pnpm --filter api test -- --runInBand src/modules/observability/__tests__/metrics-registry.spec.ts` | PASS — 1 suite, 10 tests passed, 0 failed. |
| `pnpm --filter api build` | PASS |
| `pnpm --filter api lint` | PASS |

The preserved RED assertions now prove aggregate metrics, label redaction,
provider readiness, and degraded Redis health behavior.

Additional bounded validators:

- `pnpm sdd:validate` — **PASS**.
- `git diff --check` — **PASS**.

## Files changed in this bounded action

| File | Action | Bounded change |
|---|---|---|
| `apps/api/src/modules/observability/__tests__/metrics-registry.spec.ts` | Modified | 7.3.1 RED metrics redaction and health readiness assertions. |
| `apps/api/src/modules/observability/metrics/metrics-registry.ts` | Modified | Added duration, failure, and active-job aggregate metrics with bounded labels. |
| `apps/api/src/modules/jobs/jobs-lifecycle.service.ts` | Modified | Exposed the Jobs-provider Redis-readiness result required by 7.3.2. |
| `apps/api/src/modules/health/health.controller.ts` | Modified | Uses Jobs readiness for Redis/jobs checks instead of `unknown`. |
| `apps/api/src/modules/health/health.module.ts` | Modified | Imports the approved Jobs provider module for HealthController injection. |
| `openspec/changes/SPEC-0028-jobs-background-processing-platform/apply-7.3-feature.md` | Modified | Preserved blocked-attempt history and recorded final GREEN evidence. |

The prior Foundation/Core changes visible in the worktree are preserved and
are not attributed to this action.

## Compatibility, tenant, and label notes

- Job metrics use only queue/job/error-type labels; payload, tenant, and
  correlation fields are not metric labels.
- No tenant data path, Identity behavior, producer, schema/migration, or
  standalone worker was touched.
- Health readiness is reported from the existing Jobs provider contract; missing
  `REDIS_URL` returns `redis: error` and `jobs: degraded`.

## Rollback boundary

Revert only the 7.3 telemetry/health changes in the five listed implementation
files and remove this evidence artifact. No production behavior or prior Apply
7.1/7.2 state is removed.

## Deviations and blockers

- **Recovery-resolved scope:** the prior executor-local narrowing is preserved
  as history. The approved recovery explicitly authorized the mechanical
  `jobs-lifecycle.service.ts` readiness extension; no new path was added.
- No unexpected dependencies or files were introduced.

## Bounded recovery record

The stop above was caused by the executor's narrower per-action path
restriction, not by a contradiction in the approved SPEC. The approved Design
Working Set includes `apps/api/src/modules/jobs/jobs-lifecycle.service.ts`
(`design.md:40`), and the approved Workload Guard assigns lifecycle behavior,
metrics, and health readiness to the same second `stacked-to-main` seam
(`workload-guard.md:67`). Tasks 7.3.2 explicitly requires the Jobs-provider
result.

The bounded scope was resolved without broadening the approved Working Set:
the existing `JobsLifecycleService` was extended only with the mechanical
Redis-readiness/provider result required by 7.3.2. No new path, public package
contract, architecture boundary, tenant-isolation rule, or downstream phase
was authorized by this recovery. The prior RED assertions and blocked evidence
remain preserved, and GREEN now passes.

## Canonical next action

The bounded scope decision is recorded above. **Apply 7.3.2 GREEN is PASS.**
The canonical next action is **Apply 7.3.3 RED** only. Do not begin 7.4 or
later phases from this handoff.
