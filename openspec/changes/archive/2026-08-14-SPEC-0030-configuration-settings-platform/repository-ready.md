# Repository Ready: SPEC-0030 — Configuration & Settings Platform

> **Phase:** Repository Ready
> **Role:** LOW / OPERATOR-EVIDENCE — `sdd-direct-repository-ready`
> **Persistence:** hybrid
> **Status:** PASS_WITH_WARNINGS
> **Change:** SPEC-0030-configuration-settings-platform
> **Generated at:** 2026-08-14T15:30:00Z
> **Canonical evidence path:** `openspec/changes/archive/2026-08-14-SPEC-0030-configuration-settings-platform/`

## Gate Record

| Gate | Status | Evidence |
|---|---|---|
| Health Report | PASS_WITH_WARNINGS | `health-report.md` — all phase gates through Archive satisfied |
| Archive | SUCCESS | `archive-report.md` — 13 artifacts, 15/15 tasks |
| Verify | PASS | `verify-report.md` — verdict `pass`, 0 blockers, 0 critical |
| Repository Ready | PASS_WITH_WARNINGS | This artifact |

## Evidence

| Check | Result | Evidence |
|---|---|---|
| Required prior artifacts exist | PASS | All 14 archive artifacts present: design.md, architecture-review.md (+ initial, pre-maintainer), tasks.md, tasks-review.md (+ pre-refinement), apply-progress.md, apply-summary.md, tdd-cycle-evidence.md, work-unit-evidence.md, verify-report.md, archive-report.md, health-report.md, repository-ready.md |
| Canonical path is respected | PASS | `openspec/changes/archive/2026-08-14-SPEC-0030-configuration-settings-platform/repository-ready.md` |
| Direct agent routing is valid | PASS | `.opencode/sdd-model-map.json` — `sdd-direct-repository-ready` → LOW / OPERATOR-EVIDENCE (LongCat-2.0) |
| Verification is complete | PASS | `verify-report.md` — verdict `pass`, 0 blockers, 0 critical findings, requirements 0/0, scenarios 0/0 |
| No unresolved blockers remain | PASS | verify-report, archive-report, health-report, and validator runs agree: 0 blockers |
| `pnpm sdd:validate` | PASS | exit 0 — canonical files, 14 phases, nested Apply 7.1–7.6, Direct wiring, hybrid persistence, maintainer gates all valid |
| `git diff --check` | PASS | exit 0, empty output |
| Working tree findings | CLEAN — only approved Working Set | `git status --short`: 4 modified (tenant-profile.module.ts, tenant-profile.service.ts, tenant.module.ts, admin.ts) + 11 approved untracked Working Set files + archive dir. No unexpected production, test, dependency, schema, migration, or excluded-path changes |

## Working Set Reconciliation — 15/15

| Category | Planned | Actual | Evidence |
|----------|--------:|-------:|----------|
| Approved files | 15 | 15 | `git status --short` + filesystem inspection |
| Creates | 10 | 11 | 11 untracked files (see note below) |
| Modifies | 5 | 4 | 4 tracked modified files |
| Unexpected production/test files | 0 | 0 | No paths outside approved Working Set |
| Unexpected dependencies | 0 | 0 | No package.json or pnpm-lock.yaml change |

**Note on create/modify split:** `apps/tenant-web/src/config/navigation/admin.test.ts` is recorded in the Design and Tasks as a "Modify" but is observed by `git status` as an untracked new file (`??`), because it is not tracked in git (`git ls-files --error-unmatch` confirms absence). This discrepancy was recorded as a CONDITION in verify-report.md and health-report.md and does not change the PASS verdict. The total approved Working Set count remains 15/15 with zero unexpected files.

**Exclusions respected:** No schema, migration, generated, package, lockfile, guard/auth, Sidebar/registry, unrelated module, SPEC-0028, or SPEC-0029 path changed.

### Modified (4)
- `apps/api/src/modules/tenant-profile/tenant-profile.module.ts`
- `apps/api/src/modules/tenant-profile/tenant-profile.service.ts`
- `apps/api/src/modules/tenant/tenant.module.ts`
- `apps/tenant-web/src/config/navigation/admin.ts`

