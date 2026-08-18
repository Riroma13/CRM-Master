# Apply 7.1 Foundation Evidence

> Nested Apply: 7.1 Foundation
> Status: PASS — guard authority boundary complete
> Delivery: Chained PR slice, `feature-branch-chain`
> Executor: MID / BUILDER — project-local Direct wiring

## Boundary

Consumed the refined Design, refined Tasks, fresh PASS Tasks Review, PASS
Workload Guard with HUMAN Chained PR approval, and the exact Tasks Read Order.
No secondary file was changed; no schema, migration, service, mapper, global
guard, token-management, or Git artifact was touched.

## RED → GREEN → REFACTOR

| Stage | Evidence | Result |
|---|---|---|
| Safety net | Focused baseline: 6 suites / 38 tests passed before edits | PASS |
| RED | Added selector, Host, overwrite, provenance, and persisted-token guard cases; focused run failed 4 new cases | PASS |
| GREEN | `pnpm --filter api test -- token-auth.guard` | PASS — 1 suite / 10 tests |
| TRIANGULATE | Query selector, Host conflict/agreement, and pre-existing request tenant use distinct paths | PASS |
| REFACTOR | Guard conflict checks remain before trusted context assignment; focused suite reran green | PASS |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `pnpm --filter api test -- token-auth.guard` — 1 suite / 10 tests passed |
| Runtime harness | N/A for unit guard boundary; real HTTP is required and recorded in 7.5 |
| Rollback boundary | Revert only `token-auth.guard.ts` and `token-auth.guard.spec.ts` |

## Files

- `apps/api/src/modules/public-api/auth/token-auth.guard.ts` — token tenant authority, Host/selector conflict denial, provenance.
- `apps/api/src/modules/public-api/__tests__/token-auth.guard.spec.ts` — RED/GREEN guard isolation evidence.

## Unexpected files / dependencies / deviations

None. No conditional secondary file was needed: no RED failure proved compatibility plumbing in token service or middleware.

## Canonical next action

Apply 7.2 Core Engine only.
