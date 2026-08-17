# Health Report: Secure Workflow Execution Boundary

> **Normalized result:** PASS
> **Executor:** LOW / OPERATOR-EVIDENCE — `sdd-direct-health-report`
> **Model binding:** `longcat/LongCat-2.0` (`.opencode/sdd-model-map.json:18-22,44-46,60-61`)
> **Persistence:** hybrid; this file is the exact Health Report artifact.
> **Source edge:** `Archive -> Health Report` (`docs/SDD-WORKFLOW.md:103`)

## Gate Record

- **Change:** `secure-workflow-execution-boundary`
- **Artifact:** `health-report.md`
- **Status:** PASS
- **Canonical evidence path:** `openspec/changes/secure-workflow-execution-boundary/`
- **Generated at:** `2026-08-17T18:25:00Z`

## Change Summary

The change bound every workflow route to the Host-resolved tenant plus a verified
Identity membership, replaced caller-supplied `tenantId` authorization with
trusted Host/Identity context, added a canonical `workflow` permission resource
granted only to `owner` and exact Identity `admin`, enforced strict shared Zod
definition parsing before all persistence/execution side effects, and removed
dynamic decision evaluation (`new Function`) in favor of own-field strict literal
interpretation. A real-Prisma doorbell test (Tenant A/B) proved the global-first
permission order and the cross-tenant start-route `403` correction.

All 11 implementation tasks are complete across three internally evidenced
delivery slices (PR1 RED contracts, PR2 implementation, PR3 doorbell). In-scope
production authorization logic within the approved Working Set was intentionally
changed; no out-of-scope production authorization architecture, global guard
order, schema, migration, dependency, infrastructure, or credential state was
changed.

## Evidence

| Check | Result | Evidence |
|---|---|---|
| Required prior artifacts exist | PASS | `design.md`, `architecture-review.md`, `tasks.md`, `tasks-review.md`, `workload-guard.md`, `apply-summary.md`, `verify.md`, `verify-report.md`, `archive-report.md` present in canonical path |
| Archive result | PASS | `archive-report.md:3` — Result: PASS |
| Verify result | PASS | `verify-report.md:6` — Result: PASS (after V-01 Direct Fix) |
| All 11 tasks complete | PASS | `tasks.md:15-30` — all 11 tasks `[x]` |
| Architecture Review PASS | PASS | `architecture-review.md:292` — fresh PASS after AR-05/AR-06 maintainer-authorized Design corrections |
| Tasks Review PASS | PASS | `tasks-review.md:69` — fresh PASS after Tasks Refinement (TR-01/TR-02/TR-03 closed) |
| Workload Guard satisfied | PASS | `workload-guard.md:52` — feature-branch-chain authorized by HUMAN/MAINTAINER; Apply proceeded through 7.1–7.6 |
| Working Set matches approved Design §5 | PASS | `git diff --name-only` (15 tracked) + untracked new files = exactly the 19-file Working Set + 1 bounded deviation (`workflow-cross-tenant-isolation.spec.ts`) |
| No dependency changes | PASS | No `package.json`, lockfile, or `node_modules` path in diff |
| No Prisma/schema/migration changes | PASS | No `schema.prisma` or migration files in diff |
| No app-module/middleware/global-guard changes | PASS | No `app.module.ts`, middleware, or `permissions.guard.ts` in diff; global order preserved |
| No frontend/plugin/infrastructure/credential changes | PASS | Diff bounded to `apps/api/.../workflow/`, `apps/api/.../identity/identity.module.ts`, `apps/api/.../common/auth/permissions.ts`, `packages/shared/src/workflow/`, and approved test files |
| `git diff --check` | PASS | Exit 0 — no conflict markers or whitespace errors |
| `pnpm sdd:validate` | PASS | `CRM-SDD governance validation: PASS` (all governance, lifecycle, wiring, role, persistence, maintainer-gate, and Enterprise Design checks) |
| No unresolved Verify blockers | PASS | `verify.md:78-143` — fresh Verify PASS; V-01 Direct Fix applied and re-verified; CRITICAL: None, BASELINE_DEBT: None |
| Canonical next action | PASS | `archive-report.md:81` — "Health Report — owned by LOW / OPERATOR-EVIDENCE" |

## Exact Validations

