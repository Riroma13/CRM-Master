---
classification: MAINTENANCE EVIDENCE
semantic_authority: false
change: SPEC-SDD-0003-sdd-governance-consolidation
artifact_store: hybrid
status: PASS
---

# Repository Ready: SPEC-SDD-0003 — SDD Governance Consolidation

## Gate Record

- **Change:** SPEC-SDD-0003-sdd-governance-consolidation
- **Artifact:** repository-ready.md
- **Status:** PASS
- **Canonical evidence path:** openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/
- **Generated at:** 2026-08-11T12:31:00Z

## Working Set Reconciliation

### Tracked Modified Files (33)

These 33 files exist in the index and carry working-tree modifications. This
count is authoritative for the tracked portion of the migration and matches
`git status` ground truth exactly.

| # | File | Action | Bounded |
|---|---|---|---|
| 1 | `.ai/context/PROJECT.md` | Modify | Governance context expansion (SDD platform, Enterprise Design, navigation) |
| 2 | `.ai/context/SESSION.md` | Modify | Current repository state for governance migration |
| 3 | `.ai/context/DECISIONS.md` | Modify | ADR framing and non-authoritative workflow references |
| 4 | `.ai/context/KNOWN_ISSUES.md` | Modify | Governance debt section added |
| 5 | `.ai/context/ROADMAP.md` | Modify | SPEC-0025 completed, OAuth candidate noted |
| 6 | `.opencode/agents/sdd-direct-architecture-review.md` | Modify | Direct adapter, HIGH role, boundary enforcement |
| 7 | `.opencode/agents/sdd-direct-design.md` | Modify | Direct adapter, HIGH role, boundary enforcement |
| 8 | `.opencode/agents/sdd-direct-orchestrator.md` | Modify | Direct adapter, MID role, 7-step execution contract |
| 9 | `.opencode/agents/sdd-direct-verify.md` | Modify | Direct adapter, HIGH role, boundary enforcement |
| 10 | `.opencode/commands/sdd-direct.md` | Modify | Sole entry point, hybrid persistence, no Git |
| 11 | `AGENTS.md` | Modify | Primary authority, isolation, tiers, recovery-first |
| 12 | `docs/SDD-MODEL-ASSIGNMENTS.md` | Modify | Historical snapshot, not-loaded |
| 13 | `docs/SDD-WORKFLOW.md` | Modify | Canonical v3 lifecycle, 14 phases, hybrid persistence |
| 14 | `docs/architecture/CHANGELOG.md` | Modify | Historical framing added |
| 15 | `docs/architecture/archive/adr-0021-sdd-v3-stable-release.md` | Modify | Classification frontmatter |
| 16 | `docs/architecture/archive/sdd-v3-roadmap.md` | Modify | Classification frontmatter |
| 17 | `docs/architecture/archive/sdd-v3.0-release-notes.md` | Modify | Classification frontmatter |
| 18 | `docs/architecture/platform-baseline.md` | Modify | Governance boundary alignment |
| 19 | `docs/architecture/sdd-direct.md` | Modify | Execution adapter, persistence boundary, handoff |
| 20 | `docs/architecture/sdd-infrastructure.md` | Modify | Reduced to bounded scope |
| 21 | `docs/sdd-workflow-guard.md` | Modify | Compatibility stub only |
| 22 | `docs/templates/README.md` | Modify | Template boundary notes |
| 23 | `docs/templates/apply-summary-template.md` | Modify | Direct adapter alignment |
| 24 | `docs/templates/architecture-review-prompt.md` | Modify | Direct adapter alignment |
| 25 | `docs/templates/design-enterprise-template.md` | Modify | Template authority note |
| 26 | `docs/templates/design-refinement-prompt.md` | Modify | Direct adapter alignment |
| 27 | `docs/templates/tasks-prompt.md` | Modify | Direct adapter alignment |
| 28 | `docs/templates/tasks-refinement-prompt.md` | Modify | Direct adapter alignment |
| 29 | `docs/templates/tasks-review-prompt.md` | Modify | Direct adapter alignment |
| 30 | `docs/templates/terminal-gates-template.md` | Modify | Classification frontmatter |
| 31 | `openspec/config.yaml` | Modify | phase_rules removed, mapping_source updated |
| 32 | `package.json` | Modify | sdd:validate + sdd:validate:design entries |
| 33 | `scripts/validate-sdd-direct.mjs` | Modify | Deterministic governance validator |

**Tracked modified total: 33.**

### Untracked Project-Local Governance Files (21)

These 21 files are new (untracked) project-local governance additions. They are
part of the 54-file migration Working Set and are not the same as the
maintenance-evidence archive folder or protected SPEC-0028.

