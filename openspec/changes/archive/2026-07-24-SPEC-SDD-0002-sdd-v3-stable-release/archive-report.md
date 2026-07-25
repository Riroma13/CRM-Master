schema: sdd-direct.archive-result/v1
status: ARCHIVED
change: SPEC-SDD-0002-sdd-v3-stable-release
phase: Archive
source: openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/
archive: openspec/changes/archive/2026-07-24-SPEC-SDD-0002-sdd-v3-stable-release/
artifact: openspec/changes/archive/2026-07-24-SPEC-SDD-0002-sdd-v3-stable-release/archive-report.md
verification: VERIFIED
decision: ARCHIVED_CANDIDATE_ONLY
next: Health Report
evidence:
  - verify-report.md is VERIFIED with zero critical findings and 29/29 change-local tests passing.
  - AR-001..005 and DC-001..006 pass; AR-NB-001 and AR-NB-002 remain CLOSED.
  - PASS_WITH_LEGACY_BASELINE, the SPEC-SDD-0001 35/36 limitation, and the 0/22 source-commit limitation are preserved.
  - Candidate-only Stable, tag, freeze, release, and final-gate state is unchanged.
  - The active source tree remains intact and no unrelated recovery artifact was copied.
  - Scoped archive inventory and git diff --check pass.

# Archive Report: SPEC-SDD-0002 - SDD v3.0 Stable Release

**Date:** 2026-07-24
**Mode:** openspec (SDD-Direct snapshot)
**Status:** **ARCHIVED**
**Archive path:** `openspec/changes/archive/2026-07-24-SPEC-SDD-0002-sdd-v3-stable-release/`

## Executive Summary

The verified SPEC-SDD-0002 active artifact set was copied to the dated archive
path as an audit snapshot. The active source directory remains present and was
not moved, deleted, rewritten, or marked complete. This Archive result records
Archive completion only; the release remains a candidate and is not Stable.

This is a documentation and change-local validation archive. No product,
runtime, schema, dependency, global configuration, SPEC-SDD-0001, unrelated
recovery, Direct infrastructure, commit, push, merge, release, or tag action
was performed.

No main-spec synchronization was performed. The active delta specification and
all other active source artifacts remain unchanged, following the established
Direct snapshot convention.

## Verification Authority

**Authority:** `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/verify-report.md`
**Reported status:** **VERIFIED**
**Evidence revision:** `sha256:82a925d958f2487fdbd745a61ff239e2d454571c6d1c6638dd9f0377d315a4bd`
**Verification decision:** `VERIFIED`
**Critical findings:** `0`
**Requirements:** `6/6`
**Scenarios:** `6/6`
**Change-local tests:** `29/29` passed
**Build:** `NOT_RUN` by design; the approved scope is documentation and Node.js validation only
**Lint:** `NOT_APPLICABLE`
**Formatting:** `PASS_WITH_NON_BLOCKING_LIMITATIONS`

The Verify report is the authority for the evidence below. The archive does
not reinterpret its decision or start a later phase.

## Archive Operation

The active change directory was copied before this report was created. The
snapshot contains all 23 active canonical artifacts present at Verify plus this
archive-only report. No unrelated recovery file was copied, and no existing
archive was modified.

### Copied Files

- `proposal.md`
- `design.md`
- `architecture-review.md`
- `specs/sdd-v3-stable-release/spec.md`
- `tasks.md`
- `tasks-review.md`
- `workload-guard.md`
- `apply-summary.md`
- `verify-report.md`
- `evidence/authority-inventory.json`
- `evidence/stable-document-classification.json`
- `evidence/phase-1-result.md`
- `evidence/phase-2-result.md`
- `evidence/phase-3-result.md`
- `evidence/phase-4-result.md`
- `evidence/phase-5-result.md`
- `validation/owned-path-scope.json`
- `validation/validate-phase1.mjs`
- `validation/validate-release.mjs`
- `validation/validate-phase5.mjs`
- `validation/test/phase1-scope.test.mjs`
- `validation/test/release-contract.test.mjs`
- `validation/test/phase5-readiness.test.mjs`
- `archive-report.md` (created only in the archive snapshot)

