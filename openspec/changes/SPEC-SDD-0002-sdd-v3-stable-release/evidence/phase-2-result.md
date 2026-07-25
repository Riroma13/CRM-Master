# Apply Phase 2 Result: Release Contract Foundation

**Change:** `SPEC-SDD-0002-sdd-v3-stable-release`
**Phase:** Apply 2
**Status:** PASS
**Execution state:** GREEN candidate contract; Stable, freeze, release, and tag remain inactive
**Baseline:** `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce`
**Release state:** candidate
**Stable declaration:** `NOT_EXECUTED`
**Freeze state:** `UNCHANGED`
**Planned tag:** `NOT_PUBLISHED`

## Scope

This slice implements only the v2.1 to v3.0 release-contract foundation:
candidate release identity, the one-time opt-in and supersession contract,
legacy document mappings, preservation rules, strict v3.0 evidence policy, and
change-local validation. Stable authority metadata, secondary legacy banners,
Verify, Archive, Health, Repository Ready, and all manual gates remain later
work.

## Files Created

- `docs/architecture/sdd-v3.0-release-notes.md` — candidate manifest and compatibility contract.
- `docs/architecture/adr/0021-sdd-v3-stable-release.md` — candidate release/freeze policy record.
- `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/validation/validate-release.mjs` — contract, document, and scope validator.
- `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/evidence/phase-2-result.md` — this phase result.

## Files Modified

- `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/validation/test/release-contract.test.mjs` — GREEN contract tests and rejection cases.
- `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/validation/owned-path-scope.json` — carries Phase 2 ownership while preserving the Phase 1 capture.
- `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/validation/validate-phase1.mjs` — recognizes declared later-phase paths without weakening Phase 1 ownership requests.
- `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/tasks.md` — only Tasks 2.1/2.2 and Phase 2 progress updated.

## Contract Decisions

- The release manifest has exactly one candidate identity: `sdd-v3.0-stable`,
  `v3.0`, baseline `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce`, and planned tag
  `sdd-v3.0-baseline`.
- Active v2.1 opt-in records are one-time, append-only, identity-complete, and
  supersession-linked. Completed v2.1 evidence is preserved; reopened work gets
  a new v3.0 revision. The candidate has no active opt-in record.
- The accepted pre-v3.0 population retains `PASS_WITH_LEGACY_BASELINE`.
  v3.0+ evidence requires an explicit non-zero 40-character lowercase source
  commit and `canonical-v3-aggregate/v1`.
- Legacy and excluded paths have explicit status and replacement mappings.
  SPEC-SDD-0001, its archive, Direct infrastructure, product/runtime paths, and
  unrelated recovery work remain immutable or excluded.
- The Architecture Review artifact is the approval record. It does not perform
  a release gate or authorize early Stable/freeze/tag state.

## RED -> GREEN -> REFACTOR Evidence

| Task | Test file                                   | Safety Net                                                                               | RED                                                                   | GREEN                                                                                                                       | TRIANGULATE                                                                               | REFACTOR                                                            |
| ---- | ------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 2.1  | `validation/test/release-contract.test.mjs` | `phase1-scope.test.mjs`: 5/5; prior release contract: 6 expected module-missing failures | 9 contract cases written before validator and manifest implementation | 9/9 contract tests passed                                                                                                   | Candidate, identity, final-gate, opt-in, evidence, mapping, preservation, and scope cases | Prettier check, syntax check, and release validator pass            |
| 2.2  | `validation/test/release-contract.test.mjs` | Same intentional RED baseline                                                            | Rejection cases written before validator implementation               | Duplicate identity, premature state, incomplete opt-in, legacy evidence, mapping, history, and unclassified path cases pass | Happy path plus distinct invalid-input branches                                           | Shared pure validation helpers retained; focused tests remain green |

## Work Unit Evidence

| Evidence             | Result                                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Focused test command | `node --test $C/validation/test/release-contract.test.mjs` — PASS, 9 tests passed, 0 failed                                                                                                            |
| Carried safety test  | `node --test $C/validation/test/phase1-scope.test.mjs` — PASS, 5 tests passed, 0 failed                                                                                                                |
| Runtime harness      | N/A — documentation and Node.js validators only; no runtime boundary exists                                                                                                                            |
| Release validator    | `node $C/validation/validate-release.mjs` — PASS; 12 owned, 8 preserved, 102 excluded, 0 deferred, 0 unclassified                                                                                      |
| Syntax check         | `node --check $C/validation/validate-release.mjs` — PASS                                                                                                                                               |
| Rollback boundary    | Revert only the Phase 2 manifest, ADR, validator/test changes, Phase 2 scope entry, Phase 2 task lines, and this evidence file; retain all Phase 1, SPEC-SDD-0001, recovery, Direct, and runtime paths |

## Acceptance Criteria

- [x] AR-001/DC-001: one-time v2.1 opt-in fields, target revision, boundary, supersession, and evidence preservation are validated.
- [x] AR-002/DC-002: candidate/final-gate state rejects Stable, published tag, and active freeze before the manual gate.
- [x] AR-003/DC-003: Phase 2 ownership is explicit; preserved and excluded paths remain fail-closed against unclassified changes.
- [x] AR-004/DC-004: manifest and ADR share one exact v3.0 identity, evidence policy, mapping set, and candidate state.
- [x] AR-005/DC-005: Architecture Review is recorded as the approval artifact; no lifecycle gate is executed.
- [x] DC-006: pre-v3.0 legacy status is preserved and v3.0+ source commits/aggregate definitions are required.
- [x] AR-NB-001/002 remain closed: final SHA/tag is deferred and the legacy limitation is preserved.

## Working Set

- Planned: 8 Phase 2-owned paths, including 2 contract documents, 3 validators/tests, 1 scope carry-forward, 1 task update, and 1 result artifact.
- Actual: 8 Phase 2-owned paths; 4 created and 4 existing change-local paths modified.
- Accuracy: 100% for the Phase 2 slice.

## Unexpected Files

None. Existing product, recovery, Direct infrastructure, Guard, SPEC-SDD-0001,
and global configuration paths remain outside this slice.

## Unexpected Dependencies

None. The validator uses only Node.js built-ins, the existing Phase 1 path
classifier, and read-only Git status/head queries.

## Build

N/A: documentation and Node.js validators only; no product/runtime behavior was
changed.

## Tests

- Phase 2 release contract tests: PASS, 9/9.
- Carried Phase 1 scope tests: PASS, 5/5.
- Release contract validator: PASS.
- Prettier check: PASS for the Phase 2 files.
- `git diff --check`: PASS for the change-local Phase 2 file set.
- Runtime harness: N/A; no runtime boundary exists.

=== PHASE 2 COMPLETE ===

Ready for Phase 3.
