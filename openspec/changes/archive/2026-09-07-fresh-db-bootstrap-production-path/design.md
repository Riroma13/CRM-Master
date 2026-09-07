# Design: fresh-db-bootstrap-production-path — Production Fresh PostgreSQL Bootstrap

> **Status:** Draft
> **Working document.** This Design defines a product bootstrap path only; it does not change the SDD pipeline.

## 1. Executive Summary

The migration tree begins with additive migrations that assume pre-existing core tables, so an empty PostgreSQL 16 database cannot safely reach the current schema through `prisma migrate deploy` alone. Add a versioned, explicitly invoked fresh-database bootstrap that installs one reviewed canonical schema asset, records the unchanged historical migration ledger, and then verifies the normal Prisma deploy path. Existing databases continue to use `prisma migrate deploy` unchanged. The bootstrap is fail-closed: it runs only against a demonstrably empty, non-maintenance PostgreSQL database and never repairs or rebaselines a populated database.

## 2. Technical Approach

Create a database-package CLI wrapper and a versioned bootstrap manifest. The manifest names immutable, repository-tracked SQL assets that represent the current production schema, including required PostgreSQL-specific objects that Prisma migrations do not fully express. The wrapper verifies manifest and asset digests, validates the target, applies the declared components in order, records every existing migration directory as applied through Prisma, and finishes with `prisma migrate deploy`.

The manifest is the bootstrap contract; `schema.prisma` remains the model metadata source and `prisma/migrations/` remains the deploy history source. Apply generates `schema.sql` from `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`, then qualifies it against every immutable migration and the manual SQL sources. It is not a replacement migration tree. The wrapper uses argument arrays and fixed repository-relative paths, never interpolated shell input.

V1 has an explicit reporting overlay, applied after `schema.sql`: it replaces only the fresh generated `analytics_datasets` and `analytics_snapshots` tables with range-partitioned parents on `window_start`, their deterministic child partitions, and the two existing reporting-management functions. This is an empty-target-only physical representation, not a migration or cutover plan for existing databases.

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
| --- | --- | --- | --- |
| Fresh path | Replay historical tree; rewrite/rebaseline history; versioned snapshot plus ledger | Snapshot plus ledger | Early migrations reference absent base objects; rewriting would break deployed-ledger compatibility. |
| Existing databases | Route all deploys through bootstrap; retain Prisma deploy | Retain `prisma migrate deploy` | Existing production databases already have a ledger; their established behavior must remain byte-for-byte compatible. |
| Bootstrap authority | Infer from runtime schema; manifest with digests | Versioned manifest | A checked-in, hash-verified input is reproducible and detects accidental asset drift. |
| Reporting physical form | Leave generated unpartitioned tables; convert existing databases; v1 partition overlay | V1 overlay for two reporting tables | Current reporting SQL has only commented DDL; fresh bootstrap must install a defined physical form without changing historical migrations or existing databases. |
| Reporting partition horizon | Clock-relative partitions; fixed range plus default | Fixed `2020-01-01`–`2030-01-01` monthly partitions plus one default per parent | Names and bounds are reproducible; the default accepts out-of-range data until a future version changes policy. |
| Failure handling | Repair partial targets; fail closed | Fail closed | A partially initialized target must be investigated or discarded, never silently reused. |
| Ledger population | Write `_prisma_migrations` directly; Prisma CLI resolve | `prisma migrate resolve --applied` per directory | Prisma owns its ledger format and checksums; the wrapper must not emulate it. |

## 4. Data Flow

```text
operator + DATABASE_URL + --confirm-fresh
                 |
                 v
bootstrap CLI -> target preflight -> manifest/digest validation
                 | reject                   |
                 v                          v
              non-zero              ordered SQL components
                                           |
                                           v
                       reporting overlay: replace fresh logical tables,
                      create fixed partitions/defaults/functions/indexes
                                            |
                                            v
                          prisma migrate resolve --applied (each history entry)
                                           |
                                           v
                              prisma migrate deploy -> ready database
```

