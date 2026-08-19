# Design: sdd-architecture-refinement-transition — Canonical Refinement Transition Repair

> **Status:** Draft
> **Scope:** Deterministic SDD runtime transition repair and canonical regression command only.

## 1. Executive Summary

Repair the runtime’s `AUTO_REFINE` routing so a BLOCKED Architecture Review enters Design Refinement and then a fresh Architecture Review, while a BLOCKED Tasks Review remains routed only to Tasks Refinement. The runtime will use one bounded structured `FATAL_INVARIANT`/`HUMAN_HANDOFF` producer for illegal review sources, cross-layer checkpoint mismatches, and exhausted refinement or retry budgets. It preserves blocker taxonomy, `human_required` semantics, one retry per refinement loop, and canonical PASS edges without phase inference.

The already-made runtime, package, and test changes in this approved Working Set are bounded implementation evidence only; Apply must verify them against this contract. This refinement does not broaden architecture, change product code, or mutate the protected `openspec/changes/sdd-autonomous-runtime-smoke-v2/` checkpoint.

## 2. Technical Approach

Keep lifecycle meaning in the runtime’s deterministic transition selector; do not infer a refinement layer from prose, model output, role, or a default branch. Use a closed mapping keyed only by the blocked review action: Architecture Review → Design Refinement and Tasks Review → Tasks Refinement. The selector compares the outcome action with the legal checkpoint action before mapping, and validates the corresponding refinement or retry budget.

Introduce one private `fatalInvariantHandoff(reason)` producer in `scripts/sdd-runtime.mjs`. It returns the complete terminal transition (`action: HUMAN_HANDOFF`, `role: HUMAN`, `kind: human`) with exactly one valid `FATAL_INVARIANT` blocker (`human_required: true`, non-empty reason, `resume_phase: null`). `selectNextTransition` calls that producer for cross-layer mismatch, unmapped `AUTO_REFINE`, and exhausted refinement/retry budgets; `dispatchUntilTerminal` only materializes that returned terminal transition. `safeValidateOutcome` remains limited to malformed outcome-packet normalization and does not claim to catch later selector failures.

Apply verifies focused Node coverage around this boundary and the one complete `test:sdd-runtime` regression entry point. No product code, workflow semantics, model routing, checkpoint rewrite, orchestration redesign, or second design store is in scope.

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
| --- | --- | --- | --- |
| Refinement selection | Ternary/default; explicit phase map | Explicit immutable map: Architecture Review → Design Refinement; Tasks Review → Tasks Refinement | Prevents the current cross-layer default and makes unknown phases reject deterministically. |
| Terminal invariant handling | Inline terminal objects; throw and rely on `safeValidateOutcome`; one producer | One `fatalInvariantHandoff(reason)` returned by the selector | A selector throw occurs after `safeValidateOutcome`; one returned structured producer makes dispatch materialization deterministic and testable. |
| Regression command | Unit-only; shell chaining; one Node invocation with explicit files | One `node --test` command naming all four suites once | Includes integration without duplicate execution or implicit discovery. |

## 4. Data Flow

```text
BLOCKED outcome + AUTO_REFINE
        │
        ▼
legal checkpoint + blocked review action ──explicit map──> refinement action ──budget──> next checkpoint
                  │                                      │
                  └── mismatch/unmapped/exhausted ───────┴──> fatalInvariantHandoff(reason)
                                                                   │
                                                                   ▼
                                                    HUMAN_HANDOFF + FATAL_INVARIANT
```

`dispatchUntilTerminal` materializes the returned terminal transition and performs no selector exception recovery. PASS remains `PHASE_EDGES[action]`; Design Refinement PASS returns to a fresh Architecture Review and Tasks Refinement PASS returns to a fresh Tasks Review. Existing human-required blocker classes continue directly to HUMAN handoff through their validated blocker policy.

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | `scripts/sdd-runtime.mjs` | Verify bounded modification | Verify explicit mapping plus the single selector-owned structured terminal producer. |
| 2 | `scripts/sdd-runtime.test.mjs` | Verify bounded modification | Verify both refinement layers, legal PASS edges, cross-layer mismatch, unmapped source, and exhausted budgets. |
| 3 | `scripts/sdd-runtime.integration.test.mjs` | Verify bounded modification | Verify dispatch materializes the selector-produced fatal/human terminal state. |
| 4 | `scripts/sdd-runtime.e2e.test.mjs` | Verify bounded modification | Verify Design Refinement PASS returns to fresh Architecture Review and terminal stopping does not infer phases. |
| 5 | `package.json` | Verify bounded modification | Verify `test:sdd-runtime` enumerates every canonical runtime suite once. |

### 5.2 Secondary Files

| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | `scripts/sdd-resume.test.mjs` | Verify bounded modification | Verify resume preserves an Architecture Review → Design Refinement checkpoint. |

### 5.3 Expected NOT to Change

