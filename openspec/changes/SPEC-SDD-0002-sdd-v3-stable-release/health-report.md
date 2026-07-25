# SDD-Direct Health Report: SPEC-SDD-0002 - SDD v3.0 Stable Release

## Gate Record

- **Change:** `SPEC-SDD-0002-sdd-v3-stable-release`
- **Artifact:** `health-report.md`
- **Status:** `PASS_WITH_WARNINGS`
- **Canonical evidence path:** `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/`
- **Generated at:** `2026-07-24T23:48:01+00:00`

## Evidence

| Check                          | Result             | Evidence                                                                                                                                                                                                                                                                 |
| ------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Required prior artifacts exist | PASS               | The active source contained all 23 artifacts copied by Archive: proposal, Design, Architecture Review, spec, Tasks, Tasks Review, Workload Guard, Apply Summary, Verify, seven evidence files, and seven validation files.                                               |
| Canonical path is respected    | PASS               | The active source is `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/`; no `docs/sdd-direct/changes/` store was created or used.                                                                                                                                   |
| Direct agent routing is valid  | PASS               | `.opencode/commands/sdd-direct.md`, `.opencode/agents/sdd-direct-health.md`, and the Direct section of `docs/sdd-workflow-guard.md` define the project-local route and Health Report ordering without invoking Gentle-AI, native lifecycle state, or a dispatcher.       |
| Verification is complete       | PASS               | `verify-report.md` reports `status: VERIFIED`, `decision: VERIFIED`, 6/6 requirements, 6/6 scenarios, zero critical findings, and 29/29 change-local tests.                                                                                                              |
| Archive snapshot is complete   | PASS               | `openspec/changes/archive/2026-07-24-SPEC-SDD-0002-sdd-v3-stable-release/` contains 23 copied artifacts plus its archive-only report; inventory and content comparison found no missing, unexpected, or mismatched copied file.                                          |
| No unresolved blockers remain  | PASS               | AR-001 through AR-005, DC-001 through DC-006, and the carried Tasks Review conditions have passing evidence; AR-NB-001 and AR-NB-002 remain `CLOSED`.                                                                                                                    |
| Working tree findings          | PASS_WITH_WARNINGS | The repository is intentionally dirty. At health entry, `git status` reported 161 paths: 137 active-scope paths and 24 paths in the dated SPEC-SDD-0002 archive snapshot. Existing recovery and Direct-mode work remains preserved/excluded and is not claimed as clean. |

The active source directory remains present and was not moved, deleted, or
rewritten. The Health Report is the only artifact created in this phase.

## Direct Routing And Guard

The project-local Direct route is evidenced by `.opencode/commands/sdd-direct.md`.
Its command contract names the Direct route, requires a change name, restricts
work to the canonical change directory and declared Working Set, and forbids
Gentle-AI, dispatcher, native lifecycle, and destructive-gate execution.

The Direct transition chain in `docs/sdd-workflow-guard.md` is:

```text
Verify -> Archive -> Health Report -> Repository Ready -> STOP
```

The same Guard identifies the active source directory as the sole canonical
artifact store and keeps Commit, Push, Merge, Release, and Tag outside Direct
execution. `.opencode/agents/sdd-direct-health.md` requires Archive evidence
before Health, uses this shared terminal-gates template, and requires a
structured result.

No dispatcher, Gentle-AI component, native review lifecycle, or SDD dispatcher
was invoked or consulted for this report.

## Artifact Chain

| Artifact              | Result                  | Evidence                                                                                                                                |
| --------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `apply-summary.md`    | PASS                    | Apply Phases 1-5 are complete, each phase reports 100% Working Set accuracy, and the consolidated summary records candidate-only state. |
| `verify-report.md`    | VERIFIED                | Requirements and scenarios are complete; the report records the resolved VER-001 and two non-blocking limitations.                      |
| `archive-report.md`   | ARCHIVED_CANDIDATE_ONLY | The dated archive report records `verification: VERIFIED`, a 23-file source snapshot, and `next: Health Report`.                        |
| `health-report.md`    | PASS_WITH_WARNINGS      | This report records health evidence without changing release state or manual gates.                                                     |
| `repository-ready.md` | NOT STARTED             | It is the next Direct phase and was not created in this call.                                                                           |

## Conditions And Criteria

