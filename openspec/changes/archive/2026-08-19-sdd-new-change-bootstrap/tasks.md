# Tasks: Deterministic Missing-Change Bootstrap

## Review Workload Forecast
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

| Unit | Goal | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| 1 | Bootstrap runtime, tests, and dispatch ordering | `node --test scripts/sdd-runtime.test.mjs scripts/sdd-runtime.integration.test.mjs` | Disposable filesystem bootstrap; no tenant harness (N/A by Design) | Three implementation files plus two named test files |

## Phase 1: RED (dependency: approved Design and Architecture Review PASS)
- [x] 1.1 Add failing unit cases in `scripts/sdd-runtime.test.mjs` for CREATED READY/schema-v2/`next: Design`, valid matching-state REUSED, and missing/corrupt/foreign-state provenance rejection without writes.
- [x] 1.2 Add failing filesystem cases in `scripts/sdd-runtime.integration.test.mjs` for fresh exclusive creation, collision reread, no replacement, and no trace emission.

## Phase 2: GREEN (depends on Phase 1 RED evidence)
- [x] 2.1 Modify `scripts/sdd-runtime.mjs` with validated `bootstrapChange`, exclusive directory/state creation, exact `buildInitialState` invariants, CREATED/REUSED results, and fail-closed existing-path handling.
- [x] 2.2 Modify `.opencode/agents/sdd-direct-orchestrator.md` to invoke bootstrap after governance validation and before recovery/dispatch, stopping on bootstrap failure and dispatching only `next: Design`.

## Phase 3: REFACTOR and evidence (depends on Phase 2 GREEN)
- [x] 3.1 Refactor only the four-file implementation/test Working Set; preserve exclusive writes, collision validation, event-first provenance, and existing runtime test style. No behavior-preserving refactor was required; 7.5 confirmed no drift.
- [x] 3.2 Run `node --test scripts/sdd-runtime.test.mjs scripts/sdd-runtime.integration.test.mjs`, `pnpm sdd:validate`, and `pnpm sdd:validate:design -- openspec/changes/sdd-new-change-bootstrap/design.md`; record RED→GREEN→REFACTOR results and any unrelated baseline debt. All required checks passed; unrelated tenant-web mock failures remain baseline debt.

## Exact Working Set and Read Order
Working Set: `scripts/sdd-runtime.mjs`; `scripts/sdd-runtime.test.mjs`; `.opencode/agents/sdd-direct-orchestrator.md`; `scripts/sdd-runtime.integration.test.mjs`. Expected NOT to change: `docs/SDD-WORKFLOW.md`, `docs/templates/design-enterprise-template.md`, `.opencode/commands/sdd-direct.md`, `scripts/validate-sdd-direct.mjs`, `.opencode/sdd-model-map.json`, recovered `.sdd-runtime/state.json`, and `openspec/changes/SPEC-0028-jobs-background-processing-platform/`.

Read Order: (1) `scripts/sdd-runtime.mjs`; (2) `scripts/sdd-runtime.test.mjs`; (3) `scripts/sdd-runtime.integration.test.mjs`; (4) `.opencode/agents/sdd-direct-orchestrator.md`; (5) `docs/SDD-WORKFLOW.md`. Stop on contradiction; do not broaden the set.

## Checkpoints and Acceptance Criteria
- Checkpoint 1: both RED suites fail for the missing behavior before production edits.
- Checkpoint 2: GREEN proves fresh creation, idempotent valid reuse, fail-closed conflicts, race collision handling, exact READY state, and no pre-phase trace.
- Checkpoint 3: REFACTOR changes no behavior; all listed validators pass.
- Acceptance: only the approved Working Set changes; existing provenance is never overwritten; orchestrator bootstrap precedes recovery; tenant/client/database/HTTP boundaries remain N/A and unchanged; next legal action after this artifact is `Tasks Review`.