| # | File | Type | Bounded |
|---|---|---|---|
| 1 | `.opencode/agents/sdd-direct-apply.md` | Untracked new | Direct adapter, MID role |
| 2 | `.opencode/agents/sdd-direct-archive.md` | Untracked new | Direct adapter, LOW role |
| 3 | `.opencode/agents/sdd-direct-health-report.md` | Untracked new | Direct adapter, LOW role |
| 4 | `.opencode/agents/sdd-direct-repository-ready.md` | Untracked new | Direct adapter, LOW role |
| 5 | `.opencode/agents/sdd-direct-tasks.md` | Untracked new | Direct adapter, MID role |
| 6 | `.opencode/agents/sdd-direct-tasks-review.md` | Untracked new | Direct adapter, MID role |
| 7 | `.opencode/commands/sdd-apply.md` | Untracked new | STOP-only compatibility stub |
| 8 | `.opencode/commands/sdd-archive.md` | Untracked new | STOP-only compatibility stub |
| 9 | `.opencode/commands/sdd-continue.md` | Untracked new | STOP-only compatibility stub |
| 10 | `.opencode/commands/sdd-doctor.md` | Untracked new | STOP-only compatibility stub |
| 11 | `.opencode/commands/sdd-explore.md` | Untracked new | STOP-only compatibility stub |
| 12 | `.opencode/commands/sdd-ff.md` | Untracked new | STOP-only compatibility stub |
| 13 | `.opencode/commands/sdd-init.md` | Untracked new | STOP-only compatibility stub |
| 14 | `.opencode/commands/sdd-metrics.md` | Untracked new | STOP-only compatibility stub |
| 15 | `.opencode/commands/sdd-new.md` | Untracked new | STOP-only compatibility stub |
| 16 | `.opencode/commands/sdd-onboard.md` | Untracked new | STOP-only compatibility stub |
| 17 | `.opencode/commands/sdd-status.md` | Untracked new | STOP-only compatibility stub |
| 18 | `.opencode/commands/sdd-verify.md` | Untracked new | STOP-only compatibility stub |
| 19 | `.opencode/sdd-model-map.json` | Untracked new | Sole concrete role and agent mapping |
| 20 | `opencode.json` | Untracked new | Project-local global-agent isolation |
| 21 | `scripts/validate-enterprise-design.mjs` | Untracked new | Bounded Design pre-gate validator |

**Untracked project-local governance total: 21.**

### Working Set Summary

| Category | Count |
|---|---|
| Tracked modified governance files | 33 |
| Untracked project-local governance files | 21 |
| **Migration Working Set total** | **54** |
| Product/runtime/schema/test files | 0 |
| Maintenance-evidence archive files | Excluded |
| Protected SPEC-0028 files | Excluded |

### Excluded from Working Set (verified unchanged / untouched)

| Path | Reason |
|---|---|
| `openspec/changes/SPEC-0028-jobs-background-processing-platform/` | Protected user work — untracked, SHA-256 verified, not read or modified |
| `openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/` | Maintenance-evidence — this archive folder itself, not migration implementation |
| `apps/` (all product runtime) | Outside migration boundary |
| `packages/` (all product packages) | Outside migration boundary |
| `schema.prisma` | Outside migration boundary |
| Product tests | Outside migration boundary |
| Global `~/.config/opencode/` | External read-only evidence |

## Validator Results

| Validator | Command | Result |
|---|---|---|
| Governance | `pnpm sdd:validate` | PASS — canonical authority, 14 phases / Apply 7.1–7.6, Direct/Guard, roles, local wiring, hybrid persistence, and maintainer gates validated |
| Enterprise Design (template) | `pnpm sdd:validate:design -- docs/templates/design-enterprise-template.md` | PASS — 18 sections, A–G topics, decisions, and Working Set numbering valid |
| Enterprise Design (approved) | `pnpm sdd:validate:design -- openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/design.md` | PASS — 18 sections, A–G topics, decisions, and Working Set numbering valid |
| Conflict markers / whitespace | `git diff --check` | PASS — no whitespace errors, no conflict markers |

All four required runtime-equivalent checks pass. Build, lint, and product test
suites are **N/A** for this governance-only migration.

## v3 ACTIVE / STABLE / Hybrid / Direct Boundary Confirmation

| Boundary | Status | Evidence |
|---|---|---|
| v3 ACTIVE/STABLE lifecycle | Intact | `docs/SDD-WORKFLOW.md` declares v3, ACTIVE/STABLE; validator confirms exactly 14 phases and nested Apply 7.1–7.6 |
| Hybrid persistence | Intact | Exact artifacts in OpenSpec change directory; Engram bounded context only; no alternate persistence vocabulary |
| Direct-only execution adapter | Intact | `.opencode/sdd-model-map.json` is the sole concrete map; `/sdd-direct` is the sole local lifecycle entry; Direct adapters classify as `EXECUTION ADAPTER` and defer semantics to the workflow |
| Global Gentle-SDD isolation | Intact | `opencode.json` disables conflicting global agents; 12 legacy command stubs are STOP-only; global runtime is excluded |
| Semantic authority | Single | `docs/SDD-WORKFLOW.md` is the only `semantic_authority: true` document; AGENTS.md is startup/safety only |
| Terminal maintainer gates | Intact | Commit, Push, Merge, Release, Tag are HUMAN / MAINTAINER-only; none executed or simulated |

