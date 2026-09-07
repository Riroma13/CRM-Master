# Apply 7.4 Integration: fresh-db-bootstrap-production-path

## Outcome

**Status:** PASS  
**Role:** MID / BUILDER  
**Scope:** Apply 7.4 Integration; completed integration portions of Tasks 3.1 and 3.3.  
**Delivery:** stacked-to-main integration work unit (`auto-chain`).

## Completed work

- Wired the checked-in v1 manifest and all assets through a real package-relative
  executor with digest verification before target mutation.
- Added PostgreSQL 16 target probing through safe environment-based connection
  variables, rejecting maintenance/template, non-empty, ledgered, and altered
  targets before SQL or Prisma mutation.
- Added safe argument-array `psql` and Prisma subprocess wiring, including the
  required transaction boundary for SQL components and no transaction wrapper
  for the role/DDL component.
- Kept component order manifest-driven, resolved lexical historical migrations,
  then ran status and deploy; failures stop the sequence.
- Extended immutable historical snapshots to every migration SQL file and
  `migration_lock.toml`.
- Accepted pnpm's separator marker only as the fixed invocation wrapper around
  the sole `--confirm-fresh` option; arbitrary options remain rejected.
- Marked Tasks 3.1 and 3.3 complete. No historical migration, schema, tenant
  isolation, application, or SDD runtime file was changed.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.1 | `scripts/__tests__/bootstrap-fresh-postgres.test.ts` | Unit / subprocess contract | ✅ 21 tests baseline before final wiring | ✅ Added fixed argument and manifest integration cases first | ✅ 21 tests passed; disposable command exited 0 | ✅ Invalid options, fixed paths, failure stop, and ordered stages cover distinct paths | ✅ Extracted manifest verification, command builders, target assertions, and fixed path helpers |
| 3.3 | `scripts/__tests__/bootstrap-fresh-postgres.test.ts` | Unit | ✅ Historical snapshot tests preserved | ✅ Existing RED snapshot contract preceded implementation | ✅ Snapshot mismatch and lock-inclusive runtime path pass | ✅ Matching and altered byte maps covered | ✅ Snapshot helper reused for async production wiring |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `pnpm --filter @crm-master/database test -- scripts/__tests__/bootstrap-fresh-postgres.test.ts` — PASS, 1 file, 21 tests |
| TypeScript | Targeted strict `tsc --noEmit` for `scripts/bootstrap-fresh-postgres.ts` — PASS |
| Manifest/assets | SHA-256 validation script — PASS for all five components and 15 historical migration SQL assets; schema/reporting anchors match |
| Runtime harness | `pnpm --filter @crm-master/database db:bootstrap:fresh -- --confirm-fresh` against disposable `pgvector/pgvector:pg16` PostgreSQL 16 — PASS, exit 0; credentials were process-only and output was secret-free |
| Runtime limitation | Catalog-count assertions and rerun-after-mutation qualification remain assigned to Apply 7.5; no claim is made here beyond successful command integration |
| Lint | N/A — `@crm-master/database` has no lint script or configured ESLint target |
| History immutability | PASS — migration SQL and `migration_lock.toml` are snapshotted before/after and repository diff check passed |
| Tenant isolation | PASS — no scoped query/data mutation; tenant columns/indexes and doorbell gate unchanged |
| Rollback boundary | Revert only the bootstrap executor, focused tests, package command (if desired), completed 3.1/3.3 checkboxes, and this artifact; preserve all historical migrations/assets and unrelated active changes |

## Deviations

- **Bounded mechanical invocation correction:** pnpm forwards `--` to the
  package executable; the entrypoint accepts that separator only when followed
  by the single fixed `--confirm-fresh` flag. No arbitrary option is accepted.
- **Bounded operational connection correction:** `psql` does not consume
  `DATABASE_URL` automatically, so the executor derives process-only `PG*`
  environment variables from the validated URL rather than placing credentials
  in argument arrays.

## Apply Summary

Apply 7.4 integration is green: the manifest/assets are wired to a real
fail-closed command, target preflight precedes mutation, SQL and Prisma calls
use fixed argument arrays and bounded paths, transaction semantics are
preserved, and historical byte snapshots include the lock file. Disposable
PostgreSQL 16 command integration passed. Catalog-depth qualification and
remaining integration/testing gates are intentionally deferred to Apply 7.5.

**Legal next action:** Apply 7.5 Testing.
