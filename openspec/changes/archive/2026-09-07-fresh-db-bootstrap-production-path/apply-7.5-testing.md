# Apply 7.5 Testing: fresh-db-bootstrap-production-path

## Outcome

**Status:** PASS  
**Role:** MID / BUILDER  
**Scope:** Tasks 3.2, 3.4, and 3.5; remaining testing and gating work only.  
**Delivery:** stacked-to-main testing work unit (`auto-chain`); later Apply Summary was not dispatched.

## TDD Cycle Evidence

| Task | Test / evidence | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|
| 3.2 | `bootstrap-fresh-postgres.test.ts` plus disposable PostgreSQL 16 catalog qualification | ✅ Added exact manifest, transaction, asset digest, reporting-child, and command-order assertions before final test run | ✅ 24 focused tests passed; disposable bootstrap/status/deploy passed | ✅ Catalog returned vector=true, both parents `RANGE (window_start)`, 121 children each, 6 indexes, 4 functions, 3 triggers, ledger=15 with matching names/checksums | ✅ Assertions remain bounded to the approved bootstrap contract; no production change needed |
| 3.4 | Fresh qualified database doorbell gate and source diff checks | ✅ Existing doorbell gate was run against the qualified fresh target | ✅ 6/6 doorbell tests passed; tenant-scoped create/read/update/delete and raw SQL blocking remained intact | ✅ No scoped query or data mutation was introduced; generated tenant columns/indexes and gate source are unchanged | ✅ No application or tenant code was modified |
| 3.5 | Full package tests, generate/type/validators/hygiene, and failure evidence | ✅ Existing RED contract history consumed from Apply 7.1; new assertions were added before GREEN run | ✅ All required mechanical checks passed; 60 package tests passed | ✅ Fresh runtime and existing-target rejection were separately exercised; history snapshots and secret-free diagnostics were checked | ✅ Test-only assertions and bounded evidence artifact only |

## Qualification Evidence

- Focused bootstrap suite: `pnpm --filter @crm-master/database test -- scripts/__tests__/bootstrap-fresh-postgres.test.ts` — PASS, 1 file, 24 tests.
- Full database package suite: `pnpm --filter @crm-master/database test` — PASS, 5 files, 60 tests.
- Targeted strict TypeScript check for bootstrap implementation and tests — PASS.
- Real disposable `pgvector/pgvector:pg16` qualification — PASS, bootstrap exit 0. The run verified catalog-level `vector`, both reporting parents partitioned by `window_start`, exactly 120 monthly plus one default child per parent, composite `(id, window_start)` keys, all six named indexes, both reporting management functions, activity/audit functions and three triggers, and no unexpected child names.
- Manifest and digest qualification — PASS. Every checked-in component SHA-256, schema/reporting anchors, and all 15 lexical migration SQL SHA-256 values matched. Resolved `_prisma_migrations` contained exactly the 15 manifest names and matching checksums.
- Prisma state — PASS. After all lexical `migrate resolve --applied` calls, `prisma migrate status` reported up to date and `prisma migrate deploy` reported no pending migrations. The later normal deploy invocation was run separately and did not invoke bootstrap.
- Historical preservation — PASS. Before/after SHA-256 snapshots covered all historical `migration.sql` files and `migration_lock.toml`; the disposable run reported unchanged bytes.
- Failure/idempotency — PASS. Unit coverage proves first-failure stop, no later resolve/deploy, and altered-target rerun rejection. Existing/non-empty targets reject before resolve/cutover. A real existing-container attempt could not authenticate, so it was not used as qualification evidence; the bounded unit contract and fresh-target gate remain the evidence for no existing-target cutover.
- Tenant isolation — PASS. The doorbell gate against the qualified fresh database passed 6/6. No tenant columns, indexes, Prisma schema, application code, or doorbell source changed.
- Secret hygiene — PASS. Disposable credentials were process-only; diagnostics redact credentials and checked-in assets/artifacts contain no secret.
- Governance/hygiene — PASS: `pnpm --filter @crm-master/database generate` (generated files up to date), `pnpm sdd:validate`, `pnpm sdd:validate:design -- openspec/changes/fresh-db-bootstrap-production-path/design.md`, and `git diff --check`.

## Baseline Debt

The repository's long-running `crm-master-postgres` container could not authenticate with its declared credentials; when the doorbell was forced against that stale existing database, it also lacked `clientes.email`. This is unrelated to the bootstrap Working Set and was not modified. The required doorbell gate passed against the freshly qualified PostgreSQL 16 target.

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Bootstrap focused suite: 24/24 PASS; full database package: 60/60 PASS |
| Runtime harness command/scenario and exact result | Disposable `pgvector/pgvector:pg16`: bootstrap, 15 resolves, status, deploy, catalog assertions, and doorbell 6/6 PASS |
| Rollback boundary | Remove only the added test assertions, this artifact, and Tasks 3.2/3.4/3.5 completion marks; preserve implementation/assets and all historical migration bytes |

## History, Tenant, and Scope Checks

- Historical migration SQL and `migration_lock.toml` were read-only and byte-preserved.
- No migration, Prisma schema, `db push`, baseline, compensating migration, existing-target resolve/cutover, API/frontend/auth source, SDD runtime/tooling, or unrelated active change was modified.
- Working Set changes are limited to the approved bootstrap test file, task completion marks, and this Apply artifact; the existing approved package command/assets remain unchanged.
- The `auto-chain` / `stacked-to-main` delivery decision was preserved. No Git operation was performed.

## Deviations

None. The existing-container authentication failure is recorded as bounded baseline/environment evidence, not treated as a bootstrap defect or hidden.

## Remaining Gate Status

Tasks 3.2, 3.4, and 3.5 are complete. All required Apply 7.5 testing gates are proven PASS, with the unrelated existing-container baseline condition recorded above. The canonical next action is **Apply 7.6 Apply Summary**.