## Active-Governance Contradiction Scan

**PASS** — the final bounded read-only scan compared every active authority,
adapter, map, local configuration, command wiring, and agent contract. No
material contradictions found.

| Compared contract | Verdict |
|---|---|
| `AGENTS.md` startup/safety vs. workflow lifecycle semantics | Compatible — distinct authority scopes |
| Workflow vs. Workflow Guard | Compatible — Guard is non-semantic compatibility/enforcement pointer only |
| Workflow vs. Direct adapter / local command | Compatible — Direct is execution-only and defers lifecycle meaning |
| Workflow logical roles vs. model-map concrete bindings | Compatible — canonical role and phase bindings match |
| Local map vs. Direct agents and `opencode.json` | Compatible — defined local executors only; conflicting global agents disabled |
| Local legacy commands vs. local lifecycle entry | Compatible — 12 legacy commands are STOP-only; `/sdd-direct` is the sole local entry |
| Workflow hybrid contract vs. config/context/adapter | Compatible — active persistence vocabulary is `hybrid` only |
| Workflow terminal gates vs. command/map/adapter | Compatible — Commit, Push, Merge remain HUMAN / MAINTAINER-only |

## Protected SPEC-0028 Invariant

The protected Design SHA-256 invariant is recorded as:

`0969a1c2d8d256156245657a4339ca9f2588bc57cdb33b1f0c3cc4700798f56b`

This Repository Ready phase used the recorded invariant only. It did **not**
read, recompute, modify, or overwrite anything under
`openspec/changes/SPEC-0028-jobs-background-processing-platform/`.

## Baseline Debt

| Issue | Classification | Evidence |
|---|---|---|
| 5 pre-existing tenant-web sidebar test failures (lucide-react mock) | BASELINE_DEBT | KNOWN_ISSUES.md — unrelated to governance migration |
| Historical v2.1 prompts in archive locations | BASELINE_DEBT | KNOWN_ISSUES.md — marked non-authoritative, excluded from routing |

No new baseline debt introduced by this migration. The historical AR-10/TR-05
maintenance-arithmetic discrepancy remains non-authoritative, excluded from the
54-file implementation boundary, and does not contradict the approved 33 + 21 =
54 reconciliation.

## Pending Maintainer Gates (HUMAN-only)

These gates are intentionally manual. No Git lifecycle operation was executed or
simulated by this phase.

| Gate | Status | Required Action |
|---|---|---|
| Commit | NOT EXECUTED | Review staged changes; author conventional commit message |
| Push | NOT EXECUTED | Push to remote after commit |
| Merge | NOT EXECUTED | Merge to main after review |
| Release | NOT EXECUTED | If a versioned release is warranted |
| Tag | NOT EXECUTED | If a git tag is warranted |

## Evidence Files

| Artifact | Path |
|---|---|
| Recovery record | `openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/recovery.md` |
| Design | `openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/design.md` |
| Architecture Review | `openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/architecture-review.md` |
| Tasks | `openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/tasks.md` |
| Tasks Review | `openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/tasks-review.md` |
| Workload Guard | `openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/workload-guard.md` |
| Apply Summary | `openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/apply-summary.md` |
| Verify Report | `openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/verify-report.md` |
| Health Report | `openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/health-report.md` |
| Archive Report | `openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/archive-report.md` |
| Repository Ready | `openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/repository-ready.md` |

## Structured Result

```yaml
status: PASS
change: SPEC-SDD-0003-sdd-governance-consolidation
action: Repository Ready
artifacts:
  - openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/recovery.md
  - openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/design.md
  - openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/architecture-review.md
  - openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/tasks.md
  - openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/tasks-review.md
  - openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/workload-guard.md
  - openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/apply-summary.md
  - openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/verify-report.md
  - openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/health-report.md
  - openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/archive-report.md
  - openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/repository-ready.md
role: LOW / OPERATOR-EVIDENCE
evidence:
  - pnpm sdd:validate → PASS
  - pnpm sdd:validate:design -- docs/templates/design-enterprise-template.md → PASS
  - pnpm sdd:validate:design -- openspec/changes/archive/2026-08-11-SPEC-SDD-0003-sdd-governance-consolidation/design.md → PASS
  - git diff --check → PASS
  - SPEC-0028 SHA-256 recorded invariant verified (file not read/rehashed)
  - Active-governance contradiction scan → no contradictions
  - 33 tracked modified + 21 untracked project-local governance = 54 migration files
  - All exclusions preserved (SPEC-0028, product/runtime, schema, tests, global config, maintenance archive)
working_set:
  tracked_modified: 33
  untracked_project_local_governance: 21
  migration_total: 54
  product_runtime_changed: 0
blocked_by: []
pending_maintainer_gates:
  - Commit
  - Push
  - Merge
  - Release
  - Tag
next: HUMAN / MAINTAINER handoff — Commit → Push → Merge
```