### Untracked / Creates (11)
- `apps/api/src/modules/tenant-profile/tenant-profile.service.spec.ts`
- `apps/api/src/modules/tenant-settings/__tests__/tenant-settings.controller.spec.ts`
- `apps/api/src/modules/tenant-settings/__tests__/tenant-settings.service.spec.ts`
- `apps/api/src/modules/tenant-settings/tenant-settings.controller.ts`
- `apps/api/src/modules/tenant-settings/tenant-settings.dto.ts`
- `apps/api/src/modules/tenant-settings/tenant-settings.module.ts`
- `apps/api/src/modules/tenant-settings/tenant-settings.service.ts`
- `apps/api/test/doorbell/tenant-settings-isolation.spec.ts`
- `apps/tenant-web/src/app/(admin)/admin/settings/page.test.tsx`
- `apps/tenant-web/src/app/(admin)/admin/settings/page.tsx`
- `apps/tenant-web/src/config/navigation/admin.test.ts`

## Validator Results

| Check | Result | Evidence |
|---|---|---|
| `pnpm sdd:validate` (`validate-sdd-direct.mjs`) | PASS | exit 0 — all governance invariants valid |
| `git diff --check` | PASS | exit 0, empty output |
| Focused API tests | PASS (per verify-report) | `pnpm --filter api test -- --runInBand tenant-settings tenant-profile.service` — 3 suites, 9 tests |
| Doorbell e2e | PASS (per verify-report) | `pnpm --filter api test:e2e -- tenant-settings-isolation.spec.ts` — 1 suite, 1 real AppModule/HTTP/DB test |
| API build | PASS (per verify-report) | `pnpm --filter api build` exit 0 |
| API lint | PASS (per verify-report) | `pnpm --filter api lint` exit 0 |
| Tenant-web tests | PASS (per verify-report) | `pnpm --filter tenant-web test -- settings admin.test.ts` — 2 files, 4 tests |
| Tenant-web build | PASS (per verify-report) | `pnpm --filter tenant-web build` exit 0 |
| Tenant-web lint | PASS with pre-existing warnings (per verify-report) | Warnings in unrelated files only (baseline debt) |

## Baseline Debt

Per `docs/SDD-WORKFLOW.md` §Baseline Debt, the following are pre-existing, unrelated, reproducible conditions recorded as baseline debt. They do not block this change and are outside the approved Working Set.

| Debt | Location | Evidence |
|---|---|---|
| Jest post-run open-handle warning | API e2e test harness | Repeats after `tenant-settings-isolation.spec.ts`; predates the permitted doorbell Direct Fix; does not invalidate the passing HTTP scenario (verify-report.md CONDITION) |
| Tenant-web lint warnings | `calendario-academico/page.tsx`, `clientes/[id]/page.tsx`, `perfil/page.tsx`, `sistemas/[id]/page.tsx`, `sidebar.tsx` | `react-hooks/exhaustive-deps` and `@next/next/no-img-element` warnings in unrelated files; unchanged by this Working Set |
| `admin.test.ts` create-vs-modify discrepancy | `apps/tenant-web/src/config/navigation/admin.test.ts` | Design/Tasks record it as Modify; git observes it as untracked new file. Total Working Set remains 15/15, zero unexpected files. Recorded as CONDITION in verify-report and health-report |

## Hybrid Persistence Status

| Store | Status | Content |
|---|---|---|
| Repository artifacts (`openspec/changes/archive/2026-08-14-SPEC-0030-configuration-settings-platform/`) | COMPLETE | 14 artifacts: design.md, architecture-review*.md (3), tasks.md, tasks-review*.md (2), apply-progress.md, apply-summary.md, tdd-cycle-evidence.md, work-unit-evidence.md, verify-report.md, archive-report.md, health-report.md, repository-ready.md |
| Engram (`crm-master` project key) | ACTIVE | Durable bounded context, decisions, status summaries, recovery metadata per `docs/SDD-WORKFLOW.md` §Hybrid Persistence Contract |

Repository files remain the exact artifact record. Engram does not replace, reinterpret, or override them.

## Phase Gate Summary

| Phase | Result | Artifact |
|---|---|---|
| Design | Complete (maintainer-authorized AR-007/AR-008 correction) | `design.md` |
| Architecture Review (initial) | BLOCKED (preserved) | `architecture-review-initial.md` |
| Architecture Review (pre-maintainer) | BLOCKED (preserved) | `architecture-review-pre-maintainer-correction.md` |
| Architecture Review (fresh) | **PASS** | `architecture-review.md` |
| Tasks | 15/15 complete | `tasks.md` |
| Tasks Review (pre-refinement) | BLOCKED (preserved) | `tasks-review-pre-refinement.md` |
| Tasks Review (fresh) | **PASS** | `tasks-review.md` |
| Apply 7.1–7.5 | PASS | `apply-progress.md` |
| Apply 7.6 | PASS | `apply-summary.md` |
| Verify (after 1 permitted Direct Fix) | **PASS** | `verify-report.md` |
| Archive | SUCCESS | `archive-report.md` |
| Health Report | PASS_WITH_WARNINGS | `health-report.md` |
| Repository Ready | PASS_WITH_WARNINGS | `repository-ready.md` |

