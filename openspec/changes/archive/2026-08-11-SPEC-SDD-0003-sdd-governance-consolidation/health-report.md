---
classification: MAINTENANCE EVIDENCE
semantic_authority: false
change: SPEC-SDD-0003-sdd-governance-consolidation
artifact_store: hybrid
status: PASS
---

# Health Report: SPEC-SDD-0003 — SDD Governance Consolidation

## Gate Record

- **Change:** SPEC-SDD-0003-sdd-governance-consolidation
- **Artifact:** health-report.md
- **Status:** PASS
- **Canonical evidence path:** openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/
- **Generated at:** 2026-08-11T12:30:00Z

## Evidence

| Check | Result | Evidence |
|---|---|---|
| Required prior artifacts exist | PASS | recovery.md, verify-report.md, archive-report.md present; all referenced governance files verified present |
| Canonical path is respected | PASS | All artifacts under openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/ |
| Canonical workflow integrity | PASS | pnpm sdd:validate → PASS (14 phases, nested Apply 7.1-7.6, hybrid persistence, maintainer gates) |
| Enterprise Design template integrity | PASS | pnpm sdd:validate:design → PASS (18 sections, A-G AR topics, canonical order) |
| Active-governance contradiction scan | PASS | No contradictions found across AGENTS.md, SDD-WORKFLOW.md, sdd-direct.md, sdd-workflow-guard.md, sdd-model-map.json, design-enterprise-template.md |
| Legacy command isolation | PASS | 12 legacy command stubs (sdd-apply, sdd-archive, sdd-continue, sdd-doctor, sdd-explore, sdd-ff, sdd-init, sdd-metrics, sdd-new, sdd-onboard, sdd-status, sdd-verify) are STOP-only boundaries |
| Local agent wiring | PASS | 10 local Direct agents present in .opencode/agents/ with correct phase_role mapping in sdd-model-map.json |
| Git diff --check | PASS | No conflict markers, no whitespace issues (sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855) |
| SPEC-0028 protection invariant | PASS | SHA-256 0969a1c2d8d256156245657a4339ca9f2588bc57cdb33b1f0c3cc4700798f56b verified unchanged; SPEC-0028 not read, inspected, or modified |
| Working tree bounded to governance | PASS | 33 tracked modified + 21 untracked governance files = 54 total. No product/runtime code, schema, or tests touched |

## Working Tree Summary (Reconciled)

The prior health-report.md contained arithmetic and scope errors in its Working
Tree Summary table (the category counts summed to 35 while claiming 33, and
conflated tracked-modified with untracked files). This table reconciles against
`git status` ground truth. The authoritative maintenance Working Set is **54
governance files (33 tracked modified + 21 untracked)**, excluding SPEC-0028 and
the maintenance-evidence archive folder.

### Tracked modified (33)

| Category | Count | Files |
|---|---|---|
| .ai/context/ | 5 | DECISIONS.md, KNOWN_ISSUES.md, PROJECT.md, ROADMAP.md, SESSION.md |
| .opencode/ (modified) | 5 | agents/sdd-direct-architecture-review.md, agents/sdd-direct-design.md, agents/sdd-direct-orchestrator.md, agents/sdd-direct-verify.md, commands/sdd-direct.md |
| AGENTS.md | 1 | AGENTS.md |
| docs/ | 19 | SDD-MODEL-ASSIGNMENTS.md, SDD-WORKFLOW.md, architecture/CHANGELOG.md, architecture/archive/adr-0021-sdd-v3-stable-release.md, architecture/archive/sdd-v3-roadmap.md, architecture/archive/sdd-v3.0-release-notes.md, architecture/platform-baseline.md, architecture/sdd-direct.md, architecture/sdd-infrastructure.md, sdd-workflow-guard.md, templates/README.md, templates/apply-summary-template.md, templates/architecture-review-prompt.md, templates/design-enterprise-template.md, templates/design-refinement-prompt.md, templates/tasks-prompt.md, templates/tasks-refinement-prompt.md, templates/tasks-review-prompt.md, templates/terminal-gates-template.md |
| scripts/ | 1 | validate-sdd-direct.mjs |
| package config | 1 | package.json |
| OpenSpec config | 1 | config.yaml |
| **Total** | **33** | |

### Untracked project-local governance (21)