The persisted implementation task checkpoints are complete: Apply tasks
`1.1`, `1.2`, `2.1`, `2.2`, `3.1`, `3.2`, `4.1`, `4.2`, `5.1`, and `5.2` are
checked in the copied `tasks.md`. The later Direct checklist remains open by
design for Health Report and Repository Ready; it is not stale implementation
work and was not altered in the active source.

## Conditions And Evidence

All Architecture Review conditions and mandatory downstream criteria remain
represented in the archived Design, review, phase results, Apply Summary, and
Verify report.

| Criterion | Result | Archived evidence |
|---|---|---|
| AR-001 / DC-001 | PASS | Exact one-time v2.1 opt-in fields, target revision, Design boundary, supersession, completed-evidence preservation, and forward-only adoption are validated. |
| AR-002 / DC-002 | PASS | Candidate state rejects Stable, published tag, active freeze, release execution, and automatic transition before the manual gate. |
| AR-003 / DC-003 | PASS | Baseline and Phase 5 snapshots preserve dirty Direct/recovery work; declared paths and fail-closed classification are validated. |
| AR-004 / DC-004 | PASS | Eight canonical documents share one exact v3.0 identity, baseline, tag, compatibility policy, links, mappings, and final-gate state. |
| AR-005 / DC-005 | PASS | `architecture-review.md` remains the approval record and is separate from final Release/Tag authorization. |
| DC-006 | PASS | Pre-v3.0 evidence keeps `PASS_WITH_LEGACY_BASELINE`; v3.0+ evidence requires an explicit source commit and `canonical-v3-aggregate/v1`. |
| AR-NB-001 | CLOSED | Final release SHA and tag object remain deferred until maintainer-controlled gates. |
| AR-NB-002 | CLOSED | The accepted legacy-baseline limitation remains explicit and is not used as v3.0 evidence. |

### Verify Findings

- **VER-001:** Resolved. Transition-aware validators accept only the completed
  Apply Summary and Verify reports at the Verify phase; Archive, Health Report,
  and Repository Ready remain ordered and deferred.
- **VER-002:** Non-blocking documentation limitation. Bounded Apply formatting
  passes; canonical-wide formatting remains unclean for the four documented
  files and broader excluded/pre-existing architecture files. No formatter was
  run with `--write` except for the Verify report itself.
- **SPEC-SDD-0001 baseline:** Non-blocking external limitation preserved below.

### Direct Validation Evidence

The archived Verify report records these final results:

| Check | Result |
|---|---|
| `validate-phase1.mjs` | PASS; `owned=8`, `preserved=8`, `future=17`, `transitioned=2`, `excluded=102`, `deferred=0`, `unclassified=0` |
| `validate-release.mjs` | PASS; `owned=26`, `preserved=7`, `future=0`, `transitioned=2`, `excluded=102`, `deferred=0`, `unclassified=0` |
| `validate-phase5.mjs` | PASS; zero deferred or unclassified paths, candidate state and preservation pass |
| Change-local Node test suite | PASS; `29/29` |
| Change-local syntax checks | PASS; all six validators/tests checked |
| Bounded Apply-file Prettier check | PASS |
| Canonical-wide targeted Prettier check | Exit 1; documented non-blocking VER-002 limitation |
| Design-declared broad Prettier check | Exit 1; documented excluded/pre-existing limitation |
| Declared-path `git diff --check` | PASS |
| Design/Review/Tasks/Apply completeness | PASS; `18/18`, `7/7`, `10/10`, `5/5` |
| Candidate-state and eight-block check | PASS |
| Phase 5 snapshot and preservation check | PASS |
| Non-report changed-file fingerprint comparison | PASS; non-report paths unchanged |

