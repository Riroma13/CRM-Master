# Apply 7.6 Apply Summary: fresh-db-bootstrap-production-path

## Outcome

**Status:** PASS  
**Role:** MID / BUILDER  
**Action:** Apply 7.6 Apply Summary  
**Checkpoint consumed:** READY sequence 14, Apply 7.5 Testing, PASS  
**Canonical next action:** Verify

This nested action consolidates Apply evidence only. It makes no implementation
change, performs no Git operation, and does not dispatch Verify.

## Approved Context Consumed

- Design, Tasks, Tasks Review, Workload Guard, and Apply 7.1–7.5 artifacts were
  consumed in the approved bounded order.
- Working Set and Read Order were consumed from `design.md` and `tasks.md`.
  The Read Order covered the database package command conventions, Prisma schema,
  migration lock and all historical migrations in lexical order, reporting SQL,
  both trigger sources, focused tests, and then the generated assets, manifest,
  CLI, and tests.
- The runtime checkpoint and trace record `READY` sequence 14 with
  `Apply 7.5 Testing` PASS and legal next `Apply 7.6 Apply Summary`.
- Authority references consumed: workflow
  `9f9b72c7823b7ea42f80e0692662a8521b1e3f51ae2f5a017f51fc1b296c1c2a`, model map
  `68cadbd5c0fe6793cb84c20b2164508e46c4955f373b61e88eda1c8bef071eb7`, and
  config `09e58a7ff63cabe4ace41dac924ccba1fe64ca55cf9c054326b1`.

## Apply Work Unit Evidence

| Work unit | Scope and exact evidence | TDD / qualification result | Rollback boundary |
|---|---|---|---|
| 7.1 Foundation | Tasks 1.1–1.3; focused contract suite intentionally RED while the production module was absent; history snapshot coverage included all 15 historical `migration.sql` files and `migration_lock.toml`. | RED tests were written first; invalid/valid paths, ordering, first-failure, and matching/altered snapshot paths were triangulated. | Focused test file, Tasks 1.1–1.3 marks, and this evidence artifact only. |
| 7.2 Core Engine | Task 2.4; fixed validation, fresh-target preflight, secret-free diagnostics, deterministic stages, first-failure stop, altered-target rerun rejection, and historical SHA-256 snapshots. | Focused suite: 19 tests PASS; targeted strict TypeScript check PASS; RED → GREEN → REFACTOR completed. Runtime qualification was correctly deferred to later asset/testing units. | Bootstrap executor, package command, Task 2.4 mark, and this artifact only. |
| 7.3 Feature Implementation | Tasks 2.1–2.3; reproducible `schema.sql`, fixed `reporting.sql`, supplemental components, manifest, asset anchors, and lexical migration digests. | Repeated Prisma diff matched `schema.sql` byte-for-byte (2,341 lines); disposable PostgreSQL 16 qualification verified vector, 242 reporting children, 4 functions, and 3 triggers; exact five-component manifest validation PASS. | `packages/database/bootstrap/v1/**`, Tasks 2.1–2.3 marks, and this artifact only. |
| 7.4 Integration | Tasks 3.1 and 3.3 integration portions; real package-relative executor, digest verification before mutation, safe argument-array subprocesses, target probing, transaction boundaries, lexical resolve, status, deploy, and lock-inclusive snapshots. | Focused suite: 21 tests PASS; strict TypeScript PASS; disposable `pgvector/pgvector:pg16` command exited 0; manifest/assets and historical snapshot checks PASS; RED → GREEN → REFACTOR completed. | Bootstrap executor, focused tests, package command if needed, Tasks 3.1/3.3 marks, and this artifact only. |
| 7.5 Testing | Tasks 3.2, 3.4, and 3.5; final catalog, ledger, isolation, failure, hygiene, and governance gates. | Focused suite 24/24 PASS; full database package suite 60/60 PASS; disposable PostgreSQL 16 bootstrap/status/deploy/catalog/doorbell PASS; RED → GREEN → TRIANGULATE → REFACTOR recorded. | Test assertions, Tasks 3.2/3.4/3.5 marks, and this artifact; preserve implementation/assets and history. |

