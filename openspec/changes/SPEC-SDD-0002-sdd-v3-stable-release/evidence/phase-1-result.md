# Apply Phase 1 Result: Baseline and RED Contracts

**Change:** `SPEC-SDD-0002-sdd-v3-stable-release`
**Phase:** Apply 1
**Status:** PASS
**Execution state:** RED contracts captured; GREEN release implementation deferred to Apply 2
**Baseline:** `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce`
**Release state:** candidate
**Stable declaration:** `NOT_EXECUTED`
**Freeze state:** `UNCHANGED`
**Planned tag:** `NOT_PUBLISHED`

## Scope

The Phase 1 boundary is the change-local authority inventory, stable-document
classification, captured baseline/dirty-path policy, ownership/rollback policy,
and the RED tests that define the later release contract. Existing
SPEC-SDD-0001 evidence, recovery work, Direct infrastructure, product/runtime
paths, global configuration, and the shared Guard behavior are preserved and
are not attributed to this slice.

## Governance Decisions

- The Workflow Guard remains the sole transition authority.
- The Enterprise Design Template remains the sole 18-section/A-G shape authority.
- The Design Master Prompt remains the sole Design-generation authority.
- The release manifest and ADR are planned candidate authorities, not published artifacts in this phase.
- Historical, deprecated, superseded, and excluded documents have explicit classifications and replacements where required.
- Only Phase 1-owned paths may be rolled back; preserved and excluded paths are never reverted by this slice.

## Files Created

- `evidence/authority-inventory.json`
- `evidence/stable-document-classification.json`
- `evidence/phase-1-result.md`
- `validation/owned-path-scope.json`
- `validation/validate-phase1.mjs`
- `validation/test/phase1-scope.test.mjs`
- `validation/test/release-contract.test.mjs`

## Files Modified

- `tasks.md` — only Phase 1 task checkboxes and progress were updated.

## Working Set

- Planned: 8 Phase 1-owned paths.
- Actual: 8 Phase 1-owned paths, with 7 created and one existing task artifact modified.
- Accuracy: 100% for the Phase 1 slice.
- Pre-existing dirty boundary captured at 111 paths: 19 modified and 92 untracked; all current paths are owned, preserved, deferred, or explicitly excluded.

## RED -> GREEN -> REFACTOR Evidence

| Step     | Command                                                                         | Result                                                                                  |
| -------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| RED      | `node --test $C/validation/test/phase1-scope.test.mjs` before Phase 1 validator | Expected failure: `validate-phase1.mjs` did not exist.                                  |
| RED      | `node --test $C/validation/test/release-contract.test.mjs`                      | Expected failure: `validate-release.mjs` does not exist; Apply 2 remains unimplemented. |
| GREEN    | `node $C/validation/validate-phase1.mjs`                                        | PASS for scope, ownership, classification, and candidate-only state.                    |
| REFACTOR | `node --check $C/validation/validate-phase1.mjs`                                | PASS; no behavior or runtime code changed.                                              |

## Acceptance Criteria

- [x] Baseline commit and dirty-path counts are captured.
- [x] Authority ownership is explicit and responsibility names are unique.
- [x] Stable-document classifications use the approved status vocabulary.
- [x] SPEC-SDD-0001, recovery, Direct infrastructure, deferred, and unclassified paths are rejected as Phase 1 ownership.
- [x] Stable, release, tag, and freeze state remain inactive.
- [x] RED release-contract tests define the Apply 2 contract without implementing it.

## Unexpected Files

None. Pre-existing dirty paths are classified by the scope manifest and remain
outside this phase.

## Unexpected Dependencies

None. The validator uses only Node.js built-ins and read-only Git status/head
queries.

## Build

N/A: documentation and Node.js validators only; no product/runtime behavior was
changed.

## Tests

- Phase 1 scope test: PASS after the Phase 1 validator and evidence were added.
- Release contract test: RED by design because `validate-release.mjs` and the
  release manifest belong to Apply 2.
- Runtime harness: N/A; this slice has no runtime boundary.
- `git diff --check -- openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release`: PASS with no whitespace errors.
- `pnpm exec prettier --check` on the Phase 1 file set: PASS.

=== PHASE 1 COMPLETE ===

Ready for Phase 2.
