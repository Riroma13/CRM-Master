# Repository Ready: Secure Workflow Execution Boundary

> **Normalized result:** PASS
> **Executor:** LOW / OPERATOR-EVIDENCE — `sdd-direct-repository-ready`
> **Model binding:** `longcat/LongCat-2.0` (`.opencode/sdd-model-map.json:18-22,44-46,60-61`)
> **Persistence:** hybrid; this file is the exact Repository Ready artifact.
> **Source edge:** `Health Report -> Repository Ready` (`docs/SDD-WORKFLOW.md:103`)

## Gate Record

- **Change:** `secure-workflow-execution-boundary`
- **Artifact:** `repository-ready.md`
- **Status:** PASS
- **Canonical evidence path:** `openspec/changes/secure-workflow-execution-boundary/`
- **Generated at:** `2026-08-17T18:45:00Z`

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

## Prior Artifact Gate

| Check | Result | Evidence |
|---|---|---|
| Design | PASS | `design.md` — refined, PASS Architecture Review |
| Architecture Review | PASS | `architecture-review.md:292` — fresh PASS after AR-05/AR-06 maintainer-authorized Design corrections |
| Tasks | PASS | `tasks.md:15-30` — 11/11 complete |
| Tasks Review | PASS | `tasks-review.md:69` — fresh PASS after Tasks Refinement (TR-01/TR-02/TR-03 closed) |
| Workload Guard | PASS | `workload-guard.md:52` — feature-branch-chain authorized by HUMAN/MAINTAINER |
| Apply Summary | PASS | `apply-summary.md:183` — PASS, 7.1–7.6 complete |
| Verify | PASS | `verify-report.md:6` — PASS (after V-01 Direct Fix) |
| Archive | PASS | `archive-report.md:3` — PASS |
| Health Report | PASS | `health-report.md:119` — PASS |

## Working Set Reconciliation

### Modified Tracked Files (15)

| # | File | Design §5 slot |
|---|---|---|
| 1 | `apps/api/src/common/auth/permissions.ts` | Primary 1 (Modify) |
| 2 | `apps/api/src/modules/workflow/workflow.controller.ts` | Primary 2 (Modify) |
| 3 | `apps/api/src/modules/workflow/guards/workflow-definition.guard.ts` | Primary 4 (Modify) |
| 4 | `apps/api/src/modules/workflow/guards/workflow-execution.guard.ts` | Primary 5 (Modify) |
| 5 | `apps/api/src/modules/workflow/workflow.module.ts` | Primary 6 (Modify) |
| 6 | `apps/api/src/modules/identity/identity.module.ts` | Primary 7 (Modify) |
| 7 | `packages/shared/src/workflow/node-types.ts` | Primary 8 (Modify) |
| 8 | `packages/shared/src/workflow/index.ts` | Primary 9 (Modify) |
| 9 | `apps/api/src/modules/workflow/definition.service.ts` | Primary 10 (Modify) |
| 10 | `apps/api/src/modules/workflow/workflow.service.ts` | Primary 11 (Modify) |
| 11 | `apps/api/src/modules/workflow/executor/node-executor.ts` | Primary 12 (Modify) |
| 12 | `apps/api/src/modules/workflow/workflow.controller.spec.ts` | Secondary 2 (Modify) |
| 13 | `apps/api/src/modules/workflow/workflow.service.spec.ts` | Secondary 4 (Modify) |
| 14 | `apps/api/src/modules/workflow/workflow-cross-tenant-execution.spec.ts` | Secondary 5 (Modify) |
| 15 | `apps/api/src/modules/identity/identity.module.ts` | — (see note) |

Note: `identity.module.ts` is Primary 7 in Design §5.1. The 15 modified files = all 12 primary files + 3 modified secondary files (controller spec, service spec, cross-tenant-execution spec).

### New Untracked Production Files (5)

| # | File | Design §5 slot |
|---|---|---|
| 1 | `apps/api/src/common/guards/permissions.guard.spec.ts` | Secondary 1 (Create) |
| 2 | `apps/api/src/modules/workflow/guards/workflow-tenant-context.guard.ts` | Primary 3 (Create) |
| 3 | `apps/api/src/modules/workflow/guards/workflow-tenant-context.guard.spec.ts` | Secondary 3 (Create) |
| 4 | `packages/shared/src/workflow/__tests__/node-types.spec.ts` | Secondary 6 (Create) |
| 5 | `apps/api/test/doorbell/workflow-execution-boundary.e2e-spec.ts` | Secondary 7 (Create) |

### Bounded Deviation (1)

| File | Evidence |
|---|---|
| `apps/api/src/modules/workflow/workflow-cross-tenant-isolation.spec.ts` | `apply-summary.md:209-214` — fixture-only correction to align with trusted-context contract; no production change |

### Protected Files — No Changes

| File | Status |
|---|---|
| `apps/api/src/app.module.ts` | Untouched (global guard order preserved) |
| `apps/api/src/common/middleware/tenant-resolve.middleware.ts` | Untouched |
| `apps/api/src/common/guards/permissions.guard.ts` | Untouched |
| `packages/database/prisma/schema.prisma` | Untouched |
| `package.json` (any) | Untouched |
| Frontend apps | Untouched |
| Infrastructure / credentials | Untouched |

## Validator Evidence