On any preflight, checksum, SQL, resolve, or deploy failure the command exits non-zero, emits no secret, and does not continue to a later stage. It never drops objects, mutates historical migration files, or converts a non-empty database into a bootstrap target.

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | `packages/database/scripts/bootstrap-fresh-postgres.ts` | Create | Fixed-argument, fail-closed bootstrap orchestrator. |
| 2 | `packages/database/bootstrap/v1/manifest.json` | Create | Version, ordered components, migration names, and SHA-256 digests. |
| 3 | `packages/database/bootstrap/v1/schema.sql` | Create | Reviewed canonical fresh-schema asset generated during Apply. |
| 4 | `packages/database/bootstrap/v1/reporting.sql` | Create | Canonical, manifest-listed physical reporting overlay. |
| 5 | `packages/database/package.json` | Modify | Expose an explicit `db:bootstrap:fresh` command. |

### 5.2 Secondary Files

| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | `packages/database/scripts/__tests__/bootstrap-fresh-postgres.test.ts` | Create | RED tests for preflight, command ordering, and fail-closed behavior. |
| 2 | `packages/database/bootstrap/v1/schema.sql.sha256` | Create | Reviewable digest anchor for the canonical schema asset. |
| 3 | `packages/database/bootstrap/v1/reporting.sql.sha256` | Create | Digest anchor for the reporting overlay. |
| 4 | `packages/database/bootstrap/v1/components/` | Create | Versioned, manifest-listed supplemental SQL for the audit and timeline trigger sources. |
| 5 | `packages/database/prisma/schema.prisma` | Read only | Source used to generate and qualify the snapshot; no model change is planned. |

### 5.3 Expected NOT to Change

- `packages/database/prisma/migrations/**` — history is byte-preserved; no edits, deletion, reordering, or new baseline migration.
- `packages/database/prisma/migrations/migration_lock.toml` — provider lock remains Prisma-owned.
- `packages/database/src/**` and `apps/**` — bootstrap is an operational database-package path, not an application contract.
- Historical change directories named in the dispatch — read-only and out of scope.

## 6. Read Order

1. `packages/database/package.json` — command conventions and available Prisma tooling.
2. `packages/database/prisma/schema.prisma` — canonical current logical schema.
3. `packages/database/prisma/migrations/migration_lock.toml` then every `migration.sql` — ordered immutable ledger, including the reporting tables and pgvector extension in `20260720230000_add_knowledge_base`.
4. `packages/database/scripts/reporting-partitions.sql` — reporting authority: commented table DDL is not executable; its live functions are required v1 objects.
5. `packages/database/scripts/audit-append-only-trigger.sql` and `activity-timeline-search-trigger.sql` — supplemental physical objects to qualify and list.
6. `packages/database/prisma/**/__tests__` and `src/__tests__/index.test.ts` — Vitest conventions and regression boundaries.
7. New manifest, CLI, assets, and tests — implement only after the above facts are captured in generated asset evidence.

## 7. Expected Commands

```bash
pnpm --filter @crm-master/database exec prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script  # generate candidate schema input
pnpm --filter @crm-master/database test -- scripts/__tests__/bootstrap-fresh-postgres.test.ts  # RED/GREEN contract tests
pnpm --filter @crm-master/database db:bootstrap:fresh -- --confirm-fresh  # disposable empty PostgreSQL 16 qualification only
pnpm --filter @crm-master/database exec prisma migrate deploy --schema prisma/schema.prisma  # existing-ledger regression
pnpm --filter @crm-master/database generate  # Prisma and tenant-scope generation regression
pnpm sdd:validate:design -- openspec/changes/fresh-db-bootstrap-production-path/design.md  # Design structural gate
```

## 8. Design Confidence

**Confidence:** Medium

The source boundaries, reporting representation, ordering, and assertions are now explicit. Apply still owns the generated SQL bytes and their digests, and must qualify them on disposable PostgreSQL 16; the Design deliberately does not invent those generated bytes.

## 9. Exploration Budget

| Resource | Budget | Notes |
| --- | --- | --- |
| Repo searches | 6 | Locate generation, migration enumeration, physical-object consumers, and catalog assertions. |
| Files to read | 29 | Package contract, full migration tree, manual SQL, and focused tests. |
| Files to create | 7 | CLI, manifest, two assets, two digests, and focused test. |
| Files to modify | 1 | Database package script only. |

