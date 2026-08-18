# Repository Ready: Secure Default-Deny Tenant Authentication Boundary

> **Change:** `secure-default-deny-tenant-auth-boundary`
> **Action:** Repository Ready
> **Role:** LOW / OPERATOR-EVIDENCE
> **Normalized result:** PASS
> **Generated at:** 2026-08-18
> **Canonical evidence path:** `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/`
> **Persistence:** hybrid; this repository artifact is the exact Repository Ready record.

## Boundary and provenance

This Repository Ready consumes the PASS Health Report and all exact archived artifacts under `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/`, plus fresh repository evidence produced below. No product source, archived lifecycle artifact, or Git lifecycle operation was performed. This is the bounded maintainer-handoff evidence packet; architecture and implementation judgment remain HIGH / ARCHITECT and MID / BUILDER responsibilities. Commit, Push, Merge, Release, and Tag are intentionally manual and are NOT executed here.

## Consumed Working Set and Read Order

Per `docs/SDD-WORKFLOW.md:162-176`, the approved Working Set and Read Order were consumed before additional reads:

| Artifact | Path | Status |
|---|---|---|
| Design | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/design.md` | Present (PASS — 18 sections, A–G) |
| Architecture Review | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/architecture-review.md` | Present (PASS after AR-01) |
| Tasks | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/tasks.md` | Present |
| Tasks Review | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/tasks-review.md` | Present (PASS) |
| Workload Guard | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/workload-guard.md` | Present (HUMAN-authorized Chained PRs) |
| Apply 7.5 Testing | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/apply-7.5-testing.md` | Present (PASS) |
| Apply Summary | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/apply-summary.md` | Present (PASS) |
| Verify Direct Fix | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/verify-direct-fix.md` | Present |
| Verify Report | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/verify-report.md` | Present (PASS) |
| Archive Report | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/archive-report.md` | Present (PASS) |
| Health Report | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/health-report.md` | Present (PASS) |

All 11 archived lifecycle artifacts are intact. The full 14-phase lifecycle (Design → Architecture Review → Tasks → Tasks Review → Workload Guard → Apply 7.1–7.6 → Verify → Archive → Health Report → Repository Ready) is complete and PASS through Health Report.

## Fresh validator evidence (at handoff)

| Check | Result | Evidence |
|---|---|---|
| SDD validator | PASS | `pnpm sdd:validate` — canonical files, 14 phases, Direct wiring, role map, hybrid persistence, maintainer gates all valid |
| Design validator | PASS | `pnpm sdd:validate:design -- openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/design.md` — 18 sections, A–G topics |
| Git diff check | PASS | `git diff --check` — exit 0 (no conflict markers, no whitespace issues) |

## Gate Record

| Check | Result | Evidence |
|---|---|---|
| Required prior artifacts exist | PASS | All 11 archived artifacts present (see table above) |
| Canonical path is respected | PASS | `openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/` |
| Direct agent routing is valid | PASS | `.opencode/sdd-model-map.json` — Repository Ready → LOW / OPERATOR-EVIDENCE (`sdd-direct-repository-ready`) |
| Verification is complete | PASS | `verify-report.md` — PASS; V-001/V-002 closed by Direct Fix |
| No unresolved blockers remain | PASS | Health Report `blocked_by: []`; Verify findings: [] |
| Working tree findings | PASS | 12 tracked modified + 2 untracked new = 14 files; exact Working Set match; 0 deviations |

## Working Set reconciliation

| Metric | Approved (archive) | Current repository | Match |
|---|---|---|---|
| Production files modified | 9 | 12 tracked modified (9 production + 3 modified test) | PASS — exact set |
| Test files changed | 5 | 2 untracked created + 3 tracked modified test files | PASS — exact set |
| Total implementation files | 14 | 14 | PASS |
| Bounded deviation files | 0 | 0 | PASS |
| New dependencies | 0 | 0 | PASS |
| Schema/migration files changed | 0 | 0 | PASS |
| Unexpected files | 0 | 0 | PASS |

Exact 14-file Working Set confirmed:

**Production (9):**
- `apps/api/src/common/decorators/public.decorator.ts`
- `apps/api/src/common/guards/better-auth.guard.ts`
- `apps/api/src/common/guards/tenant-scope.guard.ts`
- `apps/api/src/common/guards/permissions.guard.ts`
- `apps/api/src/modules/client-auth/client-auth.guard.ts`
- `apps/api/src/modules/client-auth/client-auth.controller.ts`
- `apps/api/src/modules/export/export.controller.ts`
- `apps/api/src/modules/public-api/v1/v1-workflows.controller.ts`
- `apps/api/src/modules/public-api/v1/v1-documents.controller.ts`

**Test (5):**
- `apps/api/src/common/guards/tenant-auth-boundary.guard.spec.ts` (created)
- `apps/api/src/common/guards/tenant-scope.guard.spec.ts`
- `apps/api/src/common/guards/permissions.guard.spec.ts`
- `apps/api/src/modules/client-auth/client-auth.guard.spec.ts`
- `apps/api/test/doorbell/tenant-auth-default-deny.doorbell.spec.ts` (created)

## Git boundary

- **Branch:** `sec/secure-default-deny-tenant-auth-boundary` (the authorized Chained PRs delivery branch per `workload-guard.md`; never `main`).
- **Working tree:** 12 tracked modified files, 2 untracked new test files — all within the approved Working Set.
- **Staged changes:** None.
- **Git lifecycle operations:** None performed.
- **Preserved unrelated work:** `openspec/changes/felix-git-repository-setup/` remains untracked and untouched.

## Final P0 security remediation state

The archived evidence and fresh validators confirm the P0 default-deny tenant authentication boundary is complete and consistent:

| Contract element | Status | Evidence |
|---|---|---|
| Default-deny auth | PASS | `verify-report.md:38`; unclassified requests without credentials return 401 |
| Host/actor separation | PASS | `verify-report.md:38`; `TenantResolveMiddleware` owns immutable `hostTenantId` |
| No anonymous `lector` | PASS | `verify-report.md:41`; `PermissionsGuard` requires a principal |
| Explicit `@Public()` allow-list only | PASS | `verify-report.md:40-41`; health, metrics, auth, client-auth/logout, shared-document only |
| Public scope enforcement for authenticated principals | PASS | `verify-report.md:39-40`; V-001 closed by Direct Fix — `TenantScopeGuard` enforces Host scope even on `@Public()` metadata |
| Tenant A/B isolation | PASS | `verify-report.md:42-43`; 22 scenarios / 23 tests executed; cross-tenant access returns 403 before effects |

## Preserved baseline debt versus change-caused issues

| Category | Detail | Classification |
|---|---|---|
| Pre-existing tenant-web test failures | 5 `lucide-react` mock tests fail in tenant-web sidebar (`KNOWN_ISSUES.md`). This change modifies zero frontend files. | BASELINE_DEBT — pre-existing, unrelated, not change-caused |
| Change-caused test failures | None. All focused validators and unit suites pass. | None |
| Change-caused lint/typecheck/build failures | None. All pass. | None |

Baseline debt is preserved as recorded and is not converted into a new implementation task.

## Conditions and follow-up owned outside this change

These are explicitly non-blocking and recorded as deferred; they require separate design or maintainer action:

1. **API-token tenant scope (AR-06):** Body/query/path `tenantId` isolation for public API-token routes is explicitly out of scope. No remediation was performed. Requires separate design.
2. **Webhook/callback admission (AR-07/G):** Unsigned/unregistered webhook candidates remain default-denied. Opening them requires a separately designed signed/stateful contract.
3. **Disposable doorbell re-execution:** Requires re-provisioning `pgvector/pgvector:pg16` at `localhost:55433` and `redis:7-alpine` at `localhost:56379`. The doorbell matrix passed once under Verify; re-execution is a harness/infrastructure condition, not a security regression.
4. **Pre-existing tenant-web test failures:** 5 `lucide-react` mock failures in `KNOWN_ISSUES.md` — BASELINE_DEBT, unrelated, frontend-only, untouched by this change.

## Maintainer-controlled gates

These gates are intentionally manual and are NOT executed by this Repository Ready:

| Gate | Status | Maintainer evidence |
|---|---|---|
| Commit | NOT EXECUTED | Pending maintainer action on `sec/secure-default-deny-tenant-auth-boundary` — 12 tracked modified + 2 untracked new files |
| Push | NOT EXECUTED | Pending maintainer action |
| Merge | NOT EXECUTED | Pending maintainer action |
| Release | NOT EXECUTED | Outside 14-phase lifecycle |
| Tag | NOT EXECUTED | Outside 14-phase lifecycle |

## Decision

Repository Ready is PASS. The complete 14-phase SDD lifecycle is satisfied through Health Report. All prior artifacts are intact, the Working Set matches the approved set exactly (14 files, 0 deviations, 0 unexpected, 0 new dependencies, 0 schema changes), all governance validators pass, the P0 default-deny tenant authentication boundary is complete and consistent, and no unresolved blockers remain. The change is ready for the maintainer handoff.

## Structured result

```yaml
status: PASS
change: secure-default-deny-tenant-auth-boundary
action: Repository Ready
role: LOW / OPERATOR-EVIDENCE
artifact: openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/repository-ready.md
artifacts_consumed:
  - openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/health-report.md
  - openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/archive-report.md
  - openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/verify-report.md
  - openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/apply-summary.md
  - openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/apply-7.5-testing.md
  - openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/verify-direct-fix.md
  - openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/design.md
  - openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/architecture-review.md
  - openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/tasks.md
  - openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/tasks-review.md
  - openspec/changes/archive/2026-08-18-secure-default-deny-tenant-auth-boundary/workload-guard.md
evidence:
  sdd_validator: PASS
  design_validator: PASS
  git_diff_check: PASS (exit 0)
  working_set: 14 files exact match; 0 deviations; 0 unexpected; 0 new dependencies; 0 schema changes
  branch: sec/secure-default-deny-tenant-auth-boundary (never main)
  staged_changes: 0
  git_lifecycle_operations: 0
  p0_security_remediation: complete and consistent
  baseline_debt: 5 pre-existing tenant-web lucide-react mock failures (unrelated, frontend-only, untouched)
blocked_by: []
manual_gates:
  - Commit
  - Push
  - Merge
  - Release
  - Tag
next: STOP at maintainer handoff — Commit / Push / Merge are HUMAN / MAINTAINER-only
```

## Canonical next action

**STOP at maintainer handoff.** Commit, Push, and Merge are HUMAN / MAINTAINER-only lifecycle phases (`docs/SDD-WORKFLOW.md:79-81,226-232`). Repository Ready produces the final bounded evidence packet and explicitly lists the remaining manual gates; it performs no Git lifecycle operation. The workflow terminates after the Merge handoff.