| Category | Count | Files |
|---|---|---|
| .opencode/agents/ | 6 | sdd-direct-apply.md, sdd-direct-archive.md, sdd-direct-health-report.md, sdd-direct-repository-ready.md, sdd-direct-tasks-review.md, sdd-direct-tasks.md |
| .opencode/commands/ | 12 | sdd-apply.md, sdd-archive.md, sdd-continue.md, sdd-doctor.md, sdd-explore.md, sdd-ff.md, sdd-init.md, sdd-metrics.md, sdd-new.md, sdd-onboard.md, sdd-status.md, sdd-verify.md |
| .opencode/ | 1 | sdd-model-map.json |
| opencode.json | 1 | opencode.json |
| scripts/ | 1 | validate-enterprise-design.mjs |
| **Total** | **21** | |

### Excluded from Working Set

| Path | Reason |
|---|---|
| openspec/changes/SPEC-0028-jobs-background-processing-platform/ | Protected user work — untracked, SHA-256 verified, not read or modified |
| openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/ | Maintenance evidence — this archive folder itself |

### Reconciliation note

`repository-ready.md` listed 34 "changed files" because it counted
`scripts/validate-enterprise-design.mjs` as a modification. That file is
untracked (new), not a modification of a tracked file; the correct
tracked-modified count is 33. The 21 untracked governance files are additions,
not modifications. 33 + 21 = 54 governance files total. This reconciliation is
authoritative for the maintenance Working Set.

## Classifications Verified

| File | Classification | Semantic Authority |
|---|---|---|
| AGENTS.md | PRIMARY AUTHORITY | false (startup/authority only) |
| docs/SDD-WORKFLOW.md | PRIMARY AUTHORITY | true (sole semantic workflow authority) |
| docs/architecture/sdd-direct.md | EXECUTION ADAPTER | false |
| docs/sdd-workflow-guard.md | COMPATIBILITY STUB | false |
| docs/SDD-MODEL-ASSIGNMENTS.md | HISTORICAL | false (not-loaded) |
| docs/architecture/CHANGELOG.md | HISTORICAL | false (not-loaded) |
| .opencode/sdd-model-map.json | EXECUTION ADAPTER | false |
| docs/templates/design-enterprise-template.md | TEMPLATE | false |

## Contradiction Scan Results

| Pair | Verdict |
|---|---|
| SDD-WORKFLOW.md ↔ sdd-model-map.json | Compatible — phase roles match workflow logical ownership |
| SDD-WORKFLOW.md ↔ sdd-direct.md | Compatible — adapter defers lifecycle semantics to workflow |
| SDD-WORKFLOW.md ↔ sdd-workflow-guard.md | Compatible — guard is compatibility pointer only |
| AGENTS.md ↔ SDD-WORKFLOW.md | Compatible — authority precedence documented |
| design-enterprise-template.md ↔ SDD-WORKFLOW.md | Compatible — template owns shape, workflow owns timing |
| openspec/config.yaml ↔ SDD-WORKFLOW.md | Compatible — phase_rules removed (duplication eliminated), mapping_source points to model map |
| SDD-MODEL-ASSIGNMENTS.md ↔ sdd-model-map.json | Compatible — former converted to historical snapshot, latter is sole active mapping |

## Maintainer-Controlled Gates

These gates are intentionally manual and are not executed by SDD-Direct:

| Gate | Status | Maintainer evidence |
|---|---|---|
| Commit | NOT EXECUTED | Pending maintainer handoff |
| Push | NOT EXECUTED | Pending maintainer handoff |
| Merge | NOT EXECUTED | Pending maintainer handoff |
| Release | NOT EXECUTED | Pending maintainer handoff |
| Tag | NOT EXECUTED | Pending maintainer handoff |

## Decision

PASS — the archived governance consolidation is complete through Archive. All
prior artifacts exist, the canonical path is respected, both deterministic
validators pass, the active-governance contradiction scan is clean, SPEC-0028 is
preserved untouched, and the working tree is bounded to 54 governance files (33
tracked modified + 21 untracked). The inherited arithmetic errors in the prior
health-report.md and repository-ready.md are reconciled above against git status
ground truth. No product/runtime code, schema, tests, or global configuration
was touched. No Git lifecycle operation was executed. The remaining gates
(Commit, Push, Merge, Release, Tag) are HUMAN / MAINTAINER-only.

## Structured Result

```yaml
status: PASS
change: SPEC-SDD-0003-sdd-governance-consolidation
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
