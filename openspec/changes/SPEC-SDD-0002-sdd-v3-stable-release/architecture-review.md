# Architecture Review: SPEC-SDD-0002 - SDD v3.0 Stable Release

status: APPROVED_WITH_CONDITIONS
change: SPEC-SDD-0002-sdd-v3-stable-release
phase: Architecture Review
artifact: `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/architecture-review.md`
decision: continue
next: Tasks

## Verdict

**APPROVED WITH CONDITIONS.** No `BLOCKER` was found. The Design is safe to
generate Tasks from because its architecture, scope, contracts, and evidence
baseline are sufficiently defined. The conditions below are mandatory
downstream acceptance criteria; they do not authorize Design Refinement or any
release, tag, freeze, runtime, or workflow action in this phase.

This review examined only the canonical Design and the declared authority and
baseline evidence. It did not modify `design.md`, SPEC-SDD-0001, unrelated
recovery work, or global configuration. Tasks were not started.

## Review Evidence

| Review area                          | Result               | Evidence                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enterprise Design shape              | PASS                 | `design.md` §§1-18 are present exactly once; Architecture Review Preparation contains exactly A-G at §§A-G (lines 7-317). The canonical template requires the same shape (`docs/templates/design-enterprise-template.md` §§1-18 and lines 337-497). `pnpm exec prettier --check` passed for `design.md`.                              |
| SPEC-SDD-0001 traceability           | PASS                 | `design.md` §§1, 3, and 6 anchor the release to `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce`. `git rev-parse HEAD` and commit verification both resolve to that commit; the active and archived SPEC-SDD-0001 paths have zero worktree differences from it.                                                                             |
| Baseline evidence                    | PASS                 | `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/verify-report.md` §§Executive Summary, Commands and Results, and Verdict report `VERIFIED`, 36 passing focused tests, and the documented legacy limitation. The archive report §§Executive Summary and Canonical Audit Facts preserves the same evidence and reports `ARCHIVED`. |
| Authority and migration              | CONDITION            | `design.md` §§3, 14, 16, and 17 define one authority set, immutable history, and forward-only adoption. The active-v2.1 opt-in mapping needs an exact artifact identity and supersession rule; see AR-001.                                                                                                                            |
| Legacy documents and release records | CONDITION            | `design.md` §§5, 15, and 16 classify the historical workflow, deprecated prompt, superseded roadmap, release notes, and changelog. Cross-document release-state and version validation remains mandatory; see AR-002 and AR-004.                                                                                                      |
| Scope and final gates                | CONDITION            | The no-runtime/no-new-workflow boundary is explicit in §§1-2, 5, 7, 14, and 17. The current worktree has a pre-existing Direct-mode change on `docs/sdd-workflow-guard.md`, which overlaps a planned later path; preservation must be made executable in downstream validation (AR-003).                                              |
| Execution planning                   | PASS                 | §§5-10 define Working Set, Read Order, Expected Commands, confidence, budget, and risks. §§11-13 define structural, reconciliation, safety, and baseline regression tests. §§16-18 define contracts, migration, and open questions.                                                                                                   |
| Tasks readiness                      | PASS WITH CONDITIONS | No architectural blocker prevents Tasks. Tasks must encode every mandatory criterion in this report before Apply can be considered complete.                                                                                                                                                                                          |

## Architecture Review Preparation A-G

All seven topics are complete. Each has a decision, rationale, alternative,
future impact, and the required topic-specific contract fields from the
Enterprise Design Standard.

