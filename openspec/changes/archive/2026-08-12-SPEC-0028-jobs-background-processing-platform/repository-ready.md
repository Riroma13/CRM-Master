---
schema: crm-master.repository-ready/v1
classification: MAINTENANCE EVIDENCE
semantic_authority: false
change: SPEC-0028-jobs-background-processing-platform
status: PASS_WITH_WARNINGS
role: LOW / OPERATOR-EVIDENCE
persistence: hybrid
generated_at: 2026-08-12
---

# Repository Ready: SPEC-0028 — Jobs & Background Processing Platform

## Gate Record

- **Change:** SPEC-0028-jobs-background-processing-platform
- **Artifact:** repository-ready.md
- **Status:** PASS_WITH_WARNINGS
- **Canonical evidence path:** openspec/changes/archive/2026-08-12-SPEC-0028-jobs-background-processing-platform/
- **Generated at:** 2026-08-12

## Evidence

| Check | Result | Evidence |
|---|---|---|
| Required prior artifacts exist | PASS | All 17 canonical artifacts present in archive directory (design.md, architecture-review.md, tasks.md, tasks-review.md, workload-guard.md, apply-7.1 through apply-7.5.3, apply-summary.md, verify-report.md, archive-report.md, health-report.md) |
| Canonical path is respected | PASS | openspec/changes/archive/2026-08-12-SPEC-0028-jobs-background-processing-platform/ |
| Direct agent routing is valid | PASS | .opencode/sdd-model-map.json maps Repository Ready to LOW / OPERATOR-EVIDENCE (longcat/LongCat-2.0) |
| Verification is complete | PASS | verify-report.md — verdict PASS, 13/13 requirements, 22/22 scenarios, 0 blockers, 0 critical findings |
| No unresolved blockers remain | PASS | archive-report.md — blockers: 0, critical_findings: 0; health-report.md — status PASS |
| Working tree findings | PASS | 17-path Working Set confirmed via `git status --short`: 9 creates (untracked jobs/ module + e2e) + 8 modifies; `git diff --check` exit 0; no unexpected lockfile/schema/migration/app.module.ts changes |
| SDD governance validator | PASS | `node scripts/validate-sdd-direct.mjs` — "CRM-SDD governance validation: PASS"; `pnpm sdd:validate` — PASS |

## Working Set Reconciliation

**17 implementation/test paths: 9 creates, 8 modifies** — matches approved Design and Tasks Working Set exactly.

**Creates (9):**
- `apps/api/src/modules/jobs/jobs.module.ts`
- `apps/api/src/modules/jobs/jobs-client.service.ts`
- `apps/api/src/modules/jobs/jobs-lifecycle.service.ts`
- `apps/api/src/modules/jobs/jobs-tenant-authority.service.ts`
- `apps/api/src/modules/jobs/jobs-redis.config.ts`
- `apps/api/src/modules/jobs/jobs.contracts.ts`
- `apps/api/src/modules/jobs/__tests__/jobs-client.spec.ts`
- `apps/api/src/modules/jobs/__tests__/jobs-lifecycle.spec.ts`
- `apps/api/test/doorbell/jobs-tenant-isolation.e2e-spec.ts`

**Modifies (8):**
- `apps/api/src/modules/activity-timeline/__tests__/activity-timeline-redis-connection.spec.ts`
- `apps/api/src/modules/activity-timeline/activity-timeline-queue.constants.ts`
- `apps/api/src/modules/activity-timeline/activity-timeline.module.ts`
- `apps/api/src/modules/health/health.controller.ts`
- `apps/api/src/modules/health/health.module.ts`
- `apps/api/src/modules/infrastructure/infrastructure.module.ts`
- `apps/api/src/modules/observability/__tests__/metrics-registry.spec.ts`
- `apps/api/src/modules/observability/metrics/metrics-registry.ts`

**Evidence artifacts (17):** design.md, architecture-review.md, tasks.md, tasks-review.md, workload-guard.md, apply-7.1-foundation.md, apply-7.2-core-engine.md, apply-7.3-feature.md, apply-7.3-wiring-red.md, apply-7.4-integration.md, apply-7.5.1-doorbell-red.md, apply-7.5.2-doorbell-green.md, apply-7.5.3-refactor.md, apply-summary.md, verify-report.md, archive-report.md, health-report.md

## Archived Hybrid Persistence

| Property | Value |
|---|---|
| Archive status | ARCHIVED |
| Archive date | 2026-08-12 |
| Archive destination | openspec/changes/archive/2026-08-12-SPEC-0028-jobs-background-processing-platform/ |
| Cycle complete through | Archive (phase 9 of 14) |
| Hybrid persistence | Intact — exact artifacts in canonical path; no product delta specs created or altered |
| Source of truth | docs/SDD-WORKFLOW.md (semantic_authority: true, v3 ACTIVE/STABLE, hybrid) |

## Verification Result

| Field | Value |
|---|---|
| Verdict | PASS |
| Display status | PASS WITH WARNINGS |
| Requirements | 13/13 |
| Scenarios | 22/22 |
| Blockers | 0 |
| Critical findings | 0 |
| Test exit code (focused) | 0 |
| Build exit code | 0 |
| sdd:validate | PASS |

## Baseline Debt (proven pre-existing, unrelated, non-blocking)

Per docs/SDD-WORKFLOW.md:177-183, these are reproducible failures unrelated to the active Working Set. They are recorded, not fixed or relabeled.

1. **Missing DATABASE_URL for unrelated API DB suites** — full `pnpm test` returns non-zero because unrelated API DB test suites cannot connect. Not caused by this change.
2. **Two unchanged tenant-web failures** — `calendar-picker` and oversized-file timeout tests failed. These files were untouched by this change. 183/185 tenant-web tests passed.

## Carried Non-Blocking Conditions

| ID | Condition | Status |
|---|---|---|
| TR-004 | Future domain adoption must choose/test per-definition concurrency | CONDITION — does not block |
| TR-005 | Chained-PR / stacked-to-main delivery | CONDITION satisfied by recorded HUMAN approval |
| Protected Design-validator notice | Existing non-blocking validator notice | CONDITION carried forward |

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

PASS_WITH_WARNINGS. The archived change is complete through Archive with verification PASS, zero blockers, zero critical findings, and a confirmed 17-path Working Set matching the approved Design and Tasks. Baseline debt and carried conditions are proven non-blocking and preserved per the canonical workflow. The SDD governance validator passes. The change is ready for the terminal maintainer handoff.

## Structured Result

```yaml
status: PASS_WITH_WARNINGS
change: SPEC-0028-jobs-background-processing-platform
artifact: repository-ready.md
blocking_findings: []
baseline_debt:
  - missing DATABASE_URL for unrelated API DB suites (full pnpm test non-zero)
  - two unchanged tenant-web failures (calendar-picker, oversized-file timeout; 183/185 passed)
carried_conditions:
  - TR-004: future domain adoption must choose/test per-definition concurrency
  - TR-005: satisfied by recorded HUMAN chained-PR approval
  - protected Design-validator notice carried forward
validator_result: PASS
manual_gates:
  - Commit
  - Push
  - Merge
  - Release
  - Tag
next: STOP at Repository Ready — awaiting HUMAN / MAINTAINER Git handoff
```
