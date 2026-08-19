# Tasks: Canonical Refinement Transition Repair

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 120–220 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single bounded work unit |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Exact Working Set and Read Order

Primary ownership: `scripts/sdd-runtime.mjs`, `scripts/sdd-runtime.test.mjs`, `scripts/sdd-runtime.integration.test.mjs`, `scripts/sdd-runtime.e2e.test.mjs`, `package.json`.
Secondary ownership: `scripts/sdd-resume.test.mjs`.
Read exactly in this order: `docs/SDD-WORKFLOW.md`; runtime; unit tests; integration/e2e tests; resume tests; package manifest. No other implementation files are authorized.

## Dependencies and RED-First Plan

1. **RED — tests (owners: four test files).** Add or retain failing focused assertions before implementation verification: closed `AUTO_REFINE` mappings (Architecture Review → Design Refinement; Tasks Review → Tasks Refinement), fresh-review PASS edges, cross-layer and unmapped sources, exhausted refinement/retry budgets, selector-owned `FATAL_INVARIANT`/HUMAN terminal materialization, and resume checkpoint preservation. Keep taxonomy, `human_required`, and budget assertions explicit.
2. **GREEN — runtime (owner: `scripts/sdd-runtime.mjs`).** Verify the immutable review-action map, `fatalInvariantHandoff(reason)`, legal checkpoint comparison, bounded budgets, canonical PASS edges, and fail-closed selector behavior. Do not add inference, exception recovery, or alter blocker policy.
3. **GREEN — command (owner: `package.json`).** Verify `test:sdd-runtime` invokes runtime, integration, e2e, and resume suites exactly once; retain the completeness assertion.
4. **REFACTOR/REGRESSION — all owned tests.** Run the complete command once, then run governance/design validators. Preserve unrelated baseline debt and do not edit protected change evidence.

## Acceptance Criteria and Evidence

- [x] Unit evidence proves both mappings, Design Refinement → fresh Architecture Review, Tasks Refinement → fresh Tasks Review, canonical PASS edges, and FATAL/HUMAN results for cross-layer, unmapped, and exhausted cases.
- [x] Integration/e2e evidence proves dispatch materializes the selector result, preserves blocker taxonomy/`human_required`/budgets, and does not infer phases.
- [x] Resume evidence preserves the legal checkpoint and stops on corrupt runtime state.
- [x] `pnpm test:sdd-runtime` passes with all four suites named once; `pnpm sdd:validate:design -- openspec/changes/sdd-architecture-refinement-transition/design.md` and `pnpm sdd:validate` pass.
- [x] Tenant isolation evidence: N/A; no tenant data, product code, API, auth, Prisma, or authorization path is in scope.

## Checkpoints and Boundaries

Checkpoint A: RED tests fail for each named boundary. Checkpoint B: bounded runtime/package changes pass focused tests. Checkpoint C: complete command and validators pass; return `Tasks Review`. Never modify workflow, model map, template, CRM product code, `.sdd-runtime/state.json`, or `openspec/changes/sdd-autonomous-runtime-smoke-v2/`; no Git operations.
