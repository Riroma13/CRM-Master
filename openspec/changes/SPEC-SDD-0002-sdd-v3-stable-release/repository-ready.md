# SDD-Direct Repository Ready: SPEC-SDD-0002 - SDD v3.0 Stable Release

## Gate Record

- **Change:** `SPEC-SDD-0002-sdd-v3-stable-release`
- **Artifact:** `repository-ready.md`
- **Status:** `PASS_WITH_WARNINGS`
- **Canonical evidence path:** `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/`
- **Generated at:** `2026-07-24T23:54:28+00:00`

## Decision

**REPOSITORY_READY.** The complete SDD-Direct artifact chain is present and
consistent through Health. Design, Architecture Review, Tasks, Tasks Review,
Workload Guard, Apply Phases 1-5, Apply Summary, Verify, Archive, and Health
have completed without a true blocker. Direct execution stops at Repository
Ready.

This is a candidate-only readiness decision. It does not declare Stable,
publish `sdd-v3.0-baseline`, reactivate the freeze, or authorize any automatic
transition. Commit, Push, Merge, Release, and Tag remain manual maintainer
gates and were not executed.

## Artifact Chain

| Artifact or phase   | Result                                     | Evidence                                                                                                                                                                      |
| ------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design              | COMPLETE FOR DOWNSTREAM EXECUTION          | `design.md` contains the 18-section Enterprise Design and A-G preparation; documentation-only scope and final-gate deferral remain explicit.                                  |
| Architecture Review | `APPROVED_WITH_CONDITIONS`; no blocker     | `architecture-review.md`; AR-001 through AR-005 and DC-001 through DC-006 were carried as downstream criteria and pass in later evidence.                                     |
| Tasks               | COMPLETE                                   | `tasks.md`; all 10 Apply implementation checkpoints are checked.                                                                                                              |
| Tasks Review        | `APPROVED`; no blocker                     | `tasks-review.md`; TR-001 through TR-006 were carried forward as acceptance criteria.                                                                                         |
| Workload Guard      | `READY`                                    | `workload-guard.md`; advisory chained-PR recommendation, no second approval pause, no manual gate execution.                                                                  |
| Apply Phases 1-5    | `PASS`                                     | `evidence/phase-1-result.md` through `evidence/phase-5-result.md`; each phase reports 100% Working Set accuracy and the required completion summary.                          |
| Apply Summary       | `PASS WITH DOCUMENTED BASELINE LIMITATION` | `apply-summary.md`; all five phases, criteria, scope, preservation, and candidate state are consolidated.                                                                     |
| Verify              | `VERIFIED`                                 | `verify-report.md`; 6/6 requirements, 6/6 scenarios, 29/29 change-local tests, zero critical findings.                                                                        |
| Archive             | `ARCHIVED_CANDIDATE_ONLY`                  | `openspec/changes/archive/2026-07-24-SPEC-SDD-0002-sdd-v3-stable-release/archive-report.md`; 23-file source snapshot plus archive-only report, with no active-source rewrite. |
| Health              | `PASS_WITH_WARNINGS`                       | `health-report.md`; no unresolved blockers and next phase Repository Ready.                                                                                                   |

## Evidence

| Check                          | Result             | Evidence                                                                                                                                                                                                                                              |
| ------------------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Required prior artifacts exist | PASS               | Active source contains the canonical chain through `health-report.md`; the dated Archive snapshot contains the 23 copied active artifacts and its archive-only report.                                                                                |
| Canonical path is respected    | PASS               | Active authority remains `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/`; no `docs/sdd-direct/changes/` store was created or used.                                                                                                            |
| Direct agent routing is valid  | PASS               | `.opencode/agents/sdd-direct-repository-ready.md`, `health-report.md`, and the Direct route define Repository Ready as the terminal Direct phase. Gentle-AI, dispatchers, native review lifecycle, and SDD dispatchers were not invoked or consulted. |
| Verification is complete       | PASS               | `verify-report.md` is `VERIFIED`; AR-001 through AR-005 and DC-001 through DC-006 pass, with two documented non-blocking limitations.                                                                                                                 |
| Archive is complete            | PASS               | Archive inventory and content comparison found no missing, unexpected, or mismatched copied file; the active source remains intact.                                                                                                                   |
| No unresolved blockers remain  | PASS               | Health records `blocking_findings: []`; all carried review conditions pass and AR-NB-001/002 remain `CLOSED`.                                                                                                                                         |
| Working tree findings          | PASS_WITH_WARNINGS | The repository is intentionally dirty. Health recorded 161 paths at entry, including preserved/excluded recovery and Direct-mode work and the separate dated archive tree. No clean-worktree claim is made.                                           |

## Scope And Validation Evidence