## 10. Risks

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Snapshot omits raw PostgreSQL object | Med | High | Manifest lists every component and disposable database assertions verify required objects. |
| Generated reporting tables conflict with v1 partition overlay | Med | High | Apply must execute `schema.sql` first, then only on the preflight-proven empty target replace exactly the two named reporting tables before ledger resolution. |
| Partition representation drifts | Low | High | Require exact parent/child/catalog assertions and manifest hashes; any missing, unpartitioned, wrong-bound, or extra unlisted reporting object fails. |
| Prisma ledger semantics differ | Med | High | Test real Prisma 6 `migrate resolve` and then `migrate deploy`; never write the ledger directly. |
| Wrong database target | Low | Critical | Require explicit confirmation; reject maintenance, ledgered, or non-empty user-object targets. |
| Partial bootstrap | Med | High | Stop at first failure, do not resolve later entries, and reject reruns on the altered target. |

**Applicability-driven threat matrix**

| Boundary | Applicability | Design response | Planned RED tests |
| --- | --- | --- | --- |
| Documentation-like paths | N/A — assets are fixed `.sql` data, never executable classification targets | Manifest accepts only fixed versioned component paths | None |
| Git repository selection | N/A — no Git command or repository selector | CLI anchors paths to its package root | None |
| Commit state | N/A — no Git mutation | No Git behavior | None |
| Push state | N/A — no network VCS operation | No Git behavior | None |
| PR commands | N/A — no PR integration | No PR behavior | None |

## 11. Testing Strategy

| Layer | Focus | Approach |
| --- | --- | --- |
| Unit | CLI validation and stage ordering | Vitest mocks subprocess/database probes; RED cases cover missing confirmation, bad URL/version, ledger, non-empty objects, digest mismatch, and first failure. |
| Integration | Fresh PostgreSQL 16 contract | Disposable database: apply v1, assert every manifest object, reporting catalog contract, pgvector, triggers/functions, complete Prisma ledger/checksums, then deploy with no pending migrations. |
| Regression | Existing database deploy behavior | Fixture with valid historical ledger runs normal `prisma migrate deploy`; bootstrap is not invoked. |
| E2E | Operational command boundary | Execute package script with a disposable URL and assert exit codes and secret-free diagnostics. |

## 12. Doorbell Tests

| Test file | What it proves |
| --- | --- |
| `packages/database/scripts/__tests__/bootstrap-fresh-postgres.test.ts` | Bootstrap refuses all non-empty or ledgered targets and cannot cross tenant/application data boundaries. |
| `apps/api/test/doorbell/isolation-gate.spec.ts` | Existing tenant isolation remains unchanged; this change adds no scoped query path. |

## 13. Required ADRs

| ADR | Reason | Status |
| --- | --- | --- |
| None | No Prisma model or schema policy change is planned; the Design records the operational bootstrap decision. | Not required |

## 14. Boundaries

| Boundary | Owner | Purpose |
| --- | --- | --- |
| Logical schema | `prisma/schema.prisma` | Current Prisma metadata; never a bootstrap executor. |
| Deploy history | `prisma/migrations/` | Immutable Prisma migration inputs for existing databases and ledger names. |
| Fresh bootstrap | `bootstrap/v1/*` + CLI | Install and attest the exact fresh-only baseline. |
| Prisma ledger | Prisma CLI | Record applied history; wrapper does not issue ledger SQL. |

## 15. Extensibility

| Future feature | How it fits | Effort |
| --- | --- | --- |
| Next bootstrap revision | Add `bootstrap/v2` and select only for empty targets; retain v1 for reproducibility. | Days |
| New raw PostgreSQL object | Add a reviewed manifest component and integration assertion to the next bootstrap version. | Days |
| Future migrations | Normal `prisma migrate deploy` follows the resolved v1 ledger. | Existing flow |

## Architecture Review Preparation

### A. Scalability

| Factor | 10× | 100× | Mitigation |
| --- | --- | --- | --- |
| Storage | One-time DDL only | One-time DDL only | No data copy; bootstrap is empty-target-only. |
| Query latency | None | None | Existing indexes/schema preserved. |
| Write throughput | None | None | No runtime write path. |
| Memory | CLI-local | CLI-local | Stream subprocess output; do not load SQL dynamically from input. |

**Decision:** Use a one-time versioned bootstrap, not runtime schema discovery.

**Rationale:** Cost is bounded by schema size, independent of tenant data volume.

**Alternative:** Historical replay; rejected because it cannot create the missing base safely.

**Future impact:** Later versions remain isolated and reproducible.

### B. Open/Closed Principle (OCP)

**Point of extension:** A new numbered `bootstrap/vN/manifest.json` and component set.

**What must change to add one more:** Add a version selector and qualification tests; do not alter v1 assets.

