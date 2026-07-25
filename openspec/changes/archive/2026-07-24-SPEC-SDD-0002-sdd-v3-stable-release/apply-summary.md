# Apply Summary

> **SPEC:** SPEC-SDD-0002-sdd-v3-stable-release
> **Date:** 2026-07-24

## Executive Summary

Apply Phases 1-5 completed with PASS status for the documentation-only SDD v3.0
release contract. The five slices established the authority inventory, candidate
release contract, cross-document metadata, legacy adoption safety, and final
reconciliation evidence without changing product/runtime behavior.

The release remains candidate-only. Stable declaration, freeze restoration,
release publication, tag publication, and all manual destructive gates remain
unexecuted. The next Direct phase is Verify.

## Phases Completed

| Phase | Focus | Files Created | Files Modified | WSA |
|-------|-------|:-------------:|:--------------:|:---:|
| 1 | Baseline and RED Contracts | 7 | 1 | 100% |
| 2 | Release Contract Foundation | 4 | 4 | 100% |
| 3 | Stable Authority Metadata | 1 | 13 | 100% |
| 4 | Legacy Adoption and Safety | 1 | 9 | 100% |
| 5 | Reconciliation and Refactor | 3 | 4 | 100% |
| **Total** | | **16** | **31 phase modification actions** | **100%** |

The file counts are phase ownership counts. Carried validators, scope files,
task progress, and authority documents intentionally appear as modifications in
more than one phase. The Apply Summary itself is the requested downstream
consolidation artifact and is not counted as an Apply 1-5 file.

## Working Set Reconciliation

| Phase | Planned Paths | Actual Paths | Accuracy |
|-------|--------------:|-------------:|:--------:|
| 1 | 8 | 8 | 100% |
| 2 | 8 | 8 | 100% |
| 3 | 14 | 14 | 100% |
| 4 | 10 | 10 | 100% |
| 5 | 7 | 7 | 100% |
| **Cumulative phase ownership entries** | **47** | **47** | **100%** |

The initial baseline capture recorded 111 dirty paths: 19 modified and 92
untracked. The pre-Phase 5 preservation snapshot recorded 132 changed paths;
Phase 5 added only its three declared paths. The final pre-summary reconciliation
classified the worktree as 26 owned, 7 preserved, 102 excluded, 0 future,
0 deferred, and 0 unclassified paths.

Unexpected files: none within the five Apply slices.

Unexpected dependencies: none. The change-local validators use Node.js built-ins,
the carried scope classifier, and read-only Git queries only.

## Overall Metrics

| Metric | Value |
|--------|-------|
| Working Set Accuracy | 100% in each phase; 47/47 cumulative ownership entries |
| Unexpected Files | 0 |
| Unexpected Dependencies | 0 |
| Total Files Created | 16 unique Apply-phase paths |
| Total Files Modified | 31 phase modification actions across 16 unique paths |
| Build Success | N/A; documentation and Node.js validators only |
| Tests | 24/24 focused change-local tests; baseline regression 35/36 with one documented pre-existing failure |
| Release Validators | 3/3 PASS before this summary artifact was created |

## Tests and Validators

| Check | Result |
|-------|--------|
| `node --test openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/validation/test/*.test.mjs` | PASS, 24 passed, 0 failed |
| `node openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/validation/validate-phase1.mjs` | PASS; 8 owned, 8 preserved, 17 future, 102 excluded, 0 deferred, 0 unclassified |
| `node openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/validation/validate-release.mjs` | PASS; 26 owned, 7 preserved, 102 excluded, 0 future, 0 deferred, 0 unclassified |
| `node openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/validation/validate-phase5.mjs` | PASS; all AR/DC evidence, candidate state, preservation, and scope checks passed |
| `node --check` for `validate-phase1.mjs`, `validate-release.mjs`, and `validate-phase5.mjs` | PASS |
| Declared-file Prettier checks | PASS for the documented Phase 5 file set |
| `git diff --check` for this change | PASS; no whitespace errors |
| SPEC-SDD-0001 baseline regression | 35 passed, 1 pre-existing failure; preserved as a documented limitation |