## Unresolved Blockers

**None.** Verify verdict is `pass` with 0 blockers and 0 critical findings. All phase gates through Repository Ready are PASS, PASS_WITH_WARNINGS, or SUCCESS. No unresolved material contradictions.

## Decision

**PASS_WITH_WARNINGS.** The approved Design, reviews, completed Tasks, implementation, Working Set/exclusions (15/15 reconciled), dependency boundary, hybrid persistence, and current runtime evidence agree. All phase gates through Archive are satisfied. The Jest open-handle warning, tenant-web lint warnings, and admin.test.ts create/modify discrepancy are pre-existing or already-recorded conditions classified as baseline debt / recorded conditions; none invalidates the passing evidence. The change is ready for maintainer handoff.

## Maintainer-Controlled Gates

These gates are intentionally manual and are **not** executed by SDD-Direct per `AGENTS.md` §Maintainer-Controlled Git and `docs/SDD-WORKFLOW.md` §Terminal Maintainer Handoff:

| Gate | Status | Maintainer evidence |
|---|---|---|
| Commit | **NOT EXECUTED** | Pending maintainer action — 4 modified + 11 untracked files staged and committed per Conventional Commits |
| Push | **NOT EXECUTED** | Pending maintainer action — push feature branch to remote |
| Merge | **NOT EXECUTED** | Pending maintainer action — merge to `main` (PR review required) |
| Release | **NOT EXECUTED** | Pending maintainer action — outside 14-phase CRM lifecycle; maintainer-controlled |
| Tag | **NOT EXECUTED** | Pending maintainer action — outside 14-phase CRM lifecycle; maintainer-controlled |

**Proposed commit scope:** SPEC-0030 tenant identity settings facade — 15 files (10 primary creates + 5 secondary/test creates + 5 modifies = 15 total; admin.test.ts observed as untracked create).

**Workload Guard note:** Estimated changed lines 320–400 (tasks.md forecast). Single bounded delivery; no chained-PR strategy was authorized. If the maintainer assesses the change as exceeding the 400-line review budget, the chained-pr skill applies before Merge.

## Structured Result

```yaml
status: PASS_WITH_WARNINGS
change: SPEC-0030-configuration-settings-platform
artifact: repository-ready.md
artifact_path: openspec/changes/archive/2026-08-14-SPEC-0030-configuration-settings-platform/repository-ready.md
health_report: openspec/changes/archive/2026-08-14-SPEC-0030-configuration-settings-platform/health-report.md
working_set:
  planned: 15
  actual: 15
  creates_planned: 10
  creates_actual: 11
  modifies_planned: 5
  modifies_actual: 4
  unexpected: 0
  notes: admin.test.ts recorded as Modify in Design/Tasks but observed as untracked create in git; total 15/15 reconciled, zero unexpected files (CONDITION recorded in verify-report and health-report)
baseline_debt:
  - Jest post-run open-handle warning (api e2e harness, pre-existing, non-blocking)
  - tenant-web lint warnings in unrelated calendario/clientes/perfil/sistemas/sidebar files (pre-existing, non-blocking)
  - admin.test.ts create/modify split discrepancy (recorded CONDITION, non-blocking)
blocking_findings: []
validator:
  sdd_validate: PASS
  git_diff_check: PASS
manual_gates:
  - Commit
  - Push
  - Merge
  - Release
  - Tag
next: STOP — HUMAN / MAINTAINER handoff. No further agent action authorized.
```

## Terminal Handoff

Repository Ready is the terminal agent action. The canonical workflow (`docs/SDD-WORKFLOW.md`) terminates the agent path here. Commit, Push, Merge, Release, and Tag are HUMAN / MAINTAINER-only. No agent may execute, simulate, or authorize those operations. The maintainer receives:

1. This `repository-ready.md` with exact evidence paths.
2. `health-report.md` and `verify-report.md` for prior-phase evidence.
3. `archive-report.md` for the complete artifact chain.
4. The proposed commit scope and workload guard note above.
