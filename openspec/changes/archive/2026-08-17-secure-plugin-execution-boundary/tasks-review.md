# Tasks Review: secure-plugin-execution-boundary

> **Normalized result:** PASS
> **Action:** Tasks Review (fresh review after the single Tasks Refinement)
> **Role:** MID / BUILDER
> **Model binding:** `openai/gpt-5.6-luna` (`.opencode/sdd-model-map.json:13-16,33-36,55-57`)
> **Persistence:** hybrid; this file is the exact repository artifact and Engram carries only bounded status/evidence.

## Decision

The refined `tasks.md` closes TR-01–TR-05. The Tasks contract is complete,
dependency-ordered, RED-first, and sufficiently concrete to authorize the
canonical Workload Guard. No implementation, Apply artifact, Design, or Git
lifecycle operation was performed.

## Prior Review History (preserved)

The initial Tasks Review was **BLOCKED** before the single permitted Tasks
Refinement. Its complete finding record is preserved here:

| ID | Initial blocker | Initial evidence | Refinement required |
| --- | --- | --- | --- |
| TR-01 | Working Set entries were not independently recoverable because most paths were abbreviated. | `design.md:41-77`; initial `tasks-review.md` TR-01 | Preserve all 19 full paths with action and create/delete status. |
| TR-02 | Read Order used shorthand instead of concrete ordered paths. | `design.md:79-87`; initial `tasks-review.md` TR-02 | Emit the exact concrete Design Read Order. |
| TR-03 | HTTP surfaces and disabled execution paths were not fully enumerated. | `plugin.controller.ts:19-87`; `event-bridge.service.ts:60-114`; `worker-pool.service.ts:63-131` | Name every route and disabled path in actionable tasks. |
| TR-04 | Static reachability proof was not actionable. | `design.md:131-133`; initial `tasks-review.md` TR-04 | Add a RED assertion for dynamic evaluation, Worker creation, source loaders, and deleted worker path. |
| TR-05 | Workload forecast lacked exact standalone guard lines. | Initial `tasks.md:3-4`; Tasks contract | Add the four machine-matchable forecast lines. |

The initial record also recorded PASS evidence for directional RED-first order,
authority/isolation, inactive state, execution disablement, scope exclusions,
and the high feature-branch-chain forecast, plus PASS results for both
validators and the legal next action of the single Tasks Refinement. The
correction budget is now exhausted for this loop.

## Fresh Closure Evidence

| ID | Result | Evidence in refined `tasks.md` |
| --- | --- | --- |
| TR-01 | CLOSED | Lines 13–32 enumerate all 19 full repository paths with Modify/Delete/Create actions and purpose. |
| TR-02 | CLOSED | Lines 34–35 provide the exact concrete ordered Read Order, including both identity guards, schema, every focused test, and doorbell. |
| TR-03 | CLOSED | Lines 40–44 name all six HTTP surfaces and explicitly cover `onEvent`, `dispatchToPlugin`, `execute`, Worker creation/message, source loading, and deleted worker/dynamic evaluation paths. |
| TR-04 | CLOSED | Line 42 requires a RED static assertion that reads approved plugin paths and checks `new Function`, `eval`/equivalent evaluation, `new Worker`, source loaders, and `plugin.worker.ts`. |
| TR-05 | CLOSED | Lines 5–8 contain the exact standalone workload guard contract lines. |

## Contract Checks

- **RED-first/dependency order:** Phase 1 contains all RED work before Phase 2
  GREEN; Phase 2 orders authority, admission, disabled execution, then wiring.
- **Authority/isolation:** Host/session/membership authority, tenant predicates,
  forged tenant rejection, pre-effect denial, and real Tenant A/B HTTP evidence
  are explicit; same-tenant metadata management remains allowed.
- **Admission/state:** Strict manifest/archive admission, capability allow-list,
  validation-before-effects, no source persistence, inactive registration, and
  `enabled: false` override are explicit.
- **Execution-disabled behavior:** Activation `409`, bridge/pool fail-closed
  behavior, no lookup/logging/delivery/Worker/source effect, and worker deletion
  are explicit.
- **Scope:** Schema/migrations, common auth/Host middleware redesign,
  infrastructure, governance, marketplace, feature flags, source reprocessing,
  runtime expansion, Apply artifacts, and Git operations are excluded.
- **Workload:** Forecast is 650–900 changed lines, High risk, with three
  independently reviewable feature-branch-chain units and required focused
  commands, runtime harnesses, and rollback boundaries.

## Validation Evidence

1. Consumed refined `tasks.md`, approved `design.md`, fresh PASS
   `architecture-review.md`, preserved blocked review history, canonical
   `docs/SDD-WORKFLOW.md`, and `.opencode/sdd-model-map.json`.
2. `pnpm sdd:validate` — PASS.
3. `pnpm sdd:validate:design -- openspec/changes/secure-plugin-execution-boundary/design.md` — PASS.
4. `git diff --check` — PASS.
5. No production code, Design, Tasks, Apply artifact, or Git lifecycle action
   was modified or performed; only this fresh review artifact was written.

## Next Action

Under `docs/SDD-WORKFLOW.md:99-105,124-158`, the fresh Tasks Review passes
after the single permitted Tasks Refinement. The next legal action is
**Workload Guard**, followed by Apply 7.1 only after the guard result and any
required HUMAN decision for the High forecast. A second blocked review would
be a stop condition; it is not applicable because this review is PASS.