- `docs/SDD-WORKFLOW.md` — already the authoritative correct lifecycle.
- `.opencode/sdd-model-map.json` — role ownership is already correct.
- `openspec/changes/sdd-autonomous-runtime-smoke-v2/` — failed checkpoint is protected evidence.
- CRM product sources and `.sdd-runtime/state.json` for this change — outside Design execution.

## 6. Read Order

1. `docs/SDD-WORKFLOW.md` — confirm canonical review/refinement edges and one-retry budget.
2. `scripts/sdd-runtime.mjs` — verify transition, blocker, budget, and selector-owned terminal contracts.
3. `scripts/sdd-runtime.test.mjs` — extend deterministic unit conventions.
4. `scripts/sdd-runtime.integration.test.mjs` and `scripts/sdd-runtime.e2e.test.mjs` — place boundary and dispatch regression tests.
5. `scripts/sdd-resume.test.mjs` — preserve recovered checkpoint behavior.
6. `package.json` — verify each suite has one canonical invocation.

## 7. Expected Commands

```bash
pnpm test:sdd-runtime
pnpm sdd:validate:design -- openspec/changes/sdd-architecture-refinement-transition/design.md
pnpm sdd:validate
```

## 8. Design Confidence

**Confidence:** High

The defect is localized to `selectNextTransition`; the current tests and package command expose exact files and conventions.

## 9. Exploration Budget

| Resource | Budget | Notes |
| --- | ---: | --- |
| Repo searches | 3 | Runtime/test-command and transition references only. |
| Files to read | 12 | Authority, state, runtime, tests, validator, package. |
| Files to create | 0 | The existing Design is refined in place. |
| Files to modify | 0 | Design Refinement changes only this approved artifact; Apply verifies the six bounded implementation files. |

## 10. Risks

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Selector exception bypasses structured termination | Med | High | Return the sole terminal object from `fatalInvariantHandoff`; do not throw from mapped invariant branches. |
| Valid retry behavior changes accidentally | Med | High | Keep non-`AUTO_REFINE` policy path unchanged; assert AUTO_RETRY exhaustion uses the same fatal producer. |
| Tests mask a cross-layer edge | Low | High | Assert both mappings and reject checkpoint/action mismatch plus Design/Verify/unknown AUTO_REFINE sources. |
| Suite command duplicates or omits coverage | Med | Med | Assert/inspect explicit four-file command and run it once. |

## 11. Testing Strategy

| Layer | Focus | Approach |
| --- | --- | --- |
| Unit | Explicit refinement map, canonical PASS edges, mismatch, unmapped source, and exhausted budgets | Call `selectNextTransition`; assert its returned terminal object is `HUMAN_HANDOFF` with the valid `FATAL_INVARIANT` blocker. |
| Integration | Selector-produced fatal/human materialization | Dispatch exhausted refinement and retry outcomes through `dispatchUntilTerminal`; verify HANDOFF, blocker class, `human_required`, and null next. |
| E2E | Design Refinement PASS → fresh Architecture Review; no phase inference | Simulate blocked Architecture Review, refinement PASS, and illegal AUTO_REFINE sources; assert action ownership and terminal stopping. |
| Regression | Command completeness and resume | Run `pnpm test:sdd-runtime`; assert each named suite once and resume retains the legal refinement checkpoint. |

## 12. Doorbell Tests

| Test file | What it proves |
| --- | --- |
| N/A | No tenant data, client boundary, API route, or authorization behavior is changed. |

## 13. Required ADRs

| ADR | Reason | Status |
| --- | --- | --- |
| None | This repairs implementation to an existing canonical workflow, without a new architecture decision. | Not required |

## 14. Boundaries

| Boundary | Owner | Purpose |
| --- | --- | --- |
| Canonical graph and budget | `docs/SDD-WORKFLOW.md` | Defines legal refinement semantics; not modified. |
| Transition enforcement | `scripts/sdd-runtime.mjs` | Maps only valid runtime state/outcome combinations. |
| Regression entry point | `package.json` | Executes each canonical suite once. |
| Runtime tests | `scripts/*test.mjs` | Prove contracts without product behavior changes. |

## 15. Extensibility

| Future feature | How it fits | Effort |
| --- | --- | --- |
| New conditional loop | Add one explicit canonical map entry, edge, role, and paired RED tests; no default branch. | Hours |
| New runtime suite | Add one explicit file to the canonical command and a no-duplication assertion. | Hours |

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor | 10× | 100× | Mitigation |
| --- | --- | --- | --- |
| State transitions | Constant | Constant | Fixed map lookup; no scan or storage change. |

**Decision:** Use constant-time explicit mapping.

**Rationale:** Transition count, not CRM data volume, is the bounded runtime concern.

**Alternative:** Infer phases dynamically; rejected as unsafe and non-deterministic.

**Future impact:** Additional loops require explicit entries and tests.

### B. Open/Closed Principle (OCP)