| Command | Result |
|---|---|
| `pnpm sdd:validate` | PASS — canonical files/classifications, 14-phase lifecycle, nested Apply 7.1–7.6, workflow authority, local Direct wiring, logical roles, hybrid persistence, maintainer gates, package validators, Enterprise Design boundary |
| `git diff --check` | PASS (exit 0, no conflict markers or whitespace errors) |

## Git State Evidence

| Property | Value |
|---|---|
| Current branch | `sec/secure-workflow-execution-boundary` |
| Tracking branch | None (local-only feature branch) |
| Modified tracked files | 15 |
| Untracked production files | 5 |
| Total uncommitted production changes | 20 files + 1 bounded deviation |
| Commits on branch | 0 (no commits performed) |
| Pushed to remote | No |
| Merge to `main` | No |

The `git log` shows the branch was created from commit `8256c7a` (`feat(lifecycle): implement SPEC-0032 data retention platform`), which is the latest commit on the parent branch.

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

## Disposable Cleanup

The PR3 doorbell test used an ephemeral `pgvector/pgvector:pg16` container and
dedicated `secure_workflow_e2e` database with vector extension `0.8.6`. The
disposable database, container, and temporary bootstrap files were removed after
the focused command completed (`apply-summary.md:148-149,204-205`). No production
or `crm_test.public` database was used or mutated. No credentials were printed or
persisted. No disposable infrastructure remains in the repository.

## Remaining Repository Risks

| Risk | Status |
|---|---|
| Commit / Push / Merge not performed | Expected — HUMAN / MAINTAINER-only phases |
| No merge to `main` yet; global-first guard order and tenant isolation only evidenced up to Verify | Expected handoff boundary |
| `workflow-cross-tenant-isolation.spec.ts` is a recorded bounded deviation outside the strict primary/secondary count | Recorded and non-blocking — fixture-only correction |

## Maintainer-Controlled Gates

These gates are intentionally manual and are not executed by SDD-Direct:

| Gate | Status | Maintainer evidence |
|---|---|---|
| Commit | NOT EXECUTED | Manual action required — branch `sec/secure-workflow-execution-boundary` has 0 commits |
| Push | NOT EXECUTED | Manual action required — branch is local-only, no remote tracking |
| Merge | NOT EXECUTED | Manual action required |
| Release | NOT EXECUTED | Manual action required |
| Tag | NOT EXECUTED | Manual action required |

## Decision

The `secure-workflow-execution-boundary` change satisfies the Repository Ready
contract. All prior artifacts are present and internally consistent; the
normalized Health Report result is PASS; the normalized Archive result is PASS; the
normalized Verify result is PASS after the single permitted V-01 Direct Fix; all
11 tasks are complete; the diff is bounded to the approved Working Set (15
modified + 5 new = 20 production files) plus one recorded fixture deviation;
`git diff --check` and `pnpm sdd:validate` both pass; the disposable PR3 baseline
was cleaned up with no production impact; no dependency, schema, app-module,
middleware, frontend, plugin, infrastructure, or credential state was changed.
The branch `sec/secure-workflow-execution-boundary` is ready for the HUMAN /
MAINTAINER Commit → Push → Merge handoff.

## Structured Result

```yaml
status: PASS
change: secure-workflow-execution-boundary
artifact: repository-ready.md
blocking_findings: []
manual_gates:
  - Commit
  - Push
  - Merge
  - Release
  - Tag
next: Commit (HUMAN / MAINTAINER)
```

## Handoff Instructions for Maintainer

1. **Commit**: Review the 20 uncommitted production file changes (15 modified + 5
   new) plus 1 bounded deviation on branch
   `sec/secure-workflow-execution-boundary`. Conventional commits format applies.
   The change is internally evidenced for a single cohesive commit or a
   feature-branch-chain sequence matching the three delivery slices:
   - PR1: RED security contracts (tests only)
   - PR2: Permission/trusted-context/schema/service/executor/module
     implementation
   - PR3: Route-order plus Tenant A/B doorbell evidence

2. **Push**: Push the branch to the remote after commit(s).

3. **Merge**: Open a PR targeting `main`. The change is above the 400-line
   threshold; a feature-branch-chain was authorized by the Workload Guard.

4. **Release / Tag**: Maintainer-controlled actions outside the 14-phase
   lifecycle.

## Exact Evidence Index

| Artifact | Path |
|---|---|
| Design | `openspec/changes/secure-workflow-execution-boundary/design.md` |
| Architecture Review | `openspec/changes/secure-workflow-execution-boundary/architecture-review.md` |
| Tasks | `openspec/changes/secure-workflow-execution-boundary/tasks.md` |
| Tasks Review | `openspec/changes/secure-workflow-execution-boundary/tasks-review.md` |
| Workload Guard | `openspec/changes/secure-workflow-execution-boundary/workload-guard.md` |
| Apply Summary | `openspec/changes/secure-workflow-execution-boundary/apply-summary.md` |
| Verify | `openspec/changes/secure-workflow-execution-boundary/verify.md` |
| Verify Report | `openspec/changes/secure-workflow-execution-boundary/verify-report.md` |
| Archive Report | `openspec/changes/secure-workflow-execution-boundary/archive-report.md` |
| Health Report | `openspec/changes/secure-workflow-execution-boundary/health-report.md` |
| Repository Ready | `openspec/changes/secure-workflow-execution-boundary/repository-ready.md` (this artifact) |
