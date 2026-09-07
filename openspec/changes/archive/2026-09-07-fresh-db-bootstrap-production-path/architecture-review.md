# Architecture Review: fresh-db-bootstrap-production-path

## Verdict

**PASS.** This mandatory fresh review closes the prior reporting-baseline
blocker. The refined Design now fixes v1's physical reporting representation,
component order, ownership, and catalog/ledger assertions while keeping the
generated SQL bytes and their digests Apply-owned.

## Evidence Consumed

- Recovered canonical checkpoint: `READY`, sequence 3, `Design Refinement`
  PASS, next `Architecture Review`; the trace records one prior Architecture
  Review BLOCKED result and one consumed Design Refinement.
- Declared Working Set and Read Order, consumed in order: database package,
  Prisma schema and migration lock, all 15 immutable migration SQL files,
  reporting and trigger SQL sources, and focused test conventions.
- Bounded recovery/authority evidence: `docs/SDD-WORKFLOW.md`,
  `docs/architecture/sdd-direct.md`, Enterprise Design template, model map,
  and `openspec/config.yaml`.

## Review Findings

| Topic | Result | Evidence |
| --- | --- | --- |
| Prior reporting blocker | PASS | Sections 2, G, 16, and 17 define `analytics_datasets` and `analytics_snapshots` as range parents on `window_start`, 120 fixed monthly children each for 2020-01 through 2029-12, one default child each, composite `(id, window_start)` primary keys, six named migration-derived indexes, live reporting functions, and fixed replacement after `schema.sql`. This closes the former deferral. |
| Reproducibility and physical representation | PASS | The component array has the exact order: pgvector prerequisite, `schema.sql`, `reporting.sql`, activity-timeline trigger, then audit trigger. It fixes PostgreSQL 16, SHA-256 pins every component and lexical migration entry, and requires catalog assertions for partition bounds, unexpected children, functions, triggers, indexes, and parent form. Generated asset bytes remain explicitly Apply-owned. |
| Historical migrations and Prisma coherence | PASS | The Working Set byte-preserves `prisma/migrations/**` and `migration_lock.toml`, adds no active baseline or compensating migration, uses Prisma `migrate resolve --applied` rather than ledger SQL, and requires resolved name/checksum coherence followed by clean `prisma migrate deploy`. |
| Target safety and failure handling | PASS | Bootstrap requires explicit confirmation, PostgreSQL 16, a proven-empty non-maintenance and non-ledgered target, rejects malformed or mismatched input, stops on first failure, and rejects retry-in-place. It has no automatic resolve, cutover, repair, or bootstrap route for existing databases. |
| Existing database and command boundaries | PASS | Existing databases retain normal `prisma migrate deploy`; `db push` is expressly excluded. The CLI allows only fixed repository-relative manifest paths and argument arrays, redacts `DATABASE_URL`, and accepts no arbitrary SQL, migration, shell, or target-path input. |
| pgvector and supplemental objects | PASS | Current history contains `CREATE EXTENSION IF NOT EXISTS vector`, `vector(384)`, and the HNSW index. V1 requires a reproducible extension prerequisite plus presence assertions for pgvector, both reporting functions, and the activity-timeline and audit functions/triggers. |
| Tenant isolation and security | PASS | The bootstrap introduces no tenant-scoped runtime query path and retains tenant columns and the reporting migration's tenant indexes. Its fresh-only preflight prevents application-data targeting; the existing Prisma scoped-client/raw-SQL isolation boundary remains unchanged. |
| Enterprise Design, contracts, Working Set, and open questions | PASS | The Design validates as the canonical 18-section/A–G shape. Its manifest/invocation contracts, bounded primary/secondary/not-change sets, dependency-ordered Read Order, validator path, and resolved Apply-owned asset question are explicit and consistent with the template. |

## A–G Architecture Topics

| Topic | Result | Review conclusion |
| --- | --- | --- |
| A. Scalability | PASS | Empty-target, one-time DDL is independent of tenant data volume. |
| B. Open/Closed Principle | PASS | A numbered manifest/component set is the defined versioned extension point. |
| C. Ownership | PASS | Prisma logical schema, immutable history, bootstrap assets, reporting overlay, and ledger ownership are separated. |
| D. Data Retention | PASS | A valid bootstrap creates no tenant or user data and stores only repository assets/ephemeral diagnostics. |
| E. Idempotency | PASS | Single-use target rejection and no retry-in-place are appropriately fail-closed. |
| F. Shared Contracts | PASS | Manifest, fixed invocation, and migration-name/digest contracts are repository-local and validated. |
| G. Partitioning Strategy | PASS | The fixed v1 time-partition contract now replaces the previous commented/manual ambiguity without changing existing databases. |

## Validator Results

- `pnpm sdd:validate:design -- openspec/changes/fresh-db-bootstrap-production-path/design.md` — PASS.
- `pnpm sdd:validate` — PASS.
- `git diff --check` — PASS.
- Authority fingerprints match the recovered state: workflow
  `9f9b72c7823b7ea42f80e0692662a8521b1e3f51ae2f5a017f51fc1b296c1c2a`;
  model map
  `68cadbd5c0fe6793cb84c20b2164508e46c4955f373b61e88eda1c8bef071eb7`;
  config
  `09e58a7ff63cabe4ace41dac924ccba1fe64ca55eed0bf7cf415cf9c054326b1`.

## Canonical Next Action

Tasks
