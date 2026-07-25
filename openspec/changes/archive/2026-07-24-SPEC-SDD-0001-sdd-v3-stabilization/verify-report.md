# Independent Verification Report

**Status:** VERIFIED
**Change:** `SPEC-SDD-0001-sdd-v3-stabilization`
**Verification date:** 2026-07-24
**Mode:** Independent repository verification from the current worktree

## Executive Summary

All SPEC-SDD-0001 acceptance checks pass directly from the repository. The
readiness contract now consistently reports `PASS_WITH_LEGACY_BASELINE` for the
approved pre-v3.0 population, while explicit source commits and
`canonical-v3-aggregate/v1` remain mandatory for v3.0+.

The former 11-path safety allowlist was replaced by the reproducible owned-path
scope manifest. The exact 15 SPEC-SDD-0001 paths previously reported as
`non-Working-Set` are now owned; unrelated recovery paths are explicitly
recorded as exclusions and do not become SPEC-SDD-0001 failures.

## Scope

This verification covers the SPEC-SDD-0001 proposal, specification, Design,
Tasks, Apply evidence, fixtures, validation scripts/tests, canonical audit,
readiness, reconciliation, owned-path scope, and this report. The intended
change remains documentation and artifact governance only.

The owned scope contains 30 paths: 28 SPEC-SDD-0001 change artifacts and the
two authorized documentation exceptions:

- `docs/sdd-workflow-guard.md`
- `docs/templates/design-enterprise-template.md`

No product, runtime, schema, API, frontend, migration, dependency, release,
Stable, freeze, or tag behavior is attributable to this SPEC.

## Exact Changed Files

Files changed by this remediation and verification:

- `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/design.md`
- `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/specs/sdd-v3-stabilization/spec.md`
- `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/tasks.md`
- `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/validation/owned-path-scope.json`
- `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/validation/validate-changed-paths.mjs`
- `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/validation/test/safety.test.mjs`
- `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/verify-report.md`

No fixture, canonical archive, readiness evidence, product/runtime, schema, or
SPEC-0025/0027/0028 file was modified.

## Owned-Path Scope and Exclusion Policy

The canonical scope is
`validation/owned-path-scope.json` (`sdd-owned-path-scope/v1`). Only its
`ownedPaths` are attributed to SPEC-SDD-0001. Its exact `excludedPaths` and
`excludedPathRules` are logged as unrelated recovery work and do not fail this
verification. Any path matching neither set fails as an unclassified
`non-Working-Set` path.

The current worktree check observed 30 owned paths and 85 excluded recovery
paths, with zero unclassified paths. Fifteen exact OpenSpec recovery paths are
listed below; the remaining excluded paths match the manifest's explicit
`apps/`, `packages/`, documentation, or lockfile rules.

### Fifteen Paths Previously Rejected by Verify

These are SPEC-SDD-0001-owned paths omitted by the former 11-path allowlist.
They are now included in `ownedPaths`, not excluded:

1. `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/design.md`
2. `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/evidence/evidence-ledger.json`
3. `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/evidence/improvement-inventory.json`
4. `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/fixtures/v2.1-field-map.json`
5. `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/fixtures/v2.1-manifest.json`
6. `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/fixtures/v3.0-sample.json`
7. `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/proposal.md`
8. `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/specs/sdd-v3-stabilization/spec.md`
9. `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/tasks-review.md`
10. `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/validation/reconcile-fixtures.mjs`
11. `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/validation/test/fixtures.test.mjs`
12. `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/validation/test/reconciliation.test.mjs`
13. `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/validation/test/structure.test.mjs`
14. `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/validation/validate-fixtures.mjs`
15. `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/validation/validate-structure.mjs`

### Fifteen Excluded Recovery Paths

These exact paths are unrelated recovery work and are explicitly excluded from
SPEC-SDD-0001 verification:

1. `openspec/changes/SPEC-0025-identity-platform/architecture-review.md` - unrelated SPEC-0025 identity recovery artifact.
2. `openspec/changes/SPEC-0025-identity-platform/design.md` - unrelated SPEC-0025 identity recovery artifact.
3. `openspec/changes/SPEC-0025-identity-platform/tasks.md` - unrelated SPEC-0025 identity recovery artifact.
4. `openspec/changes/archive/2026-07-21-SPEC-0027-feature-flags/design.md` - unrelated archived SPEC-0027 feature-flags recovery artifact.
5. `openspec/changes/archive/2026-07-21-SPEC-0027-feature-flags/pr-description.md` - unrelated archived SPEC-0027 feature-flags recovery artifact.
6. `openspec/changes/archive/2026-07-21-SPEC-0027-feature-flags/proposal.md` - unrelated archived SPEC-0027 feature-flags recovery artifact.
7. `openspec/changes/archive/2026-07-21-SPEC-0027-feature-flags/tasks.md` - unrelated archived SPEC-0027 feature-flags recovery artifact.
8. `openspec/changes/archive/2026-07-21-SPEC-0028-jobs-platform/archive-report.md` - unrelated archived SPEC-0028 jobs-platform recovery artifact.
9. `openspec/changes/archive/2026-07-21-SPEC-0028-jobs-platform/design.md` - unrelated archived SPEC-0028 jobs-platform recovery artifact.
10. `openspec/changes/archive/2026-07-21-SPEC-0028-jobs-platform/exploration.md` - unrelated archived SPEC-0028 jobs-platform recovery artifact.
11. `openspec/changes/archive/2026-07-21-SPEC-0028-jobs-platform/pr-description.md` - unrelated archived SPEC-0028 jobs-platform recovery artifact.
12. `openspec/changes/archive/2026-07-21-SPEC-0028-jobs-platform/proposal.md` - unrelated archived SPEC-0028 jobs-platform recovery artifact.
13. `openspec/changes/archive/2026-07-21-SPEC-0028-jobs-platform/tasks.md` - unrelated archived SPEC-0028 jobs-platform recovery artifact.
14. `openspec/specs/feature-flags/spec.md` - unrelated SPEC-0027 feature-flags recovery specification.
15. `openspec/specs/jobs-platform/spec.md` - unrelated SPEC-0028 jobs-platform recovery specification.