**Point of extension:** The explicit review-to-refinement mapping and paired tests.

**What must change to add one more:** Canonical workflow, runtime map, ownership/edge, and regression cases.

**Decision:** Extend only through declared canonical entries.

**Rationale:** Prevents hidden fallback behavior.

**Alternative:** Generic naming convention; rejected because it would infer lifecycle semantics.

**Future impact:** New loops remain reviewable and fail closed until complete.

### C. Ownership

| Data / Capability | Owner | Consumers |
| --- | --- | --- |
| Lifecycle semantics | `docs/SDD-WORKFLOW.md` | Runtime and tests |
| Deterministic enforcement | `sdd-runtime.mjs` | Direct executor |

**Decision:** Preserve workflow ownership; runtime enforces it.

**Rationale:** Adapter code cannot redefine canonical transitions.

**Alternative:** Put rules in tests/package scripts; rejected as non-executable at dispatch.

**Future impact:** Review evidence has one semantic source.

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
| --- | --- | --- | --- |
| Runtime state/trace | Existing lifecycle policy | Existing archive flow | Existing retention policy |

**Decision:** No new persisted data.

**Rationale:** The repair changes selection only.

**Alternative:** Store inferred refinement metadata; rejected as redundant.

**Future impact:** No migration or retention cost.

### E. Idempotency

| Operation | Duplicate risk | Protection | Fallback |
| --- | --- | --- | --- |
| Select refinement transition | Replayed outcome | Existing idempotency key and attempt accounting | Identical replay remains duplicate; mismatch, unmapped source, or exhausted budget returns the same structured terminal class |

**Decision:** Reuse current idempotency and budget contracts; route every specified invariant terminal case through one producer.

**Rationale:** No state-write protocol changes are needed, and dispatch receives a value rather than an uncaught selector exception.

**Alternative:** Add refinement-specific persistence; rejected as scope expansion.

**Future impact:** Replays remain deterministic.

### F. Shared Contracts

| Contract | Location | Consumers | Producers |
| --- | --- | --- | --- |
| Blocker/outcome/runtime state | `scripts/sdd-runtime.mjs` | Direct runtime tests/executors | Runtime |

**Decision:** Keep the existing JavaScript contract shape.

**Rationale:** `validateBlocker` remains the single taxonomy/human-required authority.

**Alternative:** Add a second transition contract; rejected to avoid divergence.

**Future impact:** Tests protect the same exported API.

### G. Partitioning Strategy

| Dimension | Risk | Strategy |
| --- | --- | --- |
| Tenant | None | No tenant data involved. |
| Time | Low | Existing append-only trace lifecycle remains unchanged. |
| Volume | Low | No new records or indexes. |

**Decision:** No partitioning change.

**Rationale:** This is pure control-flow repair.

**Alternative:** Partition runtime trace by loop; rejected as unrelated persistence change.

**Future impact:** Reassess only if trace storage is separately redesigned.

## 16. Interfaces / Contracts

```javascript
const REFINEMENT_BY_BLOCKED_REVIEW = Object.freeze({
  'Architecture Review': 'Design Refinement',
  'Tasks Review': 'Tasks Refinement',
});

function fatalInvariantHandoff(reason) {
  return {
    action: 'HUMAN_HANDOFF', role: 'HUMAN', kind: 'human',
    blocker: { class: 'FATAL_INVARIANT', human_required: true, reason, resume_phase: null },
  };
}
```

`selectNextTransition` is the single producer for this terminal value when a blocked outcome action differs from `state.checkpoint.next`, `AUTO_REFINE` has no mapped review source, a mapped refinement budget is exhausted, or a retry budget is exhausted. `dispatchUntilTerminal` materializes the returned value; it does not catch selector errors. `safeValidateOutcome` only normalizes malformed outcome packets before selection.

Acceptance criteria: Architecture Review/AUTO_REFINE selects Design Refinement; Tasks Review/AUTO_REFINE selects Tasks Refinement; all listed invariant cases return the single structured FATAL/HUMAN terminal value; `human_required` remains true only for FATAL/HUMAN classes; each refinement loop receives one retry; Design Refinement PASS selects fresh Architecture Review; ordinary PASS edges remain canonical; and `test:sdd-runtime` names runtime, integration, E2E, and resume suites exactly once.

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
| --- | --- | --- | --- |
| 1 | Apply verifies the already-bounded deterministic runtime, test, and package changes together. | Low | Maintainer may revert the bounded runtime/test/package change through the human-controlled process. |

No data migration, flag, checkpoint mutation, or replay is required.

## 18. Open Questions

| # | Question | Status | Resolution |
| --- | --- | --- | --- |
| 1 | Does any non-review phase authorize AUTO_REFINE? | Resolved | No; workflow permits only its corresponding blocked review refinement. |
| 2 | Must the canonical command include integration? | Resolved | Yes; enumerate all four canonical runtime suites once. |
