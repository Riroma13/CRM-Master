# Apply 7.2 Core Engine: fresh-db-bootstrap-production-path

## Outcome

**Status:** PASS  
**Role:** MID / BUILDER  
**Scope:** Core bootstrap contract and orchestration for Task 2.4 only.  
**Delivery:** stacked-to-main core-engine work unit (`auto-chain`).

## Completed work

- Added `packages/database/scripts/bootstrap-fresh-postgres.ts` with typed
  request/manifest validation, fresh-target preflight, secret-free diagnostics,
  deterministic migration ordering, first-failure stopping, altered-target
  rerun rejection, and historical SHA-256 snapshot verification.
- Added the explicit `db:bootstrap:fresh` package command.
- Implemented the exact stage contract:
  `pgvector → schema.sql → reporting.sql → triggers/functions → lexical
  resolve → status → deploy`.
- Marked only Task 2.4 complete. Generated SQL, manifest, digests, and physical
  reporting assets remain deferred to their approved later Apply slices.

## TDD Cycle Evidence

| Task | Test file | RED | GREEN | REFACTOR |
|---|---|---|---|---|
| 2.4 | `scripts/__tests__/bootstrap-fresh-postgres.test.ts` | ✅ Foundation import failed before implementation | ✅ 19 tests passed | ✅ Extracted validation, preflight, stage, and snapshot contracts without changing public behavior |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `pnpm --filter @crm-master/database test -- scripts/__tests__/bootstrap-fresh-postgres.test.ts` — PASS, 1 file, 19 tests |
| Type check | `pnpm --filter @crm-master/database exec tsc --noEmit --target ES2022 --module commonjs --moduleResolution node --strict --esModuleInterop --skipLibCheck scripts/bootstrap-fresh-postgres.ts` — PASS |
| Runtime harness | N/A — disposable PostgreSQL qualification and generated assets are explicitly assigned to later approved Apply slices; the CLI fails closed with asset-not-ready behavior |
| Rollback boundary | Revert only `packages/database/scripts/bootstrap-fresh-postgres.ts`, its `db:bootstrap:fresh` package script, Task 2.4 checkbox, and this Apply artifact |
| History immutability | No migration or `migration_lock.toml` file was modified; snapshot helper hashes every supplied historical byte source before/after orchestration |
| Tenant isolation | No scoped query or data mutation introduced; tenant columns/indexes and the doorbell gate are unchanged |

## Deviations

- Final generated SQL, manifest, digest anchors, and supplemental physical SQL
  are not fabricated. The executable entry point reports explicit
  asset-not-ready behavior until those later approved slices provide the assets.
- The core module exposes injected stage and target contracts for the existing
  RED tests; it does not claim disposable PostgreSQL qualification.

## Remaining tasks

- [ ] 2.1 Generate and qualify `schema.sql`.
- [ ] 2.2 Derive reporting/triggers and physical assets.
- [ ] 2.3 Create and validate manifest/digest assets.
- [ ] 3.1–3.5 Refactor, integration qualification, tenant evidence, and final gates.

## Apply Summary

Core bootstrap orchestration is green against the Foundation RED contract and
remains bounded to fixed validation, fail-closed preflight, ordered stages,
historical integrity snapshots, and explicit asset readiness. No database was
changed, no migration history was edited, and no existing-target resolve or
cutover path was introduced.

**Legal next action:** Apply 7.3 Feature Implementation.