## Consolidated Qualification Evidence

- **Bootstrap contract:** succeeds only for an explicitly confirmed, empty,
  non-maintenance PostgreSQL 16 target; fixed repository-relative paths and
  argument arrays are enforced; diagnostics are secret-free; the first failure
  stops all later stages; an altered or partially initialized target rejects
  rerun. No `db push`, repair, baseline, compensating migration, or drop path
  exists.
- **Exact stage order:** `pgvector → schema.sql → reporting.sql →
  triggers/functions → lexical resolve → status → deploy`.
- **Disposable PostgreSQL 16:** `pgvector/pgvector:pg16` qualification passed
  with exit 0. The plain `postgres:16-alpine` prerequisite attempt correctly
  failed closed because `vector` was unavailable and was not counted as PASS.
- **Catalog and physical objects:** `vector=true`; `analytics_datasets` and
  `analytics_snapshots` are range-partitioned on `window_start`; each has 120
  fixed monthly partitions for 2020-01 through 2029-12 plus one default (121
  children each); composite `(id, window_start)` primary keys; all six named
  migration-derived indexes; four required functions; three required triggers;
  and no unexpected partition child names.
- **Ledger and deploy:** all 15 migrations were resolved once each in lexical
  directory order with matching names/checksums. `prisma migrate status`
  reported up to date and `prisma migrate deploy` reported no pending
  migrations. Existing databases retain the normal `prisma migrate deploy`
  path; there is no automatic `migrate resolve`, cutover, or bootstrap routing
  for existing databases.
- **Immutable history:** before/after SHA-256 snapshots covered every
  historical `migration.sql` and `migration_lock.toml`; bytes remained
  unchanged. No historical migration or lock file was edited.
- **Tenant isolation:** no scoped query or data mutation was introduced; tenant
  columns and indexes remain unchanged; the existing doorbell isolation gate
  passed 6/6 against the qualified fresh database, including raw SQL blocking.
- **Secret hygiene:** disposable credentials were process-only; checked-in
  assets, manifests, and Apply artifacts contain no credentials or secret-bearing
  diagnostics.

## Task and Scope Reconciliation

All Tasks 1.1–1.3, 2.1–2.4, and 3.1–3.5 are marked `[x]` in `tasks.md`.
No checkbox correction was necessary. The approved Working Set was respected;
unrelated active changes and historical bootstrap changes were preserved.

The 500–800 changed-line forecast was informational only. It did not cause
HUMAN approval, partitioning, delivery, verification, or Git topology decisions.
The approved `auto-chain` / `stacked-to-main` delivery decision was preserved.

## Baseline Debt

The long-running `crm-master-postgres` container could not authenticate with its
declared credentials and, when the doorbell was forced against that stale target,
lacked `clientes.email`. This is reproducible unrelated environment debt; it was
not modified, relabeled, or used to claim a clean repository. Required fresh
PostgreSQL 16 qualification and doorbell evidence passed independently.

## Deviations

No new deviation was introduced by Apply 7.6. Prior bounded mechanical
corrections remain recorded in Apply 7.3 and 7.4: Prisma 6 required
`--to-schema-datamodel` instead of the Design's illustrative `--to-schema`, pnpm
required accepting its separator before the sole fixed confirmation flag, and
`psql` required process-only `PG*` variables derived from the validated URL.
These corrections did not change architecture, public contracts, security,
tenant isolation, or the approved Working Set.

## Validators and Hygiene

- `pnpm sdd:validate` — PASS (`CRM-SDD governance validation: PASS`).
- `pnpm sdd:validate:design -- openspec/changes/fresh-db-bootstrap-production-path/design.md` — PASS (18 numbered sections, A–G topics, decision/rationale separation, and Working Set consistency).
- `git diff --check` — PASS.

## Final Apply Boundary

Apply is complete and this file is the only artifact created by Apply 7.6.
Rollback remains bounded to the approved bootstrap Working Set and its task
evidence; rollback does not remove or alter unrelated active changes, historical
bootstrap changes, Prisma migration history, or `migration_lock.toml`. The next
legal action is **Verify**.