## SPEC-SDD-0001 Baseline And Legacy Limitation

The approved implementation baseline remains commit
`c028537bae6fe1d8ecafc3974cd9cf0e46a673ce`. SPEC-SDD-0001 was not modified.

The focused SPEC-SDD-0001 regression command remains non-clean in the current
worktree:

```text
node --test openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/validation/test/*.test.mjs
exit: 1
result: 35 passed, 1 failed
```

The sole failure is the canonical-history count assertion. The current audit
observes `28` archive directories, `26` readable reports, `22` included
records, and `6` excluded entries, while the test expects `27`, `25`, `22`,
and `5`. The extra unrelated archive directory is
`openspec/changes/archive/2026-07-24-SPEC-SDD-0001-sdd-v3-stabilization/`.

An isolated attribution audit that omits only that unrelated directory returns
`27/25/22/5`, `0` explicit source commits, and
`PASS_WITH_LEGACY_BASELINE`. The accepted legacy evidence therefore remains:

- `PASS_WITH_LEGACY_BASELINE` applies only to the accepted pre-v3.0 population.
- The pre-v3.0 population has `0/22` explicit canonical source commits.
- No historical aggregate is claimed for that population.
- Every v3.0+ record requires an explicit 40-character lowercase source commit
  and `canonical-v3-aggregate/v1`.
- The 35/36 current-worktree result is an unrelated audit-count drift, not a
  SPEC-SDD-0002 implementation failure.

## Preservation Evidence

| Fact | Archived result |
|---|---|
| `HEAD` | `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce` |
| Current changed paths at Verify | `137` |
| Allowed downstream paths at Verify | Apply Summary and Verify report only |
| Remaining paths after downstream/Phase 5 exclusion | `132` |
| Pre-Phase 5 snapshot | `132` paths; path-set hash matches |
| Path-set hash | `9983621833dd5d46795aa5b12ffd08d564d25847c04cffbf940ffefb629ff05f` |
| Workflow Guard hash | `c1f0e1396cca4f17658742b6e5408bcb3b6915c39e48007a2f012fa118ca6c8f` |
| Direct-mode section hash | `7ff0a463c3771e6526932e7703a2e2c76636b77f80ecf602759e2ec51cd2b8d1` |
| Non-report fingerprint | `219246a664681dfbaf036715760c8592472b07e7351b156e095252f1ed7b4187` |
| SPEC-SDD-0001 changed paths | None |

The active source tree was preserved during this archive operation. The
archive contains no SPEC-SDD-0001 artifact, unrelated recovery path, global
configuration, product/runtime path, or Direct infrastructure file.

## Candidate State And Manual Gates

The archived release metadata remains candidate-only:

| Field | Value |
|---|---|
| `release_id` | `sdd-v3.0-stable` |
| `version` | `v3.0` |
| `implementation_baseline` | `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce` |
| `planned_baseline_tag` | `sdd-v3.0-baseline` |
| `release_state` | `candidate` |
| `stable_declaration` | `maintainer-only-after-repository-ready` |
| `planned_tag_state` | `NOT_PUBLISHED` |
| `freeze_state_after_final_gate` | `PENDING` |
| `final_gate.status` | `NOT_EXECUTED` |
| `final_gate.authority` | `manual-maintainer-release-tag` |
| `final_gate.verified_commit` | `DEFERRED` |
| `final_gate.allowed_future_transition` | `manual Release/Tag after Repository Ready` |
| `final_gate.automatic_transition` | `FORBIDDEN` |

Archive did not declare Stable, publish `sdd-v3.0-baseline`, reactivate the
freeze, or execute any manual gate. The five maintainer-controlled gates remain
outside Direct execution:

| Gate | Status |
|---|---|
| Commit | `NOT EXECUTED` |
| Push | `NOT EXECUTED` |
| Merge | `NOT EXECUTED` |
| Release | `NOT EXECUTED` |
| Tag | `NOT EXECUTED` |