| Command / Check | Result |
|---|---|
| `pnpm sdd:validate` | PASS — canonical files/classifications, 14-phase lifecycle, nested Apply 7.1–7.6, workflow authority, local Direct wiring, logical roles, hybrid persistence, maintainer gates, package validators, Enterprise Design boundary |
| `git diff --check` | PASS (exit 0) |
| `git diff --name-only` vs approved Working Set | PASS — 15 modified files match exactly; no unauthorized paths |
| `git status --short` untracked production files | PASS — 5 new files match Design §5.2 Create entries; only the change-folder is non-Working-Set untracked content |
| Apply 7.5 focused tests (recorded) | PASS — shared workflow 4 tests; API workflow 7 suites / 46 tests; API lint; API build; shared lint; PR3 doorbell 1 suite / 6 scenarios / 0 skipped |
| Verify focused controller rerun (recorded) | PASS — `workflow.controller.spec.ts` 1 suite / 5 tests; API workflow 7 suites / 41 tests |

## Known Baseline Debt and Conditions

| Item | Classification | Evidence |
|---|---|---|
| 5 pre-existing `tenant-web` sidebar `lucide-react` mock test failures | BASELINE_DEBT (project) | `KNOWN_ISSUES.md:13` — unrelated to this change; frontend, not touched |
| Rate limiter service-side double-check redundancy | BASELINE_DEBT (project) | `ROADMAP.md:29` — unrelated to this change |
| Apply TDD evidence limitation: production implementation present before RED capture for every operation | CONDITION (change-recorded) | `apply-summary.md:215-219` — process-evidence deviation, not a security relaxation; RED contract tests added and GREEN results recorded |
| Bounded fixture deviation: `workflow-cross-tenant-isolation.spec.ts` corrected to trusted context | CONDITION (change-recorded) | `apply-summary.md:209-214` — only the fixture was updated; no production change |
| Disposable test-environment bootstrap/harness correction (PR3-only) | CONDITION (change-recorded) | `apply-summary.md:280-291` — bounded test-environment correction; no production/runtime behavior change |
| Historical v2.1 prompts / candidate records in legacy locations | BASELINE_DEBT (governance) | `KNOWN_ISSUES.md:19-22` — non-authoritative, excluded from active routing |
| Global OpenCode/Gentle config outside repository | BASELINE_DEBT (governance) | `KNOWN_ISSUES.md:23-25` — intentionally untouched |

No baseline debt item above is caused by this change, nor does any violate an
approved acceptance criterion for the `secure-workflow-execution-boundary`
remediation.

## Remaining Repository Risks

| Risk | Status |
|---|---|
| Commit / Push / Merge not performed | Expected — HUMAN / MAINTAINER-only phases; this change has not advanced to the Git lifecycle |
| Real-AppModule PR3 doorbell result depends on disposable `pgvector/pgvector:pg16` baseline that is cleaned up | Expected — disposable baseline was removed after Apply; evidence preserved in `apply-summary.md` |
| `workflow-cross-tenant-isolation.spec.ts` is a recorded bounded deviation outside the strict primary/secondary count | Recorded and non-blocking — fixture-only correction to align with the approved trusted-context contract |
| No merge to `main` yet; global-first guard order and tenant isolation are only evidenced up to Verify, not production-deployed | Expected handoff boundary |

## Maintainer-Controlled Gates

These gates are intentionally manual and are not executed by SDD-Direct:

| Gate | Status | Maintainer evidence |
|---|---|---|
| Commit | NOT EXECUTED | Manual action required |
| Push | NOT EXECUTED | Manual action required |
| Merge | NOT EXECUTED | Manual action required |
| Release | NOT EXECUTED | Manual action required |
| Tag | NOT EXECUTED | Manual action required |

## Decision

The `secure-workflow-execution-boundary` change satisfies the Health Report
contract. All prior artifacts are present and internally consistent; the
normalized Archive result is PASS; the normalized Verify result is PASS after the
single permitted V-01 Direct Fix; all 11 tasks are complete; the diff is bounded
to the approved Working Set plus one recorded fixture deviation; no dependency,
schema, app-module, middleware, frontend, plugin, infrastructure, or credential
state was changed; `git diff --check` and `pnpm sdd:validate` both pass. No
blocker remains. The canonical next action is Repository Ready, followed by the
HUMAN / MAINTAINER-only Commit → Push → Merge handoff.

## Structured Result

```yaml
status: PASS
change: secure-workflow-execution-boundary
artifact: health-report.md
blocking_findings: []
manual_gates:
  - Commit
  - Push
  - Merge
  - Release
  - Tag
next: Repository Ready (LOW / OPERATOR-EVIDENCE)
```
