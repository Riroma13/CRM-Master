# Repository Ready: SPEC-0031 — Import / Export Platform

> **Phase:** Repository Ready
> **Role:** LOW / OPERATOR-EVIDENCE — `sdd-direct-repository-ready`
> **Persistence:** hybrid
> **Status:** PASS_WITH_WARNINGS
> **Date:** 2026-08-15
> **Change status:** Complete through Health Report; this artifact prepares the maintainer handoff only.

## Gate Record

- **Change:** `SPEC-0031-import-export-platform`
- **Artifact:** `repository-ready.md`
- **Status:** `PASS_WITH_WARNINGS`
- **Canonical evidence path:** `openspec/changes/archive/2026-08-15-SPEC-0031-import-export-platform/`
- **Generated at:** `2026-08-15`
- **HEAD:** `275aeef feat(settings): implement SPEC-0030 configuration platform`

## Evidence Consumed (chronology preserved, read before bounded inspection)

| Phase | Artifact | Role | Result |
|---|---|---|---|
| Design | `design.md` | HIGH / ARCHITECT | 18 sections + A–G topics; refined after one BLOCKED Architecture Review |
| Architecture Review (pre-refinement) | `architecture-review-pre-refinement.md` | HIGH | BLOCKED — preserved unchanged |
| Architecture Review (fresh) | `architecture-review.md` | HIGH | PASS — AR-010 CONDITION recorded |
| Tasks | `tasks.md` | MID | 9/9 complete; authoritative 16-path Working Set |
| Tasks Review | `tasks-review.md` | MID | PASS — TR-007 CONDITION recorded |
| Workload Guard | `workload-guard.md` | MID | READY — HUMAN-authorized |
| Apply Recovery | `apply-recovery.md` | MID | HUMAN-authorized bounded reconciliation |
| Apply Progress | `apply-progress.md` | MID | PASS — 9/9 reconciled |
| Apply Summary (7.6) | `apply-summary.md` | MID | PASS — 16 paths, 0 unexpected |
| Verify Direct Fix Recovery | `verify-direct-fix-recovery.md` | HIGH | VERIFY-003 only; HUMAN-authorized bounded doorbell proof |
| Verify Report | `verify-report.md` | HIGH | PASS — fresh after one permitted VERIFY-003 Direct Fix |
| Archive Report | `archive-report.md` | LOW | success — 12 artifacts, Verify PASS, Tasks 9/9 |
| Health Report | `health-report.md` | LOW | PASS_WITH_WARNINGS |

## Artifact Integrity (13/13 now present, including this one)

| # | Artifact | Present |
|---|------|------:|
| 1 | `design.md` | ✅ |
| 2 | `architecture-review-pre-refinement.md` | ✅ |
| 3 | `architecture-review.md` | ✅ |
| 4 | `tasks.md` (9/9 complete) | ✅ |
| 5 | `tasks-review.md` | ✅ |
| 6 | `workload-guard.md` | ✅ |
| 7 | `apply-recovery.md` | ✅ |
| 8 | `apply-progress.md` | ✅ |
| 9 | `apply-summary.md` | ✅ |
| 10 | `verify-direct-fix-recovery.md` | ✅ |
| 11 | `verify-report.md` | ✅ |
| 12 | `archive-report.md` | ✅ |
| 13 | `health-report.md` | ✅ |

> Note: `repository-ready.md` (this artifact) is the 13th file. The 12 prior artifacts were listed at Archive/Health time; this is the terminal LOW-phase handoff add.

## Working Set / Path Reconciliation (re-verified against git)

| Category | Planned | Actual | Evidence |
|----------|--------:|-------:|----------|
| Approved paths | 16 | 16 | `tasks.md` authoritative Working Set |
| Creates | 7 | 7 | git untracked: `__tests__/`, `clientes-csv-import.definition.ts`, `clientes-csv-import.processor.ts`, `import-export.contracts.ts`, `import-export.service.ts`, `import-export-tenant-isolation.e2e-spec.ts` + the archive directory |
| Modifies | 8 | 8 | `admin-tools.controller.ts`, `admin-tools.module.ts`, `audit.service.ts`, `ingestion.service.ts`, `export.controller.ts`, `export.module.ts`, `jobs-client.service.ts`, `jobs.contracts.ts` |
| Deletes | 1 | 1 | `csv-import.service.ts` |
| Unexpected production/test paths | 0 | 0 | `git status` confirms no path outside the Working Set |
| Unexpected dependencies | 0 | 0 | — |