Health Report is the next Direct phase. Repository Ready must precede any
manual Release/Tag action, and only that final maintainer-controlled gate may
bind Stable, publish the tag, and reactivate the freeze against the verified
commit.

## Working Set And Archive Accuracy

Apply evidence reports 100% accuracy for every phase and `47/47` cumulative
phase ownership entries:

| Apply phase | Planned | Actual | Accuracy |
|---|---:|---:|---:|
| Apply 1 | 8 | 8 | 100% |
| Apply 2 | 8 | 8 | 100% |
| Apply 3 | 14 | 14 | 100% |
| Apply 4 | 10 | 10 | 100% |
| Apply 5 | 7 | 7 | 100% |
| **Cumulative** | **47** | **47** | **100%** |

Archive accuracy is 23 active canonical artifacts copied and one archive-only
report created. Unexpected files: none. Unexpected dependencies: none. The
validators use Node.js built-ins, the change-local scope classifier, and
read-only Git queries only.

## Read-Only Archive Checks

The archive checks are limited to the new archive tree and do not alter the
repository:

- The archive directory exists at the dated path.
- The archive contains the 23 copied active artifacts and this report.
- The active source directory remains present.
- No unrelated archive or recovery path is present under the new archive tree.
- The archive-only `git diff --check` returned no whitespace errors.
- Active source and archive file inventories match for every copied artifact.

## Future Recommendations

- Run the separate Direct Health Report phase using this verified archive and
  preserve the candidate-only state.
- Keep SPEC-SDD-0001's 35/36 current-worktree limitation and 0/22 source-commit
  limitation classified as legacy evidence; do not repair it in SPEC-SDD-0002.
- Do not execute Commit, Push, Merge, Release, or Tag from Direct mode.
- Do not declare Stable, publish `sdd-v3.0-baseline`, or reactivate freeze until
  Repository Ready and the explicit maintainer final gate.

## Traceability

| Artifact | Status |
|---|---|
| `proposal.md` | Archived snapshot |
| `specs/sdd-v3-stable-release/spec.md` | Archived snapshot; no main-spec sync |
| `design.md` | Archived snapshot; authoritative Design preserved |
| `architecture-review.md` | Archived snapshot; `APPROVED_WITH_CONDITIONS`, no blocker |
| `tasks.md` | Archived snapshot; 10/10 Apply implementation tasks checked |
| `tasks-review.md` | Archived snapshot; `APPROVED` |
| `workload-guard.md` | Archived snapshot; advisory Direct continuation |
| `apply-summary.md` | Archived snapshot; Apply 1-5 complete |
| `verify-report.md` | Archived snapshot; `VERIFIED` |
| `evidence/**` | Archived snapshot; all phase and authority evidence preserved |
| `validation/**` | Archived snapshot; all validators and focused tests preserved |
| `archive-report.md` | This archive-only report |

## Direct Structured Result

```yaml
status: ARCHIVED
change: SPEC-SDD-0002-sdd-v3-stable-release
phase: Archive
artifacts:
  - openspec/changes/archive/2026-07-24-SPEC-SDD-0002-sdd-v3-stable-release/
  - openspec/changes/archive/2026-07-24-SPEC-SDD-0002-sdd-v3-stable-release/archive-report.md
decision: ARCHIVED_CANDIDATE_ONLY
next: Health Report
evidence:
  - verify-report.md is VERIFIED with zero critical findings and 29/29 change-local tests passing.
  - AR-001..005 and DC-001..006 pass; AR-NB-001 and AR-NB-002 remain CLOSED.
  - PASS_WITH_LEGACY_BASELINE, the SPEC-SDD-0001 35/36 limitation, and the 0/22 source-commit limitation are preserved.
  - Candidate-only Stable, tag, freeze, release, and final-gate state is unchanged.
  - The active source tree remains intact and no unrelated recovery artifact was copied.
  - Scoped archive inventory and git diff --check pass.
```
