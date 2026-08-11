# Tasks: SPEC-SDD-0003 — SDD Governance Consolidation

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 0–80 mechanical reconciliation lines; recovered edits are implementation state |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | One bounded governance reconciliation unit |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Exact Working Set and Read Order

The only reconciliation scope is the approved 54 files: the 33 primary files in Design §5.1 (`.ai/context/{PROJECT,SESSION,DECISIONS,KNOWN_ISSUES,ROADMAP}.md`, `AGENTS.md`, `docs/SDD-WORKFLOW.md`, listed guard/architecture/archive/template files, `openspec/config.yaml`, `package.json`, both validators, and four listed Direct agents) plus the 21 secondary files in Design §5.2 (`.opencode/sdd-model-map.json`, `opencode.json`, four Direct agents, and 16 listed command stubs). Use the approved Read Order: `AGENTS.md`, project context, `recovery.md`, `architecture-review.md`, `docs/SDD-WORKFLOW.md`, then only bounded contract/validator evidence. Do not broaden it.

## Suggested Work Unit

| Unit | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|
| 1. Governance reconciliation | `pnpm sdd:validate:design -- openspec/changes/SPEC-SDD-0003-sdd-governance-consolidation/design.md && pnpm sdd:validate && git diff --check` | N/A — documentation/adapter validation only | Revert only approved 54-file governance edits; never touch maintenance evidence or exclusions |

## Phase 1: RED — Reconciliation Evidence

- [ ] 1.1 Record the recovered state as the baseline; prove no product/runtime, schema, product-test, global-config, Git, or SPEC-0028 path is in scope.
- [ ] 1.2 Run the Design pre-gate and governance validator; capture failing output if any authority, role, persistence, Direct-only, STOP-stub, or maintainer-gate assertion is RED.

## Phase 2: GREEN — Bounded Mechanical Correction

- [ ] 2.1 If a validator exposes one unambiguous mechanical drift within the 54 files, use the canonical one-retry correction budget to correct only that file/contract; do not redesign lifecycle semantics or add product behavior. If the fresh Tasks Review is BLOCKED a second time, stop and escalate to the prescribed owner without another retry or scope expansion.
- [ ] 2.2 Re-run both validators and `git diff --check`; record PASS, exact command output, and unchanged exclusions. Do not execute Apply.

## Phase 3: REFACTOR — Evidence Closure

- [ ] 3.1 Reconcile evidence to 33 tracked + 21 untracked = 54 migration files; retain AR-10 historical arithmetic as non-blocking maintenance evidence.
- [ ] 3.2 Run and persist the final deterministic active-governance contradiction scan, naming every compared authority and recording its result and evidence artifact; confirm `docs/SDD-WORKFLOW.md` remains sole semantic authority, `.opencode/sdd-model-map.json` remains the sole concrete map, hybrid persistence remains intact, and Commit, Push, and Merge are HUMAN / MAINTAINER-only gates with none executed or simulated and the handoff remaining maintainer-only.
- [ ] 3.3 Confirm tenant isolation evidence is N/A: no tenant data, endpoint, schema, client, credential, runtime boundary, or product test is read or changed.

## Acceptance Criteria

- [ ] Tasks remain evidence/reconciliation-only and introduce no product behavior, lifecycle, or Design changes.
- [ ] Deterministic validators and diff check pass, or exact pre-existing BASELINE_DEBT is recorded without fixing it.
- [ ] SPEC-0028 remains exactly excluded and uninspected; maintenance evidence remains excluded from the 54-file Working Set.
- [ ] No Apply, Tasks Review, Git operation, global-config access, or source-file modification occurs in this action.

Canonical next action after this artifact: **Tasks Review** (MID / BUILDER); only its PASS edge may reach Workload Guard and later Apply.
