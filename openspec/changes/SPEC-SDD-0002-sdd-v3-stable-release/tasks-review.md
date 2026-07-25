# Tasks Review: SPEC-SDD-0002 - SDD v3.0 Stable Release

status: APPROVED
change: SPEC-SDD-0002-sdd-v3-stable-release
phase: Tasks Review
artifact: `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/tasks-review.md`
decision: automatic-continue
next: Workload Guard

## Verdict

**APPROVED.** No `BLOCKER` was found. The Tasks artifact represents the
approved Design and the Architecture Review conditions sufficiently to enter
the Direct Workload Guard. The conditions below are mandatory downstream
acceptance criteria. They do not authorize Tasks Refinement or introduce a
pause before the Workload Guard.

This review examined only `tasks.md` against `design.md` and
`architecture-review.md`. The Design, proposal, specification, Apply code,
SPEC-SDD-0001, unrelated recovery work, and global configuration were not
modified or reopened. The proposal and specification remain derived
compatibility artifacts; `design.md` remains authoritative.

## Required Checks

| Check | Result | Evidence |
|---|---|---|
| Design authority and scope | PASS | `tasks.md` identifies `design.md` as authoritative, preserves documentation-only scope, and forbids runtime, product, schema, dependency, and Direct-infrastructure changes. |
| AR-001 / DC-001 opt-in mapping | CONDITION | The mandatory criteria cover source/target, boundary, preservation, and supersession, but the one-time marker and explicit target revision must be asserted by the validator. |
| AR-002 / DC-002 final-gate state | PASS | Candidate/draft state precedes the manual Release/Tag gate; Stable, tag publication, and freeze activation are deferred. |
| AR-003 / DC-003 scope preservation | CONDITION | Baseline and dirty-path capture, declared-path enforcement, and Direct/recovery preservation are planned; the Guard metadata-only preservation rule must be explicit in execution evidence. |
| AR-004 / DC-004 cross-document contract | CONDITION | The exact v3.0 contract, links, mappings, and rejection cases are planned; field-level uniqueness across release records must be asserted. |
| AR-005 / DC-005 approval boundary | PASS | The Architecture Review is retained as the approval record; no early release gate or unapproved authority is planned. |
| DC-006 evidence split | PASS | Pre-v3.0 legacy evidence and strict v3.0+ source-commit/`canonical-v3-aggregate/v1` evidence are explicitly separated. |
| Working Set, Read Order, and commands | CONDITION | The primary/secondary paths and Design read order are present, but protected paths and generated reports need explicit scope entries and directory-wide checks need path-bounded execution. |
| Apply 1-5 and Apply Summary | CONDITION | Five dependency-ordered phases and downstream reports are present; each phase must emit the required completion summary and the consolidated Apply Summary must use the canonical template. |
| Derived artifacts and no behavior change | PASS | Proposal/spec authority boundaries are stated, and no runtime or workflow behavior, new phase, agent, command, release, tag, or freeze action is authorized. |

## Findings

### BLOCKER

None. No finding makes safe downstream execution impossible, and no finding
authorizes Tasks Refinement.

### CONDITION

#### TR-001 - Make the active v2.1 opt-in record exact

- **State:** OPEN
- **Evidence:** `tasks.md` lines 53 and 69 cover append-only opt-in and
  idempotency, but do not name the one-time marker or explicitly require the
  target v3.0 revision.
- **Required downstream criterion:** The change-local validator/test must
  require source v2.1 identity, target v3.0 identity and revision, effective
  Design boundary, one-time marker, supersession link, and completed-evidence
  preservation. A second opt-in or in-place historical rewrite must fail closed.
- **Owner:** Release/compatibility owner; verified during Verify.

#### TR-002 - Preserve the existing Guard change explicitly

- **State:** OPEN
- **Evidence:** `tasks.md` lines 55, 63-64, 73, and 79 cover dirty-path
  capture and preservation, but do not explicitly state that the later
  `docs/sdd-workflow-guard.md` edit is metadata/reference-only and must retain
  the existing Direct-mode section byte-for-byte in behavior and semantics.
