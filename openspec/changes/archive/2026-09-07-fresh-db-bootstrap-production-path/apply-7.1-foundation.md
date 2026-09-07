# Apply 7.1 Foundation: fresh-db-bootstrap-production-path

## Outcome

**Status:** PASS  
**Role:** MID / BUILDER  
**Scope:** Tasks 1.1–1.3 only; RED/Foundation contract tests.  
**Delivery:** stacked-to-main Foundation work unit (`auto-chain`).

## Completed work

- Added `packages/database/scripts/__tests__/bootstrap-fresh-postgres.test.ts`.
- Marked Tasks 1.1, 1.2, and 1.3 complete in `tasks.md`.
- No bootstrap implementation, SQL asset, manifest, package script, Prisma
  migration, or migration lock was added or changed.

The focused contract covers explicit confirmation, URL and PostgreSQL version,
manifest version and fixed-path/digest validation, maintenance/non-empty/user-
object/ledgered rejection, secret-free diagnostics, altered-target rerun
rejection, first-failure stopping, exact stage ordering, lexical migration
resolution, fresh-only resolve behavior, and before/after historical byte
snapshots including `migration_lock.toml`.

## TDD Cycle Evidence

| Task | Test file | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `scripts/__tests__/bootstrap-fresh-postgres.test.ts` | Unit | N/A (new) | ✅ Written; module intentionally absent | Deferred to approved later implementation slice | ✅ Invalid and valid request/manifest paths | ➖ None needed |
| 1.2 | `scripts/__tests__/bootstrap-fresh-postgres.test.ts` | Unit | N/A (new) | ✅ Written; module intentionally absent | Deferred to approved later implementation slice | ✅ ordered success, first failure, and unsafe target paths | ➖ None needed |
| 1.3 | `scripts/__tests__/bootstrap-fresh-postgres.test.ts` | Unit | N/A (new) | ✅ Written; module intentionally absent | Deferred to approved later implementation slice | ✅ matching and altered snapshot paths | ➖ None needed |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `pnpm --filter @crm-master/database test -- scripts/__tests__/bootstrap-fresh-postgres.test.ts` — expected RED: 1 failed suite during module collection (`Cannot find module '../bootstrap-fresh-postgres'`); no production module exists in this Foundation slice. |
| Runtime harness | N/A — this slice contains contract tests only; disposable PostgreSQL qualification belongs to the approved asset/engine slices. |
| Rollback boundary | Revert only `packages/database/scripts/__tests__/bootstrap-fresh-postgres.test.ts` and the three completed-task checkbox changes in `tasks.md`. |
| History immutability | SHA-256 snapshot command covered all 15 historical `migration.sql` files plus `migration_lock.toml`; before/after source state was unchanged. |
| Repository hygiene | `git diff --check` — PASS. |
| Tenant isolation | No scoped query or data mutation introduced; no tenant columns, indexes, doorbell tests, Prisma schema, or application code changed. |

## Deviations

None. The intentionally failing import is the required RED state and is not a
production implementation or a later Apply substep.

## Apply Summary

Foundation contract tests are recorded and bounded to Tasks 1.1–1.3. Historical
migrations remain byte-preserved. No SQL/assets were generated, no database
operation was run, and no existing-target resolve or cutover path was added.

**Legal next action:** Apply 7.2 Core Engine.
