# Archive Report: SPEC-SDD-0001 - SDD v3.0 Stabilization

**Date:** 2026-07-24
**Mode:** openspec (manual archive snapshot)
**Status:** **ARCHIVED**
**Archive path:** `openspec/changes/archive/2026-07-24-SPEC-SDD-0001-sdd-v3-stabilization/`

## Executive Summary

SPEC-SDD-0001 was archived from its independently verified repository state. The
verification authority is the change-local `verify-report.md`, whose status is
exactly `VERIFIED`. The accepted readiness result is
`PASS_WITH_LEGACY_BASELINE`: R-01 and R-12 retain that status for the approved
pre-v3.0 population, including the known `0/22` canonical source-commit
limitation, while v3.0+ remains strict.

This archive is documentation and artifact governance only. No product,
runtime, schema, API, frontend, migration, dependency, Stable, freeze,
release, or tag behavior is included.

## Archive Operation

The active change directory was copied to the dated archive path as an
immutable snapshot. It was intentionally not moved, deleted, or rewritten so
the active SPEC artifacts remain unchanged as explicitly required for this
manual archive. No main-spec synchronization or active archive marker was
needed. No unrelated SPEC-0025, SPEC-0027, or SPEC-0028 recovery file was
copied or modified by this operation.

The snapshot contains the 28 SPEC-SDD-0001-owned artifacts present at Verify:
proposal, delta specification, Design, Tasks, Tasks Review, Verify report, six
evidence artifacts, three fixtures, and thirteen validation scripts/tests. This
archive report is the additional archive-only artifact.

## Verification Authority

**Authority:** `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/verify-report.md`
**Reported status:** **VERIFIED**
**Verification date:** 2026-07-24
**Mode:** Independent repository verification from the current worktree

### Commands and Results

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

The persisted Tasks artifact contains 12 checked implementation checkpoints
and 4 checked phase exits.

### Owned and Excluded Scope

The canonical scope manifest is
`openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/validation/owned-path-scope.json`
with schema `sdd-owned-path-scope/v1`.

- Owned scope: 30 paths, consisting of 28 SPEC-SDD-0001 artifacts and the two authorized documentation exceptions `docs/sdd-workflow-guard.md` and `docs/templates/design-enterprise-template.md`.
- Excluded scope: 85 observed recovery paths, with zero unclassified paths.
- Explicit excluded OpenSpec recovery paths: SPEC-0025 identity `architecture-review.md`, `design.md`, and `tasks.md`; SPEC-0027 archived `design.md`, `pr-description.md`, `proposal.md`, and `tasks.md`; SPEC-0028 archived `archive-report.md`, `design.md`, `exploration.md`, `pr-description.md`, `proposal.md`, and `tasks.md`; and `openspec/specs/feature-flags/spec.md` plus `openspec/specs/jobs-platform/spec.md`.
- Excluded path rules cover `apps/`, `packages/`, `docs/architecture/platform-roadmap.md`, `docs/adr/`, `docs/identity/`, and `pnpm-lock.yaml` as unrelated recovery work.
- Any path matching neither the owned set nor an exclusion fails closed as an unclassified scope failure.

### Canonical Audit Facts

- The pre-archive audit observed 27 archive directories and 25 readable canonical `archive-report.md` files.
- The canonical population contained 22 included records and 5 documented exclusions, all 22 included records classified as pre-v3.0.
- Canonical source provenance was `0/22` explicit source commits. This is a known historical limitation and is not replaced by fixture placeholders.
- R-01 is `PASS_WITH_LEGACY_BASELINE`: the 22 included pre-v3.0 artifacts satisfy the approved exception.
- R-12 is `PASS_WITH_LEGACY_BASELINE`: no historical aggregate is claimed; `canonical-v3-aggregate/v1` remains mandatory for v3.0+.
- No v3.0 record was included in the verified population.

## No-Archive-Before-Now Boundary

Before this manual operation, the independent Verify report explicitly stated
that Archive had not been executed and remained a separate post-Verify action.
This report records the first archive action for this change and does not imply
that Verify or any native lifecycle transition was previously executed.

The Gentle-AI native Verify transition was blocked by a stale correction_required review authority unrelated to SPEC acceptance criteria.

The independent Verify report also records that no Gentle-AI command,
dispatcher, native review lifecycle action, commit, push, merge, release, or
tag was executed.

## SPEC-SDD-0002 Boundary

Stable declaration, freeze restoration, release, and tag actions remain owned
exclusively by SPEC-SDD-0002 and are out of scope. None was performed here.

## Risks and Limitations

- The active change directory remains present by deliberate snapshot policy; a future lifecycle operation must not mistake the retained source for a second implementation.
- The pre-v3.0 `0/22` canonical source-commit limitation remains unresolved by design, and no historical aggregate is claimed.
- Broad product build, lint, migration, generation, and runtime suites were not run because the verified SPEC is documentation-only and those paths are excluded recovery work.
- No source commit is recorded for this uncommitted manual archive operation because commit, push, merge, release, and tag actions were explicitly prohibited.

## Traceability

| Artifact | Status |
|---|---|
| `proposal.md` | Archived snapshot |
| `specs/sdd-v3-stabilization/spec.md` | Archived snapshot; no main-spec sync performed |
| `design.md` | Archived snapshot |
| `tasks.md` | Archived snapshot; 16/16 task and phase items checked |
| `tasks-review.md` | Archived snapshot; APPROVED |
| `verify-report.md` | Archived snapshot; VERIFIED |
| `archive-report.md` | This report |

## Next Recommended

None for this manual archive. Do not start another Verify or SDD workflow.
Keep SPEC-SDD-0002 Stable/release/freeze/tag work separate and out of scope.

## Skill Resolution

Loaded from the exact paths supplied before work:

- `/home/ubuntu/.config/opencode/skills/sdd-archive/SKILL.md`
- `/home/ubuntu/.config/opencode/skills/_shared/SKILL.md`

Resolution: `paths-injected`; no Gentle-AI dispatcher or native review
lifecycle was invoked.