**Decision:** Manifest-driven ordered components.

**Rationale:** New PostgreSQL-only objects extend an explicit list rather than branching core CLI logic.

**Alternative:** Hardcode SQL paths in the CLI; rejected because review scope becomes opaque.

**Future impact:** Version-specific compatibility remains auditable.

### C. Ownership

| Data / Capability | Owner | Consumers |
| --- | --- | --- |
| Current logical schema | Prisma schema | Generator, bootstrap qualification |
| Applied migration ledger | Prisma | `migrate deploy` |
| Fresh baseline assets | Database package | Operators/CI |
| Reporting physical overlay | `bootstrap/v1/reporting.sql` derived from schema, reporting migration, and manual reporting source | Bootstrap CLI and verification |

**Decision:** Keep ownership separated by artifact type.

**Rationale:** Bootstrap cannot redefine Prisma history or application metadata.

**Alternative:** A second migration tree; rejected due dual history ownership.

**Future impact:** Existing deploy remains stable.

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
| --- | --- | --- | --- |
| Bootstrap assets/manifests | Repository lifetime | Git history | Never auto-delete |
| CLI diagnostics | Process lifetime | CI logs per policy | No database persistence |

**Decision:** No user or tenant data is generated.

**Rationale:** The target must be empty.

**Alternative:** Data migration; out of scope and unsafe for this path.

**Future impact:** No retention policy change.

### E. Idempotency

| Operation | Duplicate risk | Protection | Fallback |
| --- | --- | --- | --- |
| Fresh bootstrap | Yes | Reject any prior application object or Prisma ledger | New disposable target or investigation; no retry-in-place |
| Existing deploy | No new risk | Existing Prisma semantics | Normal deploy failure handling |

**Decision:** Bootstrap is deliberately single-use per database; deploy remains repeatable.

**Rationale:** Retrying a partial baseline could conceal divergence.

**Alternative:** Idempotent DDL rerun; rejected because it weakens provenance.

**Future impact:** Operators must provision a new empty database after failure.

### F. Shared Contracts

| Contract | Location | Consumers | Producers |
| --- | --- | --- | --- |
| Bootstrap manifest | `bootstrap/v1/manifest.json` | CLI, tests, reviewers | Apply generation process |
| Prisma migration names | `prisma/migrations/` | CLI, Prisma | Repository history |

**Decision:** Use JSON manifest plus fixed CLI flags; no frontend/backend API contract.

**Rationale:** Operational input is explicit, typed by validation, and repository-local.

**Alternative:** Environment-driven component list; rejected due unreviewable execution scope.

**Future impact:** Manifest can gain a validated version field without public API change.

### G. Partitioning Strategy

| Dimension | Risk | Strategy |
| --- | --- | --- |
| Tenant | None from bootstrap | Preserve current tenant schema and indexes. |
| Time | Reporting SQL has no live partition DDL; generated tables are unpartitioned | V1 replaces both fresh logical reporting tables with range parents, fixed monthly children from 2020-01 through 2029-12, and a default child each. |
| Volume | Snapshot growth | Generate/review a new version, never mutate v1. |

**Decision:** V1 owns a fixed, reproducible physical reporting baseline: `analytics_datasets` and `analytics_snapshots` are `PARTITION BY RANGE (window_start)` parents; each has children named `<table>_YYYY_MM` for 2020-01 through 2029-12 and `<table>_default` for all other values.

**Rationale:** The repository's reporting script documents intended range partitioning but contains no live table or child DDL. Fixed bounds avoid clock-dependent SQL, while default partitions preserve ingestion outside the initial horizon.

**Alternative:** Preserve generated unpartitioned tables or defer conversion to operators; rejected because neither creates the stated production representation. Existing-database conversion is rejected because it violates scope.

**Future impact:** Partition changes require a new manifest version and migration-compatible rollout.

## 16. Interfaces / Contracts

```typescript
interface BootstrapManifestV1 {
  version: 1;
  postgresMajor: 16;
  components: ReadonlyArray<{
    path: string; // fixed, package-relative .sql path
    sha256: string;
    transaction: 'required' | 'forbidden';
  }>;
  migrations: ReadonlyArray<{ name: string; sha256: string }>;
}

// Invocation contract:
// pnpm --filter @crm-master/database db:bootstrap:fresh -- --confirm-fresh
// Requires DATABASE_URL. Rejects any non-empty, ledgered, non-PostgreSQL-16,
// maintenance, malformed, or manifest-mismatched target. Exit 0 only after
// manifest components, Prisma resolution, and migrate deploy all succeed.
```