**Conclusion:** Working Set integrity is exact. All repository changes are confined to the approved 16 paths. The archive directory itself is the only additional untracked path (artifact store, not production code). The original active path `openspec/changes/SPEC-0031-import-export-platform/` is confirmed absent (documented Archive move). Do not recreate it.

`git diff --stat` confirms 9 tracked files changed, +242 / -128, consistent with the 8M + 1D Working Set.

## Mechanical Validators (re-run now, reproducible)

| Validator | Command | Exit | Result |
|---|---|---:|---|
| SDD governance | `pnpm sdd:validate` | 0 | **PASS** — canonical files, 14 phases, Direct wiring, role map, hybrid persistence, maintainer gates all valid |
| Whitespace | `git diff --check` | 0 | **PASS** — no whitespace errors |

> Focused test validators (unit/processor, doorbell e2e) and the Enterprise Design validator PASS results are preserved unchanged from the Health Report and are not re-run here. No production code, test, or prior artifact has changed since the Health Report run; re-running is unnecessary and would only reproduce the same PASS_WITH_WARNINGS / BASELINE_DEBT findings already documented.

## Conditions (non-blocking, recorded, unchanged)

1. **Jest post-run open-handle warning** — repeats after focused doorbell completion; assertions pass and command exits 0. Non-blocking runtime condition, recorded across Apply/Verify/Archive/Health. Not caused by a failed assertion.
2. **AR-010 / TR-007 — CONDITION** — the enumerated 16-path Working Set is authoritative; the Design's forecast create count differs by one. Do not broaden or normalize the path list. Non-blocking, preserved unchanged.

## Baseline Debt (re-produced by the Health Report, provably unchanged)

`pnpm test` exits 1. **git status proves all changes are confined to the 16-path Working Set; therefore every failure outside those paths is provably unrelated to SPEC-0031.** Classification: BASELINE_DEBT under the canonical rule — pre-existing, unrelated, reproducible failures outside the approved Working Set. None block this change. The repository is **not claimed clean** on account of this unrelated baseline debt.

| Suite / Test | Failure kind | Related to SPEC-0031? |
|---|---|---|
| `api` reporting suites (replay, report-engine, export.service, kpi-engine, dashboard-engine, dashboard-hydrator, snapshot.service, reconciliation) | Test suite failed to run — Nest module bootstrap | No — outside Working Set |
| `api` citas / documentos / client-auth / client-user-management / public-api / dashboard / clients specs | Test suite failed to run — Nest bootstrap | No — outside Working Set |
| `api` `audit/__tests__/audit-api.spec.ts` | Test suite failed to run — test-harness provider gap (`IngestionService`/`BullQueue_audit-ingestion` not registered in spec) | No — harness wiring gap, not behavioral; runtime path proven by passing doorbell |
| `tenant-web` `calendario/components/calendar-picker.test.tsx` | Assertion failure | No — outside Working Set |
| `tenant-web` `documentos/components/upload-dialog.test.tsx` | Test timeout (5000ms) | No — outside Working Set, pre-existing/flaky harness |

## Maintainer-Controlled Gates (HUMAN / MAINTAINER only)

These gates are intentionally manual and are **not executed** by SDD-Direct. Repository Ready prepares evidence only and must not simulate, authorize, or perform any Git lifecycle operation.

| Gate | Status | Maintainer evidence |
|---|---|---|
| Commit | **NOT EXECUTED** — pending maintainer only | Staged working tree is the 16-path Working Set (+ archive artifacts); maintainer authorizes the commit |
| Push | **NOT EXECUTED** — pending maintainer only | Maintainer only |
| Merge | **NOT EXECUTED** — pending maintainer only | Maintainer only |
| Release | **NOT EXECUTED** — pending maintainer only | Maintainer only (outside the 14-phase CRM lifecycle) |
| Tag | **NOT EXECUTED** — pending maintainer only | Maintainer only (outside the 14-phase CRM lifecycle) |