- **Required downstream criterion:** The scope manifest and safety test must
  compare the pre-existing boundary against the declared baseline, preserve
  Direct and recovery changes, and reject any transition-semantic or
  Direct-section alteration.
- **Owner:** Apply/Verify scope owner.

#### TR-003 - Complete and bound the Working Set

- **State:** OPEN
- **Evidence:** `tasks.md` lines 22-26 define primary, secondary, and
  forbidden paths, but do not explicitly enumerate all Design-protected legacy
  paths or the Apply/Verify/Archive/Health/Repository Ready report outputs.
  The Workload Guard formatting command also uses the broad `docs/architecture`
  directory.
- **Required downstream criterion:** Before Apply, record an explicit allowed
  and preserved-path manifest covering proposal/spec/tasks/review artifacts,
  future roadmap paths, prior SPEC artifacts, and all generated change-local
  reports. Expand checks to declared files or mark directory checks strictly
  read-only; fail closed on every unclassified path.
- **Owner:** Apply scope owner.

#### TR-004 - Assert the complete cross-document release contract

- **State:** OPEN
- **Evidence:** `tasks.md` lines 56 and 68-69 describe the exact contract and
  rejection cases, but do not enumerate every required field across the release
  notes and changelog.
- **Required downstream criterion:** Validation must require exactly one
  `release_id`, `version`, implementation baseline, planned tag,
  compatibility status, deprecation/replacement mapping, and final-gate state;
  reject alternate IDs, duplicate entries, missing links, premature Stable or
  freeze claims, and historical v2.1 edits.
- **Owner:** Release/compatibility owner; verified during Verify.

#### TR-005 - Make Apply evidence per-phase and canonical

- **State:** OPEN
- **Evidence:** `tasks.md` line 84 places the standard completion summary only
  in Apply 5, while line 88 requests an Apply Summary without naming its
  canonical template or required consolidation.
- **Required downstream criterion:** Apply 1, 2, 3, 4, and 5 must each emit
  `=== PHASE X COMPLETE ===` with files, Working Set accuracy, unexpected
  paths/dependencies, criteria, build, tests, and next phase. The consolidated
  `$C/apply-summary.md` must use the project Apply Summary template and include
  all five phase results.
- **Owner:** Apply orchestrator.

#### TR-006 - Keep Workload Guard advisory in Direct mode

- **State:** OPEN
- **Evidence:** `tasks.md` lines 11 and 13 say a decision is needed before
  Apply and leave the chain strategy pending, while Direct mode requires the
  approved Tasks Review to continue automatically through the Workload Guard
  and subsequent non-destructive phases.
- **Required downstream criterion:** Workload Guard must resolve and record
  the forecast, bounded-context score, and chain recommendation as advisory
  evidence without converting conditions into Tasks Refinement or adding a
  second approval pause before Apply.
- **Owner:** Direct orchestrator; recorded in the Workload Guard artifact.

### NON-BLOCKING

#### TR-NB-001 - High workload forecast

- **State:** CLOSED
- **Evidence:** The `700-1,000` line estimate and chained-PR recommendation
  are already recorded. Size and delivery strategy remain Workload Guard
  concerns and do not affect Tasks correctness.

AR-NB-001 and AR-NB-002 remain **CLOSED**. No prior Tasks Review findings were
reopened.

## Direct Transition

Because there are no `BLOCKER` findings, the Direct transition is:

`Tasks Review -> Workload Guard`

Conditions are carried as mandatory downstream acceptance criteria. They do
not authorize Tasks Refinement. The post-review execution chain continues
automatically under Direct mode; the Workload Guard records its advisory result
before Apply 1-5.

## Structured Result

```yaml
status: APPROVED
change: SPEC-SDD-0002-sdd-v3-stable-release
phase: Tasks Review
artifacts:
  - openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/tasks-review.md
decision: automatic-continue
next: Workload Guard
evidence:
  - No BLOCKER findings were identified.
  - All AR-001..005 and DC-001..006 are represented as passed checks or explicit downstream conditions.
  - Five Apply phases, Apply Summary, Verify, Archive, Health, and Repository Ready are planned without release execution.
  - Proposal/spec remain derived and Design remains the authority.
  - AR-NB-001 and AR-NB-002 remain CLOSED.
blocked_by: []
```