The focused test progression was 5/5 in Phase 1, 9/9 in Phase 2, 16/16 in
Phase 3, 21/21 in Phase 4, and 24/24 in Phase 5. Phase 1's release-contract
test was intentionally RED before the Apply 2 implementation and was GREEN in
the subsequent phase.

The baseline regression command exited with status 1 because unrelated recovery
directory `openspec/changes/archive/2026-07-21-SPEC-0027-feature-flags/` changes
the SPEC-SDD-0001 audit counts. Expected counts were 27/25/22/5 and observed
counts were 28/26/22/6. This limitation is outside SPEC-SDD-0002, was not fixed,
and does not change the accepted baseline evidence of 36/36 with
`PASS_WITH_LEGACY_BASELINE`.

## Acceptance Criteria Summary

| Phase | Criteria | Status |
|-------|----------|--------|
| 1 | Baseline capture, authority ownership, classifications, scope rejection, and RED contracts | PASS |
| 2 | Candidate release identity, one-time opt-in, supersession, evidence policy, and rejection cases | PASS |
| 3 | Eight-document candidate authority metadata and unchanged Guard/18-A-G semantics | PASS |
| 4 | Legacy status mappings, forward-only adoption, and executable final-gate safety | PASS |
| 5 | Reconciliation, preservation snapshot, criteria matrix, and Verify handoff | PASS |

## Mandatory Conditions

| Condition | Evidence and Result |
|-----------|---------------------|
| AR-001 / DC-001 | The release contract requires source identity, target identity and revision, effective Design boundary, one-time marker, supersession link, and preserved completed evidence. PASS. |
| AR-002 / DC-002 | Candidate state, unpublished tag, pending freeze, unexecuted final gate, verified-commit deferral, and forbidden automatic transition are asserted. PASS. |
| AR-003 / DC-003 | The baseline and pre-Phase 5 path snapshots preserve dirty Direct/recovery work; only declared SPEC-SDD-0002 paths are owned and unclassified paths fail closed. PASS. |
| AR-004 / DC-004 | The eight canonical documents share one exact release identity, baseline, planned tag, compatibility fields, links, mappings, and candidate final-gate state. PASS. |
| AR-005 / DC-005 | `architecture-review.md` remains the approval record; no unapproved authority, lifecycle gate, release action, or early transition was introduced. PASS. |
| DC-006 | Pre-v3.0 evidence retains `PASS_WITH_LEGACY_BASELINE`; v3.0+ evidence requires an explicit source commit and `canonical-v3-aggregate/v1`. PASS. |
| AR-NB-001 | CLOSED. The final release SHA and tag object remain deferred until maintainer-controlled gates. |
| AR-NB-002 | CLOSED. The accepted legacy-baseline limitation remains explicit and is not treated as v3.0 evidence. |

## Preserved and Excluded Scope

### Preserved Paths and Boundaries

| Path or boundary | Preservation rule |
|------------------|-------------------|
| `docs/sdd-workflow-guard.md` | Metadata/reference-only change; transition semantics and the existing Direct-mode section remain preserved. |
| `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/design.md` | Authoritative approved Design remains unchanged. |
| `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/proposal.md` and `specs/**` | Derived compatibility artifacts remain unchanged and non-authoritative. |
| `architecture-review.md`, `tasks-review.md`, and `workload-guard.md` | Review and delivery-boundary evidence remains preserved. |
| `docs/roadmaps/**` and `docs/history/**` | Historical/reference material remains read-only. |
| `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/**` | Verified v2.1 baseline and evidence remain immutable and outside this change. |
| Existing dirty recovery and Direct-mode work | Preserved; no unrelated path was reverted, absorbed, or attributed to SPEC-SDD-0002. |

### Excluded or Forbidden Paths

