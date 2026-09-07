---
classification: SDD REPOSITORY READY
semantic_authority: false
---

# Repository Ready: fresh-db-bootstrap-production-path

## Gate Record

- **Change:** `fresh-db-bootstrap-production-path`
- **Artifact:** `repository-ready.md`
- **Status:** `PASS`
- **Canonical evidence path:** `/home/ubuntu/.openclaw/workspace/CRM-Master-main/openspec/changes/archive/2026-09-07-fresh-db-bootstrap-production-path/`
- **Generated at:** `2026-09-07T18:00:00+00:00`
- **Role:** `LOW / OPERATOR-EVIDENCE`

## Completed objective

The completed change adds an explicitly invoked, fail-closed, fresh-only
PostgreSQL 16 bootstrap path for the production schema. It uses immutable,
versioned assets and the unchanged historical Prisma ledger, while existing
databases retain normal `prisma migrate deploy`.

The complete archived change is at:

`/home/ubuntu/.openclaw/workspace/CRM-Master-main/openspec/changes/archive/2026-09-07-fresh-db-bootstrap-production-path/`

## Canonical evidence

| Phase | Exact evidence |
|---|---|
| Design | `openspec/changes/archive/2026-09-07-fresh-db-bootstrap-production-path/design.md` |
| Architecture Review | `openspec/changes/archive/2026-09-07-fresh-db-bootstrap-production-path/architecture-review.md` |
| Tasks | `openspec/changes/archive/2026-09-07-fresh-db-bootstrap-production-path/tasks.md` |
| Tasks Review | `openspec/changes/archive/2026-09-07-fresh-db-bootstrap-production-path/tasks-review.md` |
| Workload Guard | `openspec/changes/archive/2026-09-07-fresh-db-bootstrap-production-path/workload-guard.md` |
| Apply 7.1–7.6 | `openspec/changes/archive/2026-09-07-fresh-db-bootstrap-production-path/apply-7.1-foundation.md`; `apply-7.2-core-engine.md`; `apply-7.3-feature-implementation.md`; `apply-7.4-integration.md`; `apply-7.5-testing.md`; `apply-7.6-apply-summary.md` |
| Verify | `openspec/changes/archive/2026-09-07-fresh-db-bootstrap-production-path/verify-report.md` |
| Archive | `openspec/changes/archive/2026-09-07-fresh-db-bootstrap-production-path/archive-report.md` |
| Health Report | `openspec/changes/archive/2026-09-07-fresh-db-bootstrap-production-path/health-report.md` |

## Evidence

| Check | Result | Evidence |
|---|---|---|
| Required prior artifacts exist | PASS | All Design, Review, Tasks, Workload Guard, Apply 7.1–7.6, Verify, Archive, and Health artifacts listed above exist in the canonical archive. |
| Canonical path and archive relocation | PASS | `archive-report.md`; source `openspec/changes/fresh-db-bootstrap-production-path/` was relocated to the exact archive path above, with `.sdd-runtime/state.json` and the complete `.sdd-runtime/trace/` preserved. |
| Working Set reconciliation | PASS | `design.md` §5, `tasks.md` Working Set, `verify-report.md` §Working Set, and `apply-7.6-apply-summary.md` §Task and Scope Reconciliation agree. Bootstrap CLI, v1 assets/components, package command, and focused test are the only implementation scope; all 12 tasks are `[x]`. |
| Focused bootstrap qualification | PASS | `verify-report.md` command evidence: focused database suite `24/24`. |
| Full database qualification | PASS | `verify-report.md` command evidence: full `@crm-master/database` suite `60/60` across 5 files. |
| Tenant isolation doorbell | PASS | `verify-report.md` command evidence: tenant doorbell `6/6`; scoped CRUD isolation and raw SQL blocking remained intact. |
| Disposable PostgreSQL qualification | PASS | `verify-report.md` acceptance matrix and command evidence: `pgvector/pgvector:pg16@sha256:ccc6e83d6e35e931dc7c5def2022729d5a6c370318d099181995567ff1fb4d6b`; PostgreSQL `16.15`, `vector=true`, both reporting parents `RANGE (window_start)`, 121 children each, 6 indexes, 4 functions, 3 triggers, ledger 15. |
| Prisma generation and type checks | PASS | `verify-report.md`: Prisma/database `generate` passed; strict targeted TypeScript check passed with empty output. |
| Governance and Design validators | PASS | `pnpm sdd:validate` exit `0`, exact result `CRM-SDD governance validation: PASS`; Design validator passed with 18 sections and A–G topics. See `health-report.md` and `archive-report.md`. |
| Immutable migration and lock bytes | PASS | `verify-report.md` and `health-report.md`: all 15 historical `migration.sql` files and `migration_lock.toml` byte-preserved; combined SHA-256 `37358cb4a27ae4b79ee17309ce48f2f9d3a28c1ceda888d996e0f22694450a31`. |
| Migration and deploy boundaries | PASS | No baseline or compensating migration, no `db push`, and no existing-database resolve/cutover. Existing databases retain normal `prisma migrate deploy`; status and deploy were clean on the qualified target. |
| No unrelated changes touched | PASS | `health-report.md` and `archive-report.md`: no historical/invalid bootstrap changes, unrelated active work, product files, migrations, CRM-SDD runtime/tooling, templates, or Git state were inspected or modified by this action. |