## Commands and Results

| Command | Result |
|---|---|
| `node --test openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/validation/test/*.test.mjs` | PASS, exit 0, 36 tests passed, 0 failed |
| `node .../validation/validate-structure.mjs` | PASS: governance structure is valid |
| `node .../validation/validate-fixtures.mjs` | PASS: fixture validation 22/22 |
| `node .../validation/reconcile-fixtures.mjs --twice` | PASS: `inserted=22 duplicates=22` |
| `node .../validation/validate-readiness.mjs` | PASS: Legacy Baseline accepted; v3.0+ remains strict |
| `node .../validation/audit-canonical-history.mjs` | PASS_WITH_LEGACY_BASELINE; 27 directories, 25 readable reports, 22 included, 5 excluded, 0/22 canonical source commits, 22 pre-v3.0 records, 0 v3 records |
| `node .../validation/validate-changed-paths.mjs --current-worktree` | PASS: 30 owned, 85 explicitly excluded recovery paths, 0 unclassified failures |
| `node --check .../validation/validate-changed-paths.mjs` | PASS, exit 0 |
| `git diff --check` for SPEC-SDD-0001-owned changed files | PASS, exit 0 |

The pre-fix full SPEC path invocation reproduced the original 15
`non-Working-Set` failures. The corrected manifest accepts all 15 as owned and
the current-worktree scope check passes.

## Design, Spec, Tasks, and Apply Traceability

- **Design:** all 18 numbered sections and Architecture Review topics A-G pass the structural validator. Readiness wording now matches the approved Legacy Baseline Exception; v3.0+ source-commit and aggregate requirements remain strict.
- **Specification:** 7 requirements and 8 scenarios remain present. The readiness requirement and scenario now assert `PASS_WITH_LEGACY_BASELINE` for qualifying pre-v3.0 records and strict v3.0+ behavior.
- **Tasks:** 12 implementation checkpoints and 4 phase exits are checked. Phase 3/4 readiness language now reflects `READY WITH LEGACY BASELINE`; the owned-path manifest is explicitly assigned to the Apply/Verify owner.
- **Apply evidence:** Phase 1-4 change-local validation, fixtures, reconciliation, readiness, and safety evidence remain present and pass. This remediation did not execute a new Apply phase or change product behavior.

## R-01/R-12 Evidence

- R-01: `PASS_WITH_LEGACY_BASELINE`; 22 included pre-v3.0 canonical artifacts satisfy the approved exception, with 0/22 canonical source commits recorded as a known historical limitation.
- R-12: `PASS_WITH_LEGACY_BASELINE`; no historical aggregate is claimed for the pre-v3.0 baseline, and `canonical-v3-aggregate/v1` is defined and mandatory for v3.0+.
- The canonical audit reproduces 27 archive directories, 25 readable reports, 22 included records, and 5 documented exclusions.
- Fixture and inventory commit values are not treated as canonical archive provenance.

## Scope Boundaries

- No product/runtime/schema/API/frontend changes are attributable to SPEC-SDD-0001.
- No SPEC-SDD-0002 release, Stable, freeze-restoration, or tag action was executed.
- No Gentle-AI command, dispatcher, native review lifecycle action, commit, push, merge, release, or tag was executed.
- Archive was not executed. Archive remains a separate post-Verify action.

## Findings

None. All three independent Verify blockers are resolved.

## Risks

- The worktree still contains unrelated recovery changes; the manifest excludes them explicitly and fails closed on any unclassified path.
- The pre-v3.0 Legacy Baseline limitation remains documented: canonical reports provide 0/22 explicit source commits and no historical aggregate value.
- Broad product build, lint, migration, generation, and runtime suites were not run because this SPEC is documentation-only and those paths are excluded recovery work.

## Verdict

**VERIFIED.** All SPEC-SDD-0001 focused acceptance checks pass with the approved
Legacy Baseline semantics, complete owned-path scope, explicit recovery
exclusions, and no unrelated product or lifecycle action.