The command accepts no target path, migration name, arbitrary SQL path, shell fragment, or secret-bearing diagnostic option. `DATABASE_URL` remains process-only and must be redacted from output.

The `components` array is the execution order and must contain exactly: (1) a pgvector prerequisite component that succeeds only when `CREATE EXTENSION IF NOT EXISTS vector` is supported; (2) `schema.sql`; (3) `reporting.sql`; (4) the qualified activity-timeline trigger component; and (5) the qualified audit append-only trigger component. Apply may consolidate only byte-identical execution semantics into these fixed components; it must not add arbitrary paths. `reporting.sql` must be derived from the generated schema plus `20260720220000_add_reporting_tables/migration.sql` and `scripts/reporting-partitions.sql`: it drops only the two just-created empty tables, recreates their columns/defaults from the migration/schema, uses composite primary keys `(id, window_start)` because PostgreSQL partitioned uniqueness includes the partition key, recreates `analytics_datasets_tenant_id_dataset_name_metric_name_granul_key`, `analytics_datasets_tenant_id_dataset_name_granularity_window_idx`, `analytics_datasets_tenant_id_metric_name_window_start_idx`, `analytics_datasets_tenant_id_idx`, `analytics_snapshots_tenant_id_name_expires_at_idx`, and `analytics_snapshots_tenant_id_idx`, and creates the named children/functions above. The manifest lists SHA-256 for every component and every migration directory in lexical migration-name order.

Verify must fail if: `vector` is absent; either reporting parent is not range partitioned on `window_start`; a required monthly/default child, composite primary key, or any of the six named migration-derived indexes is absent; an unexpected unlisted child exists; either live `create_monthly_partition`/`drop_old_partitions` function or either trigger/function component is absent; any manifest digest or resolved migration checksum/name differs; or `prisma migrate deploy` reports pending/failed migrations. It must also assert the two parents are absent before `reporting.sql` replacement only through the generated asset's known stage, and present only in their partitioned form afterwards.

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
| --- | --- | --- | --- |
| 1 | Generate and review `schema.sql`; derive `reporting.sql` from the reporting schema/migration/manual source; qualify fixed ordering, pgvector, trigger, and reporting catalog contracts. | Omitted or conflicting object | Do not publish v1 until disposable qualification passes. |
| 2 | Run explicit bootstrap only on a new empty PostgreSQL 16 database. | Wrong target/partial run | Stop; discard or investigate target, never retry bootstrap in place. |
| 3 | Resolve all historical migrations and run normal deploy. | Ledger mismatch | Stop before application release; preserve evidence. |
| 4 | Deploy application using existing `prisma migrate deploy` path. | Regression | Normal migration rollback/runbook; v1 is not used for existing databases. |

No feature flag, data backfill, migration rewrite, active baseline migration, `db push`, automatic `migrate resolve`/cutover for existing databases, or downtime path is introduced. Apply/Verify must qualify generated SQL, manifest digests, reproducible pgvector prerequisite, required triggers/functions, reporting partition representation, and Prisma 6 ledger behavior on disposable PostgreSQL 16 before release use. Existing databases keep normal `prisma migrate deploy`.

## 18. Open Questions

| # | Question | Status | Resolution |
| --- | --- | --- | --- |
| 1 | Can Prisma 6 resolve every existing migration in this ordered tree after v1 schema application and leave `migrate deploy` clean? | Resolved | Apply/Verify must prove it against disposable PostgreSQL 16; no ledger SQL fallback is permitted. |
| 2 | Which current manual SQL objects belong in v1 rather than a later operational workflow? | Resolved | V1 includes pgvector, activity timeline trigger/function, audit append-only trigger/function, and the two live reporting functions; every item is manifest-listed and asserted. |
| 3 | What reporting tables and partitions does v1 install? | Resolved | The two reporting parents, their 120 fixed monthly children each (2020-01–2029-12), and their default children, constraints, and indexes are defined in section G and section 16. |
| 4 | Are generated v1 SQL and digest assets available now? | Resolved | No; they are Apply-owned outputs. Apply must derive and qualify them from the named current sources; their absence does not block this Design. |

---

> **End of document.**
> It does not modify the pipeline, prompts, or workflow.