| Topic               | Decision and rationale                                                                        | Alternative and future impact                                                                        | Required fields                                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| A. Scalability      | Keep the contract file-based and manifest-indexed because the change is documentation-only.   | Reject a database registry as new infrastructure; measured archive growth may justify later tooling. | 10x/100x storage, query latency, write throughput, and memory tables are present in `design.md` §§181-192.                     |
| B. OCP              | Add versioned manifest entries as data without changing Guard logic.                          | Reject new agents/phases; patch releases can append corrections.                                     | Concrete extension point and required changes are present in §§194-200.                                                        |
| C. Ownership        | One owner publishes each authority and consumers are read-only.                               | Reject distributed status publication; future governance artifacts must name an owner.               | Owner/consumer table plus decision, rationale, alternative, and future impact are present in §§202-213.                        |
| D. Data Retention   | Preserve v2.1, v3.0, migration, and deprecation evidence indefinitely.                        | Reject in-place historical rewrites; legal deletion requires an explicit ADR.                        | Lifetime, archive, deletion, decision, rationale, alternative, and future impact are present in §§215-224.                     |
| E. Idempotency      | Key reruns by stable release and document identities; no-op or fail closed.                   | Reject delete-and-regenerate; patch releases use distinct IDs.                                       | Operation, duplicate risk, protection, fallback, decision, rationale, alternative, and future impact are present in §§226-235. |
| F. Shared Contracts | Use one release manifest plus existing Guard/template contracts; add no product shared types. | Reject prompt duplication; consumers validate version, release ID, and status.                       | Contract location, consumers, producers, decision, rationale, alternative, and future impact are present in §§237-247.         |
| G. Partitioning     | Partition logically by SDD version and release identity, not tenant or runtime storage.       | Reject destructive rewriting; explicit version fields support future tooling.                        | Tenant, time, volume, decision, rationale, alternative, and future impact are present in §§249-257.                            |

## Findings

### BLOCKER

None. No finding requires Design Refinement under the Direct decision model.

### CONDITION

#### AR-001 - Active v2.1 opt-in identity is underspecified

- **State:** OPEN
- **Evidence:** `design.md` §16, the `v2.1 to v3.0 adoption contract` at lines 294-301, allows an active v2.1 change to remain v2.1 or opt in at its next Design boundary, but does not state the exact target revision identity, migration marker, or supersession link for that opt-in.
- **Required downstream criterion:** Tasks must define and validate a one-time opt-in record containing the source v2.1 identity, target v3.0 identity/revision, effective Design boundary, and preservation rule for completed evidence. No v2.1 artifact may be rewritten in place, and reopened work must use the explicit supersession rule.
- **Owner:** SPEC-SDD-0002 release/compatibility owner; verified by the change-local validator.

#### AR-002 - Pre-final release state needs an executable boundary

- **State:** OPEN
- **Evidence:** `design.md` §§1, 16, and 17 correctly defer Stable declaration and freeze restoration to the final maintainer Release/Tag gate, but §17 step 6 says “Reach Repository Ready with Stable declaration ... still pending,” while §17 step 7 performs the declaration. The wording permits an unsafe interpretation unless the states are validated explicitly.
- **Required downstream criterion:** Before the final manual gate, artifacts may be candidate/draft release metadata only; they must not claim `Stable`, a published stable tag, or `freeze_state_after_final_gate: ACTIVE`. Only the verified commit at the manual Release/Tag gate may bind `release_id: sdd-v3.0-stable`, `version: v3.0`, tag `sdd-v3.0-baseline`, Stable declaration, and freeze reactivation. No automatic release action is permitted.
- **Owner:** Maintainer for the final gate; Tasks/Apply/Verify owners for the pre-gate validator.

#### AR-003 - Planned Guard edit overlaps existing Direct-mode worktree changes

- **State:** OPEN
- **Evidence:** `design.md` §5 lists `docs/sdd-workflow-guard.md` as a later modification and §6/§10 require changed-path isolation. The current worktree already contains an uncommitted Direct-mode section in that file (`git diff -- docs/sdd-workflow-guard.md`). The worktree also contains unrelated recovery changes.
- **Required downstream criterion:** Before Apply, capture the current worktree boundary against `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce`; preserve all pre-existing Direct-mode and recovery changes; permit only the declared SPEC-SDD-0002 paths; and fail closed on unclassified paths. The later Guard edit must be metadata/reference-only and must not overwrite or alter transition semantics or the existing Direct-mode section.
- **Owner:** Apply/Verify scope owner.

#### AR-004 - Release notes, changelog, and version tokens need one cross-document contract

- **State:** OPEN
- **Evidence:** `design.md` §§5, 16, and 17 identify `sdd-v3.0-release-notes.md`, `CHANGELOG.md`, ADR-0021, the platform baseline, templates, and infrastructure documentation, but only the release manifest has an explicit field-level contract.
- **Required downstream criterion:** The validator must require exactly one `release_id`, `version`, implementation baseline, planned tag, compatibility status, deprecation/replacement mapping, and final-gate state across the release notes and changelog. It must reject `v3.0.0`/alternate IDs, duplicate release entries, premature Stable/freeze claims, missing links, and edits to historical v2.1 evidence.
- **Owner:** Release/compatibility owner; verified during Verify.

