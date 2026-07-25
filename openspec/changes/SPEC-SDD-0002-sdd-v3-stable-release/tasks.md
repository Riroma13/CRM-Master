# Tasks: SPEC-SDD-0002 - SDD v3.0 Stable Release

> Derived from approved `design.md` (authoritative); review is
> `APPROVED_WITH_CONDITIONS` with no BLOCKER. Proposal/spec are compatibility
> artifacts and do not block Tasks. Design is immutable.

## Review Workload Forecast

Estimate: 700-1,000 changed lines; docs/validation.

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Workload Guard: after Tasks Review. Units: Contract (`node --test $C/validation/test/release-contract.test.mjs`; N/A; manifest/ADR), Metadata (`pnpm exec prettier --check docs/architecture`; N/A; docs), Readiness (`node $C/validation/validate-release.mjs`; N/A; reports).

## Working Set

`C=openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release`.

Apply primary: `docs/architecture/sdd-v3.0-release-notes.md`, `docs/architecture/adr/0021-sdd-v3-stable-release.md`, `docs/architecture/platform-baseline.md`, `docs/sdd-workflow-guard.md`, `docs/templates/design-enterprise-template.md`, `docs/templates/design-master-prompt.md`, `docs/architecture/sdd-infrastructure.md`, `docs/architecture/CHANGELOG.md`.

Apply secondary: `docs/SDD-WORKFLOW.md`, `docs/templates/design-prompt.md`, `docs/architecture/sdd-v3-roadmap.md`, `$C/validation/validate-release.mjs`, `$C/validation/test/release-contract.test.mjs`.

Forbidden: SPEC-SDD-0001, recovery, `.opencode/**`, Direct command/validators, global config, product/runtime/schema/dependencies, `docs/history/**`, Design/review, unclassified paths.

## Read Order

1. `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/verify-report.md` + archive.
2. Commit `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce`.
3. SPEC-SDD-0001 `design.md` + `specs/sdd-v3-stabilization/spec.md`.
4. `docs/sdd-workflow-guard.md`.
5. `docs/templates/design-enterprise-template.md` + `docs/templates/design-master-prompt.md`.
6. `docs/architecture/platform-baseline.md` + `docs/architecture/sdd-infrastructure.md` + `docs/architecture/adr/0004-sdd-feature-freeze.md`.
7. `docs/architecture/CHANGELOG.md` + `docs/architecture/sdd-v3-roadmap.md` + `docs/SDD-WORKFLOW.md`.
8. `docs/templates/design-prompt.md` + `docs/roadmaps/future-roadmap.md` + `docs/roadmaps/future-prompts.md`.
9. Changed-path inventory.

## Expected Commands

```bash
C=openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release
git diff --check -- "$C" docs/architecture docs/templates/design-enterprise-template.md docs/templates/design-master-prompt.md docs/sdd-workflow-guard.md
pnpm exec prettier --check "$C/design.md" docs/architecture docs/templates/design-enterprise-template.md docs/templates/design-master-prompt.md docs/sdd-workflow-guard.md
node openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/validation/validate-release.mjs
node --test openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/validation/test/*.test.mjs
node --test openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/validation/test/*.test.mjs
```

## Mandatory Acceptance Criteria

- [ ] AR-001/DC-001: append-only v2.1 opt-in: source/target, boundary, preservation, supersession.
- [ ] AR-002/DC-002: candidate/draft precedes manual Release/Tag; Stable/tag/freeze are final-gate-only.
- [ ] AR-003/DC-003: preserve dirty Direct/recovery; declared paths only; unclassified fails closed.
- [ ] AR-004/DC-004: one exact v3.0 contract, links, mappings, immutable history.
- [ ] AR-005/DC-005: review is approval record; no early gate or unapproved authority.
- [ ] DC-006: pre-v3.0 `PASS_WITH_LEGACY_BASELINE`; v3.0+ source commits and `canonical-v3-aggregate/v1`.
- [ ] AR-NB-001/002 CLOSED; final SHA/tag deferred; legacy limitation preserved.

## Apply 1: Baseline and RED Contracts

- [x] 1.1 Capture baseline/dirty paths; RED scope/state/contract tests first.
- [x] 1.2 Define ownership/rollback; reject SPEC-SDD-0001, recovery, Direct infrastructure, unclassified.

### Phase 1 Progress

- Status: COMPLETE (RED contracts captured; GREEN release implementation remains deferred to Apply 2).
- Evidence: `evidence/authority-inventory.json`, `evidence/stable-document-classification.json`, `validation/owned-path-scope.json`, and `evidence/phase-1-result.md`.
- Validator: `validation/validate-phase1.mjs` passes the Phase 1 scope and candidate-state checks.
- Next: Apply 2 — Release Contract Foundation.

## Apply 2: Release Contract Foundation

- [x] 2.1 GREEN `$C/validation/*`, manifest, ADR-0021, exact v3 identities.
- [x] 2.2 Enforce idempotency, opt-in/supersession, final-gate state, legacy/v3 evidence, rejection cases.

### Phase 2 Progress

- Status: COMPLETE (candidate release contract and compatibility validators are GREEN; Stable, freeze, release, and tag remain inactive).
- Evidence: `docs/architecture/sdd-v3.0-release-notes.md`, `docs/architecture/adr/0021-sdd-v3-stable-release.md`, `validation/validate-release.mjs`, `validation/test/release-contract.test.mjs`, and `evidence/phase-2-result.md`.
- Validator: `node $C/validation/validate-release.mjs` passes with zero deferred or unclassified paths.
- Next: Apply 3 — Stable Authority Metadata.