| Criterion       | Result                          | Health evidence                                                                                                                                                                                       |
| --------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AR-001 / DC-001 | PASS                            | The release contract validates one-time v2.1 opt-in, source and target identities, target revision, Design boundary, supersession link, and preservation of completed evidence.                       |
| AR-002 / DC-002 | PASS                            | Candidate state rejects Stable, published tag, active freeze, automatic transition, and early release execution.                                                                                      |
| AR-003 / DC-003 | PASS                            | Baseline and Phase 5 snapshots preserve Direct/recovery work; the active-scope recheck reports 26 owned, 7 preserved, 102 excluded, 2 transitioned, and zero future, deferred, or unclassified paths. |
| AR-004 / DC-004 | PASS                            | The eight canonical documents use one exact release identity, version, baseline, planned tag, compatibility policy, links, mappings, and final-gate state.                                            |
| AR-005 / DC-005 | PASS                            | `architecture-review.md` remains the approval record; it does not authorize Stable, release, tag, freeze, or any manual gate.                                                                         |
| DC-006          | PASS_WITH_DOCUMENTED_LIMITATION | Pre-v3.0 evidence retains `PASS_WITH_LEGACY_BASELINE`; v3.0+ evidence requires an explicit source commit and `canonical-v3-aggregate/v1`.                                                             |
| TR-001          | PASS                            | The exact one-time v2.1-to-v3.0 opt-in and supersession contract is validated.                                                                                                                        |
| TR-002          | PASS                            | The Workflow Guard transition table and existing Direct-mode section are preserved by the recorded hashes; any Guard change is metadata/reference-only.                                               |
| TR-003          | PASS                            | The Working Set, preserved paths, excluded paths, archive snapshot, and fail-closed scope rules are evidenced.                                                                                        |
| TR-004          | PASS                            | Cross-document release identity, required fields, links, mappings, and candidate final-gate state agree.                                                                                              |
| TR-005          | PASS                            | Apply Phases 1-5 each have the required completion summary and `apply-summary.md` consolidates them.                                                                                                  |
| TR-006          | PASS                            | Workload Guard remains advisory; no second approval pause or destructive action was introduced.                                                                                                       |
| AR-NB-001       | CLOSED                          | Final release SHA and tag object remain deferred to maintainer-controlled gates.                                                                                                                      |
| AR-NB-002       | CLOSED                          | The accepted legacy-baseline limitation remains explicit and is not used as v3.0 evidence.                                                                                                            |

## Candidate State

The active metadata and archived snapshot agree on the following pre-final
state:

| Field                                  | Candidate value                             |
| -------------------------------------- | ------------------------------------------- |
| `release_id`                           | `sdd-v3.0-stable`                           |
| `version`                              | `v3.0`                                      |
| `implementation_baseline`              | `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce`  |
| `planned_baseline_tag`                 | `sdd-v3.0-baseline`                         |
| `release_state`                        | `candidate`                                 |
| `stable_declaration`                   | `maintainer-only-after-repository-ready`    |
| `planned_tag_state`                    | `NOT_PUBLISHED`                             |
| `freeze_state_after_final_gate`        | `PENDING`                                   |
| `final_gate.status`                    | `NOT_EXECUTED`                              |
| `final_gate.authority`                 | `manual-maintainer-release-tag`             |
| `final_gate.verified_commit`           | `DEFERRED`                                  |
| `final_gate.allowed_future_transition` | `manual Release/Tag after Repository Ready` |
| `final_gate.automatic_transition`      | `FORBIDDEN`                                 |

Stable was not declared. The freeze was not reactivated. The release was not
published. `sdd-v3.0-baseline` was not published or created.

## Scope And Preservation

The approved baseline is `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce`. The
active-scope health recheck, performed separately from the dated archive tree,
returned:

| Classification                  | Count | Result                                                            |
| ------------------------------- | ----: | ----------------------------------------------------------------- |
| Owned                           |    26 | PASS                                                              |
| Preserved                       |     7 | PASS                                                              |
| Transitioned downstream reports |     2 | Apply Summary and Verify only                                     |
| Excluded                        |   102 | PASS; pre-existing recovery/Direct paths remain outside ownership |
| Future                          |     0 | PASS                                                              |
| Deferred                        |     0 | PASS                                                              |
| Unclassified                    |     0 | PASS                                                              |

The 24 archive-tree paths are handled as a separate archival snapshot, not as
active release ownership. The archive comparison found 23 copied active files,
one archive-only report, and zero content mismatches. Preserved and excluded
boundaries include:

| Boundary                                                                                      | Health result                                                                        |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `docs/sdd-workflow-guard.md` and its Direct-mode section                                      | Preserved; transition and Direct hashes match the recorded snapshot.                 |
| SPEC-SDD-0002 Design, proposal, spec, reviews, and Workload Guard                             | Preserved as authority and review evidence.                                          |
| SPEC-SDD-0001 active/archive paths                                                            | No changed paths attributed to SPEC-SDD-0002; historical evidence remains immutable. |
| `.opencode/**`, `scripts/**`, product/runtime, schema, dependencies, and global configuration | Excluded or preserved; not owned by this change.                                     |
| Unrelated recovery paths                                                                      | Preserved/excluded; not reverted, absorbed, or attributed to SPEC-SDD-0002.          |

The worktree is not clean and this report does not claim that it is clean.

## Test And Validator Results