#### AR-005 - Design approval boundary must be recorded without editing Design

- **State:** OPEN
- **Evidence:** `design.md` §18 question 1 remains marked “Open - blocking before Architecture Review” and asks for maintainer approval of the authority set and no-runtime/no-new-workflow boundary. This review request supplies authorization to perform the review, but the Design must remain unchanged as required by the prompt.
- **Required downstream criterion:** Tasks and later release artifacts must reference this review artifact as the approval record for the authority set and scope boundary. They must not generate proposal/spec artifacts before the approved transition, and they must preserve the explicit separation between review approval and final Release/Tag authorization.
- **Owner:** Architecture reviewer for the approval record; maintainer for final release authorization.

### NON-BLOCKING

#### AR-NB-001 - Final release SHA and tag object are intentionally deferred

- **State:** CLOSED
- **Evidence:** `design.md` §8 marks confidence Medium because the final release commit SHA and tag object cannot be known before maintainer gates; §18 questions 2-3 preserve that deferral. This is correct and does not prevent Task generation.

#### AR-NB-002 - Legacy baseline evidence remains limited

- **State:** CLOSED
- **Evidence:** SPEC-SDD-0001 `verify-report.md` §§R-01/R-12 Evidence and Risks, and the archive report §§Canonical Audit Facts and Risks, preserve `PASS_WITH_LEGACY_BASELINE`, 0/22 explicit pre-v3.0 source commits, and no historical aggregate. The Design correctly keeps v3.0+ strict in §§16-17. Downstream validation must preserve this distinction, but it is not a blocker.

No prior SPEC-SDD-0002 review findings were reopened. Resolved findings remain
closed unless new evidence invalidates them.

## Mandatory Downstream Acceptance Criteria

| ID     | Criterion                                                                                                                                                             | Evidence required before the next terminal gates                                 |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| DC-001 | Active v2.1 opt-in and reopened-change mapping is explicit, one-time, append-only, and supersession-safe.                                                             | Release manifest plus focused validator/test.                                    |
| DC-002 | Pre-final artifacts cannot declare Stable, publish the baseline tag, or reactivate freeze; the final manual Release/Tag gate is the sole transition.                  | State assertions and final-gate evidence tied to the verified commit.            |
| DC-003 | Current dirty worktree and Direct-mode changes are preserved; only declared SPEC-SDD-0002 paths are accepted.                                                         | Changed-path scope manifest, preservation check, and safety test.                |
| DC-004 | Release notes, changelog, ADR, baseline, templates, and infrastructure references use one exact v3.0 contract and classify all legacy documents.                      | Cross-document link/version/status validation and historical immutability check. |
| DC-005 | This review is the approval record for the authority and scope boundary; no later phase creates unapproved proposal/spec artifacts or performs lifecycle gates early. | Structured phase result and scope safety evidence.                               |
| DC-006 | `PASS_WITH_LEGACY_BASELINE` remains valid only for the accepted pre-v3.0 population; v3.0+ requires explicit source commits and `canonical-v3-aggregate/v1`.          | SPEC-SDD-0001 regression evidence and v3 contract tests.                         |

## Explicit Next Transition

The Direct transition is:

`Architecture Review -> Tasks`

This is allowed because there are no `BLOCKER` findings. The `CONDITION`
findings continue with the workflow and become mandatory Task/Apply/Verify
acceptance criteria. Do not start Tasks in this review action; the next phase
must be invoked separately.

## Structured Result

```yaml
status: APPROVED_WITH_CONDITIONS
change: SPEC-SDD-0002-sdd-v3-stable-release
phase: Architecture Review
artifacts:
  - openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/architecture-review.md
decision: continue
next: Tasks
evidence:
  - design.md contains exactly 18 numbered sections and A-G preparation.
  - SPEC-SDD-0001 is VERIFIED and ARCHIVED from commit c028537bae6fe1d8ecafc3974cd9cf0e46a673ce.
  - Current SPEC-SDD-0001 active/archive paths have zero worktree differences from that commit.
  - Design formatting check passed.
  - Five conditions and six mandatory downstream criteria are recorded above.
```