- `validation/owned-path-scope.json` preserves baseline commit `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce` and the declared ownership, preservation, exclusion, and rollback boundaries.
- The active-scope Health recheck recorded 26 owned, 7 preserved, 2 transitioned downstream reports, 102 excluded, and zero future, deferred, or unclassified paths.
- `validate-phase1.mjs`, `validate-release.mjs`, and `validate-phase5.mjs` passed in the Verify evidence with zero deferred or unclassified paths.
- The complete change-local test suite passed 29/29; syntax checks, declared-path `git diff --check`, and bounded Apply-file formatting checks passed.
- SPEC-SDD-0001 was not modified. Existing unrelated recovery work, Direct infrastructure, global configuration, product/runtime, schema, dependency, and other forbidden paths remain preserved or excluded.
- The active `docs/sdd-workflow-guard.md` change remains metadata/reference-only; its transition semantics and Direct-mode section remain preserved by the recorded hashes.

## Version And Baseline Safety

The accepted pre-final candidate state remains:

| Field                             | Value                                                  |
| --------------------------------- | ------------------------------------------------------ |
| `release_id`                      | `sdd-v3.0-stable`                                      |
| `version`                         | `v3.0`                                                 |
| `implementation_baseline`         | `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce`             |
| `planned_baseline_tag`            | `sdd-v3.0-baseline`                                    |
| `release_state`                   | `candidate`                                            |
| `stable_declaration`              | `NOT_EXECUTED`; maintainer-only after Repository Ready |
| `planned_tag_state`               | `NOT_PUBLISHED`                                        |
| `freeze_state_after_final_gate`   | `PENDING`                                              |
| `final_gate.status`               | `NOT_EXECUTED`                                         |
| `final_gate.verified_commit`      | `DEFERRED`                                             |
| `final_gate.automatic_transition` | `FORBIDDEN`                                            |

The accepted legacy distinction is preserved:

- Pre-v3.0 evidence retains `PASS_WITH_LEGACY_BASELINE`, with no historical aggregate claim and the documented 0/22 explicit source-commit limitation.
- The current SPEC-SDD-0001 regression observation remains 35/36 because of an unrelated canonical-history count drift; it is not attributed to SPEC-SDD-0002 and was not repaired here.
- v3.0+ evidence remains strict: each record requires an explicit 40-character lowercase source commit and `canonical-v3-aggregate/v1`.

## Maintainer-Controlled Gates

These gates are intentionally manual and are **NOT EXECUTED** by SDD-Direct:

| Gate    | Status         | Maintainer evidence                                   |
| ------- | -------------- | ----------------------------------------------------- |
| Commit  | `NOT EXECUTED` | Manual maintainer action only after Repository Ready. |
| Push    | `NOT EXECUTED` | Manual maintainer action only after Commit.           |
| Merge   | `NOT EXECUTED` | Manual maintainer action outside Direct.              |
| Release | `NOT EXECUTED` | Final maintainer gate; Stable remains undeclared.     |
| Tag     | `NOT EXECUTED` | `sdd-v3.0-baseline` remains unpublished.              |

Stable declaration, release publication, tag publication, and freeze
reactivation are not performed or implied by this report. Only the final manual
Release/Tag gate, after Repository Ready and against the verified commit, may
bind those transitions.

## Warnings

The following are documented non-blocking limitations, not true blockers:

- The repository is intentionally dirty because unrelated recovery and Direct-mode changes are preserved and excluded.
- The accepted SPEC-SDD-0001 legacy-baseline limitation remains visible and separate from strict v3.0+ evidence.
- Canonical-wide formatting has documented limitations outside the bounded Apply file set; no broad formatter write was used.
- Unchanged pre-Archive scope validators classify the dated Archive tree as a post-Archive tool-boundary limitation; Health validated active scope and Archive separately.

## Direct Structured Result

```yaml
status: REPOSITORY_READY
change: SPEC-SDD-0002-sdd-v3-stable-release
phase: Repository Ready
artifacts:
  - openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/repository-ready.md
prior_artifacts:
  - openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/design.md
  - openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/architecture-review.md
  - openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/tasks.md
  - openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/tasks-review.md
  - openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/workload-guard.md
  - openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/evidence/phase-1-result.md
  - openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/evidence/phase-2-result.md
  - openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/evidence/phase-3-result.md
  - openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/evidence/phase-4-result.md
  - openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/evidence/phase-5-result.md
  - openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/apply-summary.md
  - openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/verify-report.md
  - openspec/changes/archive/2026-07-24-SPEC-SDD-0002-sdd-v3-stable-release/archive-report.md
  - openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/health-report.md
blocking_findings: []
decision: REPOSITORY_READY_WITH_WARNINGS
manual_gates:
  Commit: NOT EXECUTED
  Push: NOT EXECUTED
  Merge: NOT EXECUTED
  Release: NOT EXECUTED
  Tag: NOT EXECUTED
next: STOP
evidence:
  - Design, Architecture Review, Tasks, Tasks Review, Workload Guard, Apply 1-5, Apply Summary, Verify, Archive, and Health are complete.
  - Verify is VERIFIED and Archive is ARCHIVED_CANDIDATE_ONLY.
  - PASS_WITH_LEGACY_BASELINE is preserved for pre-v3.0 evidence; v3.0+ strict source-commit and canonical-v3-aggregate/v1 rules remain enforced.
  - Unrelated recovery work remains preserved/excluded and SPEC-SDD-0001 remains unmodified.
  - The repository may stop at Repository Ready; no manual gate was executed.
```