## Apply 3: Stable Authority Metadata

- [x] 3.1 Update metadata/references in eight primary documents; preserve Guard transitions/18-A-G.
- [x] 3.2 Cross-link one manifest/ADR; add no authority, phase, agent, command, metric, runtime behavior.

### Phase 3 Progress

- Status: COMPLETE (candidate authority metadata and cross-document contract are GREEN; Stable, freeze, release, and tag remain inactive).
- Evidence: eight canonical documents, `validation/validate-release.mjs`, `validation/test/release-contract.test.mjs`, `validation/owned-path-scope.json`, and `evidence/phase-3-result.md`.
- Validator: `node $C/validation/validate-release.mjs` passes with zero deferred or unclassified paths; Guard transition semantics remain identical to the approved baseline.
- Next: Apply 4 — Legacy Adoption and Safety.

## Apply 4: Legacy Adoption and Safety

- [x] 4.1 Add historical/deprecated/superseded status to three secondary documents.
- [x] 4.2 Validate forward-only adoption; preserve Direct/recovery changes.

### Phase 4 Progress

- Status: COMPLETE (legacy classification and final-gate safety are GREEN; the release remains candidate-only).
- Evidence: `docs/SDD-WORKFLOW.md`, `docs/templates/design-prompt.md`, `docs/architecture/sdd-v3-roadmap.md`, `docs/architecture/sdd-v3.0-release-notes.md`, `validation/owned-path-scope.json`, `validation/validate-phase1.mjs`, `validation/validate-release.mjs`, `validation/test/release-contract.test.mjs`, and `evidence/phase-4-result.md`.
- Validator: `node $C/validation/validate-release.mjs` passes with zero deferred or unclassified paths; only `manual Release/Tag after Repository Ready` is allowed as a future transition.
- State: `release_state: candidate`, `stable_declaration: NOT_EXECUTED`, `planned_tag_state: NOT_PUBLISHED`, `freeze_state_after_final_gate: PENDING`, and `automatic_transition: FORBIDDEN`.
- Next: Apply 5 — Reconciliation and Refactor.

## Apply 5: Reconciliation and Refactor

- [x] 5.1 Run focused tests, baseline regression, formatting, scope; REFACTOR only in Working Set.
- [x] 5.2 Emit `=== PHASE X COMPLETE ===`: files, Working Set accuracy, unexpected paths/dependencies, criteria, build, tests, next phase.

### Phase 5 Progress

- Status: COMPLETE (final reconciliation and release-readiness evidence are GREEN; Stable, freeze, release, and tag remain inactive).
- Evidence: `evidence/phase-5-result.md`, `validation/validate-phase5.mjs`, `validation/test/phase5-readiness.test.mjs`, and the carried scope/contract validators.
- Validator: Phase 5 reconciliation passes with zero unclassified/deferred paths and all Architecture Review conditions/DC criteria evidenced.
- Handoff: Apply Summary and Verify are the next Direct phases; neither was started in Apply Phase 5.
- State: `release_state: candidate`, `stable_declaration: NOT_EXECUTED`, `planned_tag_state: NOT_PUBLISHED`, `freeze_state_after_final_gate: PENDING`, `final_gate.status: NOT_EXECUTED`.
- Next: Apply Summary — not started in this call.

## Direct Fix: VER-001

- Status: COMPLETE for the confirmed Verify transition blocker; Verify itself remains open.
- Boundary: `current_direct_phase: Verify` allows only the completed `apply-summary.md` and `verify-report.md` reports. Archive, Health, and Repository Ready reports remain deferred until their ordered Direct phases.
- RED: the carried validators rejected both reports and the focused suite was 22/24.
- GREEN: the transition-aware classifier, release scope, and Phase 5 snapshot reconciliation pass with the completed downstream reports present.
- REFACTOR: focused tests cover the completed Apply Summary/Verify transition, early downstream reports, missing Apply Summary ordering, fail-closed unclassified paths, and pre-Phase 5 snapshot preservation.
- Evidence: `validation/owned-path-scope.json`, `validation/validate-phase1.mjs`, `validation/validate-release.mjs`, `validation/validate-phase5.mjs`, and their focused tests.
- Preserved limitations: VER-002 canonical-wide formatting findings remain documented as non-blocking in `verify-report.md`; the SPEC-SDD-0001 35/36 baseline regression remains a documented pre-existing limitation.
- Next: rerun the complete Verify evidence set; do not start Archive until Verify returns `VERIFIED`.

## Apply Summary, Verify, Archive, Health, Repository Ready

- [ ] Produce `$C/apply-summary.md` for Apply 1-5; no Stable/release.
- [ ] Produce `$C/verify-report.md` proving AR/DC, uniqueness, idempotency, scope, history, no leakage, SPEC-SDD-0001 regression.
- [ ] Produce `$C/archive-report.md` from verified evidence without rewriting v2.1 history.
- [ ] Produce `$C/health-report.md` and `$C/repository-ready.md` from `docs/templates/terminal-gates-template.md`, with five manual gates `NOT EXECUTED`.
- [ ] Stop at Repository Ready. Commit/Push/Merge/Release/Tag remain manual; final Release/Tag alone may declare Stable, publish `sdd-v3.0-baseline`, and reactivate freeze.