| Check                                                    | Result         | Evidence or limitation                                                                                                                                                                                                                        |
| -------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verify-captured `validate-phase1.mjs`                    | PASS           | Exit 0; zero deferred and unclassified paths before Archive, with `transitioned=2`.                                                                                                                                                           |
| Verify-captured `validate-release.mjs`                   | PASS           | Exit 0; contract and scope passed with `owned=26`, `preserved=7`, `excluded=102`, and zero deferred/unclassified paths.                                                                                                                       |
| Verify-captured `validate-phase5.mjs`                    | PASS           | Exit 0; AR/DC evidence, candidate state, preservation, and scope passed.                                                                                                                                                                      |
| Verify-captured change-local test suite                  | PASS           | 29/29 passed.                                                                                                                                                                                                                                 |
| Independent active-scope health recheck                  | PASS           | Release-document validation returned no failures; Phase 5 scope validation returned no failures and the counts recorded above. The expected dated archive prefix was excluded from this active-scope check and validated separately.          |
| Post-Archive rerun of the pre-Archive validators         | WARNING        | The unchanged validators classify the 24 expected dated archive paths as unclassified and Phase 5 reports the pre-Archive snapshot count changed. No validator or scope file was modified to hide this post-Archive tool-boundary limitation. |
| Post-Archive full change-local test suite                | WARNING        | 27/29 passed; the two failures are the worktree-dependent scope/reconciliation tests and have the same expected archive-path cause. The canonical Verify result remains the pre-Archive 29/29 evidence.                                       |
| `node --check` for all six change-local validators/tests | PASS           | Syntax checks passed.                                                                                                                                                                                                                         |
| Declared-path `git diff --check`                         | PASS           | No whitespace errors.                                                                                                                                                                                                                         |
| Bounded Apply-file Prettier check                        | PASS           | Recorded by Verify.                                                                                                                                                                                                                           |
| Canonical-wide and broad Prettier checks                 | WARNING        | Known non-blocking formatting limitation: the targeted check and the broader check exit 1 for documented existing or excluded files; no `--write` operation was used for them.                                                                |
| SPEC-SDD-0001 regression suite                           | WARNING        | 35/36 passed. The one failure is the unrelated canonical-history count drift caused by an extra archive directory; SPEC-SDD-0001 was not modified.                                                                                            |
| Build                                                    | NOT RUN        | Documentation and Node.js validators only; no product build is in scope.                                                                                                                                                                      |
| Lint                                                     | NOT APPLICABLE | No runtime/product code is in scope.                                                                                                                                                                                                          |

The accepted pre-v3.0 limitation also remains `0/22` explicit source commits and
no historical aggregate. It is preserved as legacy evidence and is not a
SPEC-SDD-0002 blocker.

## Maintainer-Controlled Gates

These gates are intentionally manual and were not executed by SDD-Direct:

| Gate    | Status       | Maintainer evidence                                         |
| ------- | ------------ | ----------------------------------------------------------- |
| Commit  | NOT EXECUTED | Requires maintainer action after Repository Ready.          |
| Push    | NOT EXECUTED | Requires maintainer action after Commit.                    |
| Merge   | NOT EXECUTED | Requires maintainer action outside Direct.                  |
| Release | NOT EXECUTED | Stable declaration remains forbidden before the final gate. |
| Tag     | NOT EXECUTED | `sdd-v3.0-baseline` remains unpublished; final-gate-only.   |

## Decision

**PASS_WITH_WARNINGS.** No true blocker was found for the next non-destructive
Direct phase. The warnings are the intentionally dirty worktree with preserved
unrelated recovery work, the accepted SPEC-SDD-0001 legacy baseline limitation,
documented formatting limitations, and the expected inability of unchanged
pre-Archive scope validators to classify the dated archive snapshot. Independent
active-scope and archive checks pass.

This report does not declare Stable, publish a tag, reactivate the freeze, or
execute Commit, Push, Merge, Release, or Tag. The next phase is Repository Ready.

## Structured Result

```yaml
status: PASS_WITH_WARNINGS
change: SPEC-SDD-0002-sdd-v3-stable-release
phase: Health Report
artifacts:
  - openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/health-report.md
  - openspec/changes/archive/2026-07-24-SPEC-SDD-0002-sdd-v3-stable-release/archive-report.md
decision: HEALTHY_CANDIDATE_WITH_WARNINGS
blocking_findings: []
manual_gates:
  - Commit: NOT EXECUTED
  - Push: NOT EXECUTED
  - Merge: NOT EXECUTED
  - Release: NOT EXECUTED
  - Tag: NOT EXECUTED
next: Repository Ready
evidence:
  - verify-report.md is VERIFIED with 6/6 requirements, 6/6 scenarios, zero critical findings, and 29/29 change-local tests in the pre-Archive evidence.
  - archive-report.md is ARCHIVED_CANDIDATE_ONLY and its 23-file snapshot matches the active source inventory exactly.
  - AR-001..005, DC-001..006, and TR-001..006 have passing downstream evidence; AR-NB-001 and AR-NB-002 are CLOSED.
  - Candidate release, Stable, freeze, release, tag, and automatic-transition state is intact and manual gates remain NOT EXECUTED.
  - Active-scope health validation has zero deferred or unclassified paths; unrelated recovery work remains preserved/excluded and the repository is not clean.
```
