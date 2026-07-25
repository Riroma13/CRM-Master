# Apply Phase 4 Result: Legacy Adoption and Safety

**Change:** `SPEC-SDD-0002-sdd-v3-stable-release`
**Phase:** Apply 4
**Status:** PASS
**Execution state:** GREEN legacy classification and final-gate safety; release remains candidate-only
**Baseline:** `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce`
**Release state:** `candidate`
**Stable declaration:** `NOT_EXECUTED`
**Freeze state after final gate:** `PENDING`
**Planned tag:** `NOT_PUBLISHED`

## Scope

This slice adds explicit historical, deprecated, and superseded status to the
three declared secondary documents. It also makes the pre-final boundary
executable: candidate metadata is retained, Stable/tag/freeze activation is
rejected, and the only permitted future transition is the manual final
Release/Tag gate after Repository Ready.

No product/runtime, schema, dependency, global configuration, Direct
infrastructure, SPEC-SDD-0001, recovery, or workflow-transition behavior was
changed. Existing v2.1 evidence remains immutable and the existing Direct-mode
change remains outside the Phase 4 modification set.

## Governance Decisions

- `docs/sdd-workflow-guard.md` remains the sole transition authority.
- `docs/SDD-WORKFLOW.md` is historical-compatible and points to the Workflow Guard.
- `docs/templates/design-prompt.md` is deprecated and points to the Design Master Prompt.
- `docs/architecture/sdd-v3-roadmap.md` is superseded and points to the candidate release notes.
- The release manifest records `manual Release/Tag after Repository Ready` as the only allowed future transition.
- Automatic transition is `FORBIDDEN`; Stable declaration, tag publication, and freeze reactivation remain inactive.

## Maintainer-Controlled Transition Evidence

| Field                         | Candidate value                                         |
| ----------------------------- | ------------------------------------------------------- |
| Current release state         | `candidate`                                             |
| Stable declaration            | `NOT_EXECUTED` / maintainer-only after Repository Ready |
| Planned tag state             | `NOT_PUBLISHED`                                         |
| Freeze state after final gate | `PENDING`                                               |
| Final-gate status             | `NOT_EXECUTED`                                          |
| Final-gate authority          | `manual-maintainer-release-tag`                         |
| Verified commit               | `DEFERRED` until the final manual gate                  |
| Allowed future transition     | `manual Release/Tag after Repository Ready` only        |
| Automatic transition          | `FORBIDDEN`                                             |

These values are evidence of a pending gate, not execution of that gate. Apply
Phase 4 did not declare Stable, publish `sdd-v3.0-baseline`, reactivate the
freeze, commit, push, merge, release, or tag.

## Files Created

- `evidence/phase-4-result.md` — this phase result and transition evidence.

## Files Modified

- `docs/SDD-WORKFLOW.md` — historical-compatible v2.1 status and replacement.
- `docs/templates/design-prompt.md` — deprecated status and replacement.
- `docs/architecture/sdd-v3-roadmap.md` — superseded status and replacement.
- `docs/architecture/sdd-v3.0-release-notes.md` — explicit final-gate transition policy and Phase 4 paths.
- `validation/owned-path-scope.json` — Phase 4 ownership and rollback boundary.
- `validation/validate-phase1.mjs` — carried Phase 4 paths through prior scope validation.
- `validation/validate-release.mjs` — legacy status, final-gate, candidate-state, and Phase 4 scope assertions.
- `validation/test/release-contract.test.mjs` — RED/GREEN safety and legacy adoption tests.
- `tasks.md` — Phase 4 task checkboxes and progress only.

## RED -> GREEN -> REFACTOR Evidence