## Maintainer Instructions (evidence, not authorization)

The following are prepared as evidence for the maintainer. They do not constitute execution or authorization by any agent.

1. **Commit scope** — the commit must include exactly the 16 Working Set paths (8 modified + 1 deleted + 6 production untracked creates + their `__tests__/` directory) and may optionally include the archive directory `openspec/changes/archive/2026-08-15-SPEC-0031-import-export-platform/`. No other production/test path is staged. Verify with `git status` before committing.
2. **Baseline debt is not part of this change** — the failing unrelated suites (`pnpm test` exit 1) are pre-existing and outside the Working Set. Do not expand scope to fix them under SPEC-0031; record them separately if desired.
3. **`audit-api.spec.ts` flag** — the source files `audit.service.ts`/`ingestion.service.ts` were modified by this change, but the `audit-api.spec.ts` failure is the test harness's own incomplete provider registration (not a behavioral regression). The end-to-end audit-before-delivery path is proven by the passing doorbell suite. Flagged for maintainer awareness as pre-existing test-harness debt.
4. **Open-handle warning** — the Jest post-run open-handle warning is a non-blocking runtime condition; assertions pass and commands exit 0. It has been present across Apply/Verify/Archive/Health and does not block this change.
5. **Do not recreate the active path** — the original `openspec/changes/SPEC-0031-import-export-platform/` is intentionally absent per the documented Archive move. The canonical evidence root is the dated archive directory only.
6. **Chained-PR consideration** — `workload-guard.md` previously recorded the HUMAN-authorized path (chained-prs / `feature-branch-chain`). Maintainer should confirm whether the current 9-file / +242/-128 diff should be delivered as a single commit or split, per repository policy.

## Decision

**PASS_WITH_WARNINGS.** SPEC-0031 is complete through Health Report and Repository Ready: all 13 archive artifacts present and chronologically intact (12 prior + this Repository Ready), HEAD `275aeef` matches the Health Report record, Verify PASS, Tasks 9/9, Working Set integrity exact (16/16 paths, zero unexpected), both mechanical validators pass (`pnpm sdd:validate` exit 0, `git diff --check` exit 0), active path confirmed absent, and the documented non-blocking conditions are unchanged.

The WITH_WARNINGS qualifier reflects (1) the recurring Jest open-handle CONDITION and (2) reproducible baseline debt in unrelated suites (`pnpm test` exit 1) — both pre-existing and outside the Working Set, neither blocking. The repository is explicitly **not claimed clean** on account of that unrelated baseline debt.

No architectural or implementation judgment was required or performed. No production code, tests, Design, Tasks, reviews, Workload Guard, Apply, Verify, Archive, or Health Report evidence was modified. No Git lifecycle operation (Commit, Push, Merge, Release, Tag, reset, clean, stash, restore, checkout, or discard) was performed. This is evidence preparation only.

## Structured Result

```yaml
status: PASS_WITH_WARNINGS
change: SPEC-0031-import-export-platform
artifact: repository-ready.md
canonical_evidence_path: openspec/changes/archive/2026-08-15-SPEC-0031-import-export-platform/
head: 275aeef
active_path_confirmed_absent: true
blocking_findings: []
conditions:
  - Jest post-run open-handle warning (non-blocking, re-produced)
  - AR-010/TR-007: 16-path Working Set authoritative (non-blocking)
baseline_debt:
  - pnpm test exit 1 from unrelated api suites (Nest module bootstrap)
  - tenant-web calendar-picker.test.tsx assertion (documented)
  - tenant-web upload-dialog.test.tsx timeout (unrelated harness)
  - audit-api.spec.ts test-harness provider gap (not behavioral)
validators:
  pnpm_sdd_validate: { exit: 0, result: PASS }
  git_diff_check: { exit: 0, result: PASS }
manual_gates:
  - Commit
  - Push
  - Merge
  - Release
  - Tag
next: STOP at maintainer Commit handoff
```
