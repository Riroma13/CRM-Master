# Tasks: fresh-db-bootstrap-production-path

## Review Workload Forecast

Estimated changed lines: 500–800 (informational only)
Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Working Set

Exact Working Set: create `packages/database/scripts/bootstrap-fresh-postgres.ts`, `packages/database/bootstrap/v1/{manifest.json,schema.sql,reporting.sql,schema.sql.sha256,reporting.sql.sha256}`, `bootstrap/v1/components/**`, and `packages/database/scripts/__tests__/bootstrap-fresh-postgres.test.ts`; modify `packages/database/package.json`; read only `packages/database/prisma/schema.prisma`. Preserve every historical `migration.sql` and `migration_lock.toml` byte-for-byte. No apps, `src/**`, API/frontend/auth, SDD runtime/tooling, or historical changes.

### Read Order

Read Order: `package.json` → `schema.prisma` → `migration_lock.toml` and every historical `migration.sql` in lexical migration-directory order → reporting SQL → both trigger sources → focused tests. Generated SQL/assets/digests are Apply-owned and may be absent; absence is not a blocker.

### Suggested Work Units

| Unit | Goal | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| 1 | RED contract tests and CLI contract | `pnpm --filter @crm-master/database test -- scripts/__tests__/bootstrap-fresh-postgres.test.ts` | Mocked subprocess/probe tests; no DB | Test file only |
| 2 | Generate/qualify v1 assets and manifest | `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script` | Disposable PostgreSQL 16 | `bootstrap/v1/**` |
| 3 | Implement and wire fresh bootstrap | Focused test command | `pnpm --filter @crm-master/database db:bootstrap:fresh -- --confirm-fresh` | CLI and package script |
| 4 | Verify production contract | `generate`, status, deploy | Disposable PostgreSQL 16 and existing-ledger fixture | Entire Working Set |

## Phase 1: RED / Foundation

- [x] 1.1 Add RED tests for confirmation/URL/version, maintenance/non-empty/user-object/ledgered targets, fixed-path/digest rejection, secret-free diagnostics, first-failure stop, and altered-target retry rejection.
- [x] 1.2 Add failing tests for exact stage order `pgvector → generated schema → reporting overlay → triggers/functions → resolve → deploy`, lexical migration directories, and one `prisma migrate resolve --applied <migration-name>` per directory only after fresh preflight; existing/non-empty/ledgered targets must have no resolve or cutover path.
- [x] 1.3 Add RED tests that snapshot SHA-256 bytes before execution for every historical `migration.sql` and `migration_lock.toml`, verify matching after-snapshot bytes, and reject mismatch.

## Phase 2: GREEN / Assets and CLI

- [x] 2.1 Generate/qualify `schema.sql` from `prisma migrate diff --from-empty`; do not edit history, add a baseline, or add a compensating migration.
- [x] 2.2 Derive reporting/triggers; install pgvector, fixed 2020-01–2029-12 monthly/default partitions, keys, six indexes, and functions/triggers.
- [x] 2.3 Create manifest v1 with PostgreSQL 16, exact order, lexical migration names/checksums, and asset SHA-256 anchors.
- [x] 2.4 Implement fixed-path argument-array CLI; redact secrets, use no `db push`, fail closed, resolve each historical directory in lexical order, then run normal deploy.

## Phase 3: REFACTOR / Integration and Verify Evidence

- [x] 3.1 Refactor explicit stages and first-failure stop/reject-rerun evidence; no drops, repair, cutover, baseline/compensating migration, or existing-target resolve.
- [x] 3.2 Qualify catalog partitions/bounds/no extras, keys/indexes, pgvector, functions/triggers, manifest/assets, and post-resolution Prisma ledger names/checksums; require `prisma migrate status` clean/no pending, then `prisma migrate deploy` clean/no pending.
- [x] 3.3 Verify the before/after SHA-256 snapshot for every historical SQL and lock byte, failing closed on any mismatch.
- [x] 3.4 Record tenant-isolation evidence: no scoped query/data mutation; tenant columns/indexes and doorbell gate unchanged.
- [x] 3.5 Run RED→GREEN→REFACTOR, existing deploy, generate, enterprise Design pre-gate, `pnpm sdd:validate`, and `git diff --check`; record checkpoints and first-failure evidence.

## Acceptance Criteria

- [x] CLI succeeds only on an empty non-maintenance PostgreSQL 16 target and stops on every failure stage; failed targets reject rerun.
- [x] Exact stage order, lexical per-directory fresh-only resolution, manifest/digests, fixed reporting catalog, supplemental objects, unchanged history bytes, ledger names/checksums, clean status, and clean deploy are proven.
- [x] Existing databases use unchanged `prisma migrate deploy`; no API/frontend/auth/runtime scope is added.