| Path or boundary | Exclusion rule |
|------------------|----------------|
| `.opencode/**`, `scripts/**`, and `docs/architecture/sdd-direct.md` | Direct execution infrastructure is outside the release contract. |
| `apps/**`, `packages/**`, migrations, schemas, product/runtime tests, and `pnpm-lock.yaml` | Product, runtime, schema, dependency, and recovery changes are outside scope. |
| `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/**` and `openspec/changes/archive/**` | Historical and archived SPEC evidence cannot be modified by this change. |
| `openspec/changes/SPEC-0025-identity-platform/**`, archived SPEC-0027/SPEC-0028 paths, and unrelated `openspec/specs/**` | Unrelated recovery work remains excluded. |
| `docs/adr/**` other than the declared release ADR, `docs/identity/**`, and `docs/architecture/platform-roadmap.md` | Existing recovery/platform artifacts are not release-owned paths. |
| `docs/templates/terminal-gates-template.md` | Existing Direct terminal-gate infrastructure is not modified. |
| Global configuration and any unclassified path | Fail-closed exclusion; no ownership or mutation is permitted. |

## Architecture Decisions Applied

- The Workflow Guard remains the sole transition authority.
- The Enterprise Design Template remains the sole 18-section/A-G shape authority.
- The Design Master Prompt remains the sole Design-generation authority.
- The release manifest adds one candidate compatibility contract without creating a second workflow or authority store.
- v2.1 adoption is forward-only, append-only, one-time, and supersession-linked; completed evidence is immutable.
- `PASS_WITH_LEGACY_BASELINE` is limited to the accepted pre-v3.0 population; v3.0+ evidence is strict.
- Guard and shared governance edits are metadata/reference-only; no product/runtime or workflow behavior changed.
- Stable declaration and freeze restoration are maintainer-controlled final-gate actions only.

## Candidate State and Manual Gates

The final reconciled state is explicitly candidate-only:

| Field | Candidate value |
|-------|-----------------|
| `release_state` | `candidate` |
| `stable_declaration` | `NOT_EXECUTED` |
| `planned_tag_state` | `NOT_PUBLISHED` |
| `freeze_state_after_final_gate` | `PENDING` |
| `final_gate.status` | `NOT_EXECUTED` |
| `final_gate.authority` | `manual-maintainer-release-tag` |
| `final_gate.verified_commit` | `DEFERRED` |
| `final_gate.allowed_future_transition` | `manual Release/Tag after Repository Ready` only |
| `final_gate.automatic_transition` | `FORBIDDEN` |

Stable was not declared. Freeze was not reactivated. The release was not
published. `sdd-v3-baseline` was not published or created. The five manual
destructive gates were not executed:

| Gate | Status |
|------|--------|
| Commit | NOT EXECUTED |
| Push | NOT EXECUTED |
| Merge | NOT EXECUTED |
| Release | NOT EXECUTED |
| Tag | NOT EXECUTED |

## Deferred Items

| Item | Reason |
|------|--------|
| Verify report | Must consume the complete Apply Summary, phase evidence, validators, preservation snapshot, and baseline limitation. |
| Archive, Health, and Repository Ready reports | Downstream Direct phases; not started in Apply Summary. |
| Final release commit SHA and tag object | Unknown until the manual Commit/Push/Merge/Release/Tag gates. |
| Stable declaration, `sdd-v3.0-baseline`, and freeze reactivation | Allowed only at the final maintainer-controlled Release/Tag gate after Repository Ready. |
| SPEC-SDD-0001 regression count drift | Pre-existing unrelated recovery limitation; preserved for Verify rather than changed here. |

## Risks

| Risk | Status |
|------|--------|
| Pre-existing SPEC-SDD-0001 regression count drift | Documented limitation; non-blocking for this documentation-only change and must remain distinguished from v3.0 evidence. |
| Dirty worktree contains unrelated recovery and Direct changes | Mitigated by baseline/path snapshots, preservation hashes, declared ownership, and fail-closed classification. |
| Premature Stable, tag, release, or freeze state | Mitigated by candidate-state assertions and the manual-only final-gate contract. |
| Historical v2.1 mutation | Mitigated by immutable path mappings, append-only adoption, and supersession validation. |

## Overall Apply Verdict

**PASS WITH DOCUMENTED BASELINE LIMITATION**

All five Apply phases are complete, all AR-001 through AR-005 and DC-001
through DC-006 criteria have evidence, and no blocker prevents the next phase.
The candidate-only final-gate state is intact. Ready for Verify.
