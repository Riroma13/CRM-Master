# Apply 7.5.2 Doorbell GREEN Evidence

> **SPEC:** SPEC-0028-jobs-background-processing-platform
> **Nested Apply:** 7.5.2 GREEN
> **Status:** PASS — maintainer recovery resolved the external generated-file stop; handoff to Apply 7.5.3 REFACTOR
> **Delivery:** Third chained PR slice, `stacked-to-main`
> **Executor:** MID / BUILDER — project-local Direct wiring
> **Date:** 2026-08-11

## Scope and provenance

Consumed PASS `apply-7.5.1-doorbell-red.md`, approved Design §§5/12/14/17,
Tasks 7.5.1–7.5.2, PASS Tasks Review, and READY HUMAN-approved Workload Guard.
The intentional 7.5.1 RED history is preserved. The worker/tenant behavior was
implemented only in approved Jobs files and the approved doorbell test.

Execution stopped after generation verification revealed tracked generated
files outside the approved 7.5.2 Working Set. API build/lint and full regression
gates were not started after that stop. No 7.5.3, 7.6, Verify, or downstream
phase was started.

## RED → GREEN evidence

| Stage | Command | Exact result |
|---|---|---|
| Prior RED | `pnpm --filter api test:e2e -- jobs-tenant-isolation.e2e-spec.ts` | PASS after GREEN implementation — 1 suite, 4 tests passed, 0 failed. |
| Jobs unit regression | `pnpm --filter api test -- --runInBand src/modules/jobs/__tests__/jobs-client.spec.ts src/modules/jobs/__tests__/jobs-lifecycle.spec.ts` | PASS — 2 suites, 10 tests passed, 0 failed. |
| Generation | `pnpm --filter @crm-master/database generate && pnpm --filter @crm-master/database generate:scope:verify` | Commands PASS; generator reported files up to date, but tracked generated files became modified outside the approved Working Set. Stop condition triggered. |

The GREEN behavior proven before the stop includes trusted envelope validation,
active-tenant authority, terminal rejection for invalid/forged/inactive
contexts, and `PrismaService.forTenant(tenantId)` invocation before effects.

## Unexpected files / blocker

Generation changed these tracked paths, none of which are approved for this
bounded action:

- `packages/database/prisma/generators/tenant-scope/generated/tenant-metadata.json`
- `packages/database/prisma/generators/tenant-scope/generated/tenant-models.ts`
- `packages/database/prisma/generators/tenant-scope/generated/tenant-scope.spec.ts`

Per the execution boundary, this is a **BLOCKED / scope stop**, not baseline
debt and not silently absorbed. The generated-file changes were not edited,
normalized, discarded, or staged by this executor.

## Files changed before the stop

| File | Action | Bounded change |
|---|---|---|
| `apps/api/src/modules/jobs/jobs-lifecycle.service.ts` | Modified | Validates the envelope, rechecks active tenant, invokes scoped reload, and terminalizes invalid/authority failures. |
| `apps/api/src/modules/jobs/jobs-tenant-authority.service.ts` | Modified | Exposes the approved scoped-client reload through `PrismaService.forTenant`. |
| `apps/api/src/modules/jobs/__tests__/jobs-lifecycle.spec.ts` | Modified | Mechanically updates the authority test double for scoped reload. |
| `apps/api/test/doorbell/jobs-tenant-isolation.e2e-spec.ts` | Modified | Uses a prototype spy to observe the module-scoped `PrismaService.forTenant` call. |
| `openspec/changes/SPEC-0028-jobs-background-processing-platform/apply-7.5.2-doorbell-green.md` | Created | This blocked evidence artifact. |

No Identity, notifications, schema, migrations, producers, standalone worker,
packages, lockfiles, Design/Tasks/reviews/Workload Guard, or Git operations were
performed. The generated package paths above were changed by the approved
verification command and are the unexpected external state requiring recovery.

## Tenant-isolation evidence

- Cross-tenant payload: denied.
- Forged tenant context: denied.
- Inactive tenant: denied.
- Active tenant scoped reload: `PrismaService.forTenant(TENANT_A_ID)` observed
  before handler effects.
- Real-DB harness was available and exercised; no mocked fallback was used.

## Validators not run after stop

- API build: **NOT RUN after generation stop**.
- API lint: **NOT RUN after generation stop**.
- Full regression gates: **NOT RUN after generation stop**.
- No baseline debt classification is made because the bounded action stopped at
  the unexpected generated-file mutation.

## Rollback boundary

The intended 7.5.2 rollback is limited to the approved Jobs lifecycle/authority
and doorbell changes listed above. The three generated package paths require a
separate maintainer/orchestrator recovery decision because they are outside this
Working Set; this executor does not discard or restore them.

## Deviations

- No implementation deviation from the approved worker behavior.
- Mechanical test-spy adjustment was necessary to observe the module-scoped
  Prisma provider while preserving the same `forTenant` acceptance assertion.
- External generated-file mutation is the sole blocker.

## Generated-scope causality check

The requested bounded reconciliation check was performed before any recovery
write. The exact generated diff is limited to the `Generated`/`timestamp`
metadata in all three files:

- `tenant-metadata.json`: timestamp only, `2026-07-30T16:41:27.951Z` → `2026-08-11T21:47:32.108Z`.
- `tenant-models.ts`: generated timestamp comment only; model content unchanged.
- `tenant-scope.spec.ts`: generated timestamp comment only; test/content unchanged.

The source comparisons contain no active diff for
`packages/database/prisma/schema.prisma` or
`packages/database/prisma/generators/tenant-scope/generator.ts`. The approved
SPEC-0028 Design explicitly excludes schema/migrations and the Tasks Working
Set excludes all package generator outputs (`design.md:57-62`; `tasks.md:17-20`).
Therefore these changes are deterministic timestamp refreshes caused by
invoking the generator, not consequences of an approved SPEC-0028
schema/generator source change. They are unrelated to SPEC-0028 under the
user's recovery rule.

No generated output was reconciled, added to the Working Set, restored,
discarded, staged, or otherwise changed by this check.

## Maintainer recovery record

The HUMAN / MAINTAINER restored the unrelated timestamp-only generated-scope
diffs outside this execution. Recovery was verified before continuing:

- The three generated tenant-scope paths have no working-tree changes.
- All remaining tracked modifications are within the approved SPEC-0028
  implementation Working Set.
- Remaining untracked files are the approved SPEC-0028 Jobs files, doorbell,
  and canonical change-directory artifacts.
- `pnpm sdd:validate` — **PASS**.

The generated tenant-scope outputs remain excluded from SPEC-0028 and are not
modified by the resumed Apply work unless a new causal source change is proven.

## Canonical next action

The external recovery is resolved without Working Set expansion. The canonical
next action is **Apply 7.5.3 REFACTOR** only.