| Task | Test file                                   | Safety Net                              | RED                                                                                   | GREEN                                                                                     | TRIANGULATE                                                                                                              | REFACTOR                                                                               |
| ---- | ------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 4.1  | `validation/test/release-contract.test.mjs` | 16/16 carried tests passed before edits | 16-test focused run: 10 passed and 6 expected failures for missing Phase 4 APIs/paths | Full focused suite passed 21/21 after the three status blocks and loader were implemented | Three real repository documents, exact replacements, duplicate/missing status, and Stable/tag/freeze rejection branches  | Prettier and syntax checks pass; full-document safety scan retained                    |
| 4.2  | `validation/test/release-contract.test.mjs` | 16/16 carried tests passed before edits | Final-gate and Phase 4 scope tests failed before implementation                       | Full focused suite passed 21/21; release and Phase 1 validators pass                      | Candidate state, manual-only transition, unverified/automatic transition, forbidden path, and preserved-history branches | Shared metadata parsing and exact state assertions are centralized; tests remain green |

## Work Unit Evidence

| Evidence                  | Result                                                                                                                                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused tests             | `node --test $C/validation/test/*.test.mjs` — PASS, 21 tests passed, 0 failed                                                                                                                            |
| Release validator         | `node $C/validation/validate-release.mjs` — PASS; 23 owned, 7 preserved, 102 excluded, 0 deferred, 0 unclassified                                                                                        |
| Carried Phase 1 validator | `node $C/validation/validate-phase1.mjs` — PASS; 8 owned, 8 preserved, 14 future, 102 excluded, 0 deferred, 0 unclassified                                                                               |
| Syntax checks             | `node --check $C/validation/validate-release.mjs` and `node --check $C/validation/validate-phase1.mjs` — PASS                                                                                            |
| Prettier                  | `pnpm exec prettier --check` on the change-local task/evidence/validation files plus the manifest and deprecated prompt metadata — PASS; legacy workflow/roadmap bodies were not reformatted             |
| Patch safety              | `git diff --check --` on the change and declared legacy paths — PASS                                                                                                                                     |
| Runtime harness           | N/A — documentation and Node.js validators only; no runtime boundary exists                                                                                                                              |
| Rollback boundary         | Revert only the Phase 4 status banners, manifest final-gate evidence, validation/scope/test carry-forward, task progress, and this result; retain v2.1 history and all pre-existing Direct/recovery work |

## Acceptance Criteria

- [x] AR-001/DC-001: forward-only v2.1 adoption remains one-time, append-only, supersession-safe, and preserves completed evidence.
- [x] AR-002/DC-002: candidate/draft state precedes the manual Release/Tag gate; Stable, published tag, and active freeze are rejected.
- [x] AR-003/DC-003: only declared Phase 4 paths are owned; Direct/recovery, SPEC-SDD-0001, and unclassified paths remain fail-closed.
- [x] AR-004/DC-004: legacy statuses and replacements are explicit while the exact v3.0 identity and cross-document contract remain unique.
- [x] AR-005/DC-005: `architecture-review.md` remains the approval record; no early lifecycle or release gate is executed.
- [x] DC-006: pre-v3.0 evidence retains `PASS_WITH_LEGACY_BASELINE`; v3.0+ evidence remains strict with explicit source commits and `canonical-v3-aggregate/v1`.
- [x] AR-NB-001/002 remain closed: final SHA/tag is deferred and the legacy limitation is preserved.

## Working Set

- Planned: 10 Phase 4-owned paths, including three secondary documents, the candidate manifest transition evidence, four change-local validation/test/scope paths, the task artifact, and this result.
- Actual: 10 Phase 4-owned paths.
- Accuracy: 100% for the Phase 4 slice.

## Unexpected Files

None. No SPEC-SDD-0001, recovery, Direct infrastructure, product/runtime,
global configuration, Phase 5, or unclassified path was added.

## Unexpected Dependencies

None. Validation uses only Node.js built-ins, the existing Phase 1 path
classifier, and read-only Git baseline/status queries.

## Build

N/A: documentation and Node.js validators only; no product/runtime behavior was
changed.

## Tests

- Focused Phase 4 and carried tests: PASS, 21/21.
- Release validator: PASS with zero deferred or unclassified paths.
- Phase 1 carried validator: PASS with Phase 4 paths classified as future work.
- Candidate final-gate assertions reject Stable, published tag, active freeze,
  automatic transition, and unverified commit states.
- Runtime harness: N/A; no runtime boundary exists.

=== PHASE 4 COMPLETE ===

Ready for Phase 5.
