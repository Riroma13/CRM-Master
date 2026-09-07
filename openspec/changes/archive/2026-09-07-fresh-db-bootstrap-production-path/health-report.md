---
classification: SDD HEALTH REPORT
semantic_authority: false
---

# Health Report: fresh-db-bootstrap-production-path

## Gate Record

- **Change:** `fresh-db-bootstrap-production-path`
- **Artifact:** `health-report.md`
- **Status:** `PASS_WITH_WARNINGS`
- **Canonical evidence path:** `openspec/changes/archive/2026-09-07-fresh-db-bootstrap-production-path/`
- **Generated at:** `2026-09-07T17:58:08+00:00`

## Evidence

| Check | Result | Evidence |
|---|---|---|
| Required prior artifacts exist | PASS | `archive-report.md`, `verify-report.md`, Design, Tasks/Reviews, Workload Guard, Apply 7.1–7.6, and `.sdd-runtime/state.json` are present in the archive. |
| Canonical path is respected | PASS | The completed change is preserved at `openspec/changes/archive/2026-09-07-fresh-db-bootstrap-production-path/`; archived state is `READY`, sequence `17`, checkpoint `Archive`, verdict `PASS`, next `Health Report`. |
| Direct agent routing is valid | PASS | `.opencode/sdd-model-map.json` routes `Health Report` to LOW / `sdd-direct-health-report`; selected model is `openai/gpt-5.6-luna`. |
| Verification is complete | PASS | `verify-report.md` records PASS with no CRITICAL findings and the approved Design, Tasks, implementation, and runtime evidence in agreement. |
| No unresolved blockers remain | PASS | The completed bootstrap has no change-caused blocker. The existing long-running container condition is recorded below as unrelated, non-blocking baseline debt. |
| Working tree findings | PASS_WITH_WARNINGS | Repository health is not claimed clean: unrelated user work exists, and the pre-existing `crm-master-postgres` authentication/stale-schema condition remains. No Git state was inspected or modified. |

## Mechanical repository health

- `pnpm sdd:validate` — **PASS**, exit `0`; exact result: `CRM-SDD governance validation: PASS`; canonical files/classifications, exactly 14 phases and nested Apply 7.1–7.6, workflow authority and non-semantic Guard boundary, local Direct wiring/legacy STOP stubs/agent bindings, logical role map/hybrid persistence/maintainer gates, and package-level validators/Enterprise template boundary all passed.
- Explicit Design validator — **PASS**, exit `0`: `pnpm sdd:validate:design -- openspec/changes/archive/2026-09-07-fresh-db-bootstrap-production-path/design.md`; 18 numbered sections, A–G topics, decision/rationale separation, and Working Set consistency validated.
- Focused database bootstrap suite — **PASS**, `24/24` tests.
- Full `@crm-master/database` suite — **PASS**, `60/60` tests across 5 files.
- Strict targeted TypeScript check — **PASS**; Prisma/database generation — **PASS**.
- Disposable PostgreSQL 16 + pgvector qualification — **PASS** using `pgvector/pgvector:pg16`; catalog reported PostgreSQL `16.15`, `vector=true`, both reporting parents `RANGE (window_start)`, 121 children each, 6 indexes, 4 functions, and 3 triggers.
- Tenant doorbell — **PASS**, `6/6`; tenant CRUD isolation and raw SQL blocking remained intact.
- Immutable history — **PASS**; all 15 historical `migration.sql` files and `migration_lock.toml` were byte-preserved, with combined SHA-256 `37358cb4a27ae4b79ee17309ce48f2f9d3a28c1ceda888d996e0f22694450a31`.
- Manifest/assets and ledger/deploy evidence — **PASS**; component and migration digests matched, 15 ledger entries matched manifest names/checksums, `prisma migrate status` was clean, and normal `prisma migrate deploy` had no pending migrations. Altered-target rerun rejection also passed.
- No runtime/tooling or historical bootstrap changes were modified; no product files, migrations, or lock file were changed by this bounded action.

## Baseline debt and scope boundary

The existing long-running `crm-master-postgres` container could not authenticate
with its declared credentials and, when forced through the doorbell, lacked
`clientes.email`. This is reproducible, pre-existing environment/stale-schema
debt unrelated to the bootstrap Working Set and is non-blocking. It was not
modified or relabeled. Required disposable PostgreSQL 16 qualification and
doorbell evidence passed independently. Historical/invalid bootstrap changes,
unrelated active changes, product files, migrations, CRM-SDD runtime/tooling,
and Git state were not inspected or modified.

## Persistence status

The exact report and prior phase artifacts remain in the canonical archive.
`.sdd-runtime/state.json` records sequence `17`; the archived trace contains
events `1` through `17`, ending with event hash
`94307bd502fe25978126e4e2cb813e02fcf54c503086c2e55194d39783fd7954` and chain
hash `ba4f65f444f8fbfff3aad483e8b12a423007e8626822414debabe86daef6d470`.
The supplied authority fingerprints match the archived state: workflow
`9f9b72c7823b7ea42f80e0692662a8521b1e3f51ae2f5a017f51fc1b296c1c2a`, model map
`68cadbd5c0fe6793cb84c20b2164508e46c4955f373b61e88eda1c8bef071eb7`, and
config `09e58a7ff63cabe4ace41dac924ccba1fe64ca55eed0bf7cf415cf9c054326b1`.

## Maintainer-Controlled Gates

These gates are intentionally manual and are not executed by SDD-Direct:

| Gate | Status | Maintainer evidence |
|---|---|---|
| Commit | NOT EXECUTED | Pending explicit maintainer action |
| Push | NOT EXECUTED | Pending explicit maintainer action |
| Merge | NOT EXECUTED | Pending explicit maintainer action |
| Release | NOT EXECUTED | Pending explicit maintainer action |
| Tag | NOT EXECUTED | Pending explicit maintainer action |

## Decision

**PASS with warnings.** The completed bootstrap has sufficient bounded
repository-health evidence and no unresolved change-caused blocker. Baseline
debt and unrelated user work remain explicitly recorded, so this report does
not claim a clean repository. The canonical next action is **Repository Ready**.

## Structured Result

```yaml
status: PASS
change: fresh-db-bootstrap-production-path
artifact: health-report.md
blocking_findings: []
manual_gates:
  - Commit
  - Push
  - Merge
  - Release
  - Tag
next: STOP at Repository Ready
```