## Baseline debt

**BASELINE_DEBT — non-blocking and unrelated.** The pre-existing long-running
`crm-master-postgres` container could not authenticate with its declared
credentials and, when forced through the doorbell, lacked `clientes.email`.
This stale-schema/container authentication condition was preserved, not fixed,
relabeled, or converted into implementation scope. Disposable PostgreSQL 16
qualification and tenant doorbell evidence passed independently.

## Persistence and authority evidence

- Archived runtime state: `.sdd-runtime/state.json`, `READY`, sequence `18`,
  checkpoint `Health Report`, verdict `PASS`, legal next `Repository Ready`.
- Archived trace: `.sdd-runtime/trace/`, events `1` through `18`; event 18 hash
  `4649a9607263536a1f2edf161809d7905a62fedf35ebddf330420c480484a9b0` and
  chain hash `4c25b60a809a17d1667aa6584fc153a689ad1ac411ac21f16b65490a0f93fdfd`.
- Authority fingerprints: workflow
  `9f9b72c7823b7ea42f80e0692662a8521b1e3f51ae2f5a017f51fc1b296c1c2a`;
  model map
  `68cadbd5c0fe6793cb84c20b2164508e46c4955f373b61e88eda1c8bef071eb7`;
  config `09e58a7ff63cabe4ace41dac924ccba1fe64ca55cf9c054326b1`.
- Logical routing consumed from `.opencode/sdd-model-map.json`: Repository
  Ready → LOW / `sdd-direct-repository-ready`; model
  `openai/gpt-5.6-luna`.

## Maintainer-Controlled Gates

These gates remain pending and were not executed by agents:

| Gate | Status | Maintainer next action |
|---|---|---|
| Commit | NOT EXECUTED | HUMAN / MAINTAINER must commit the reviewed change. |
| Push | NOT EXECUTED | HUMAN / MAINTAINER must push the committed change. |
| Merge | NOT EXECUTED | HUMAN / MAINTAINER must review and merge the pushed change. |

No release or tag action is simulated or included in this handoff. No Git
operation was executed by agents.

## Decision

**PASS — Repository Ready.** The completed change has sufficient bounded
evidence for maintainer handoff. Repository Ready is terminal for autonomous
dispatch; the remaining HUMAN / MAINTAINER gates are **Commit, Push, and
Merge only**.

## Structured Result

```yaml
status: PASS
change: fresh-db-bootstrap-production-path
artifact: repository-ready.md
blocking_findings: []
manual_gates:
  - Commit
  - Push
  - Merge
next: HUMAN_HANDOFF
```
