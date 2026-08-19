# Apply Progress: sdd-autonomous-runtime

> **Nested work:** 7.1 Foundation, 7.2 Core Engine, 7.3 Feature Implementation, 7.4 Integration, 7.5 Testing, and 7.6 Apply Summary
> **Delivery:** PR3, force-chained / stacked-to-main (`PR2` → `PR3`)
> **Mode:** Strict TDD
> **Persistence:** hybrid

## Completed

- [x] 7.1 Foundation — runtime contract/schema primitives, identity and scope
  validation, blocker policy, route selection, canonical hashing/fingerprints,
  trace/state validation and reconciliation foundations, and atomic JSON writes.
- [x] 7.2 Core Engine — canonical workflow projection and legal-next-action
  selection, bounded attempts, cold reconstruction, duplicate outcome handling,
  event-first trace/state persistence, dispatch safety, and Git mutation barrier.
- [x] 7.3 Feature Implementation — fail-closed outcome handling, policy routing,
  fallback/exhaustion, context counters, standing workload policy, terminal
  dispatch safety, and legacy cold-recovery compatibility.
- [x] 7.4 Integration — runtime-aware Resume recovery, Direct/Resume bootstrap
  and autonomous-dispatch wiring, structured phase-agent outcome contracts,
  routing metadata, validator checks, and focused package entry point.
- [x] 7.5 Testing — integration/E2E/regression coverage for AC-01 through AC-15,
  temporary event/state interruption recovery, local wiring and Git barriers,
  full simulated terminal handoff, validator regression, and infrastructure
  evidence documentation.
- [x] 7.6 Apply Summary — consolidated nested Apply evidence in
  `openspec/changes/sdd-autonomous-runtime/apply-summary.md`, including Working
  Set metrics, slice rollback boundaries, AC-01–AC-15 evidence, harness and
  generated-output classification, tenant/product N/A proof, and Verify handoff.

## TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 7.1 | `scripts/sdd-runtime.test.mjs` | Unit | N/A (new files) | ✅ import/contract tests failed before runtime existed | ✅ 8/8 passing | ✅ identity, blocker, routing, trace, outcome, atomic-write and fingerprint cases | ✅ shared validators/constants and canonical hash helpers; 8/8 remained passing |
| 7.2 | `scripts/sdd-runtime.test.mjs` | Unit + temporary filesystem | ✅ 8/8 from 7.1 | ✅ missing core exports before implementation | ✅ 15/15 passing | ✅ legal transitions, recovery ambiguity, budgets, duplicates, Git barrier, trace gaps/state-ahead, event persistence | ✅ centralized projection, recovery, dispatch, and event-first persistence helpers; 15/15 remained passing |
| 7.3 | `scripts/sdd-runtime.test.mjs` | Unit + temporary filesystem | ✅ 15/15 from 7.2 | ✅ missing feature exports before implementation | ✅ 21/21 passing | ✅ malformed/fatal outcomes, fallback/exhaustion, context counters, workload exception, full terminal dispatch, legacy recovery | ✅ fixed Tasks Review → Workload Guard projection and terminal Repository Ready checkpoint; 21/21 remained passing |
| 7.4 | `scripts/sdd-resume.test.mjs` | Unit + temporary filesystem/wiring | ✅ 9/9 and validator PASS before changes | ✅ runtime-state/wiring assertions failed before integration | ✅ 12/12 Resume tests and validator PASS | ✅ valid/corrupt runtime state, command boundaries, runtime regression | ✅ centralized Resume state validation and validator runtime checks; runtime suite 21/21 remained passing |
| 7.5 | `scripts/sdd-runtime.integration.test.mjs`, `scripts/sdd-runtime.e2e.test.mjs`, `scripts/sdd-resume.test.mjs` | Integration + E2E + regression | ✅ PR2 gates PASS | ✅ missing integration/E2E files; then event-only reconciliation exposed stale cursor materialization | ✅ 32 combined runtime tests, 21 unit, 11 integration, 7 E2E, 12 Resume, validators PASS | ✅ AC-01–AC-15, HUMAN classes, recovery, fallback, workload, scope, Git/legacy boundaries | ✅ reconciliation now materializes event cursor from immutable event metadata; all suites remained green |
| 7.6 | `openspec/changes/sdd-autonomous-runtime/apply-summary.md` | Evidence artifact | ✅ 7.1–7.5 evidence re-read | ➖ Not applicable — consolidation only | ✅ Summary artifact re-read; all required evidence present | ✅ Metrics, boundaries, AC map, harness, N/A, and no-Git evidence reconciled | ➖ No implementation refactor |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused command | Prior bounded gates preserved: unit 21/21, integration/E2E 18/18, Resume 12/12, `pnpm sdd:validate` PASS, and Design validator PASS; summary re-read successfully |
| Runtime harness | N/A — summary consolidates deterministic tests and temporary filesystem resources; no external harness or canonical generated output was required |
| Rollback boundary | 7.6 is evidence-only; revert `apply-summary.md` and its progress record without changing PR1–PR3 implementation behavior |
| Tenant isolation | N/A — the approved Working Set contains no product, tenant, query, or Prisma path; no tenant behavior was changed |

## Scope / deviations

- Working Set check: PR3 integration/E2E/regression/documentation files only; no product
  source, workflow authority, Design, Tasks, Workload Guard, fixture directory, archive,
  unrelated change, or generated canonical state/trace output was touched.
- Deviations from approved scope/design: None. Mechanical correction recorded:
  validator Git-prohibition matching was made whitespace-tolerant to accommodate the
  approved command text wrapping; no semantic boundary changed. During 7.5, trace
  reconciliation was corrected to materialize the immutable event's cursor/hash chain
  during the one-event recovery gap; this remains within the approved runtime contract.
- Blockers: None for 7.1–7.6. Workload approval is consumed from the explicit HUMAN
  instruction; no Size Exception is claimed.

## Canonical next action

Canonical next action: **Verify**, owned by an independent HIGH executor. Do not
launch Verify from this Apply executor.

## Orchestrator-owned Direct Fix after Verify BLOCKED

This is the single canonical Verify correction retry, not a new Apply slice.
The correction budget used is **1 of 1**; the prior 7.1–7.6 entries above are
preserved unchanged. Scope was limited to VR-01 and VR-02 from the blocked HIGH
Verify report.

| Blocker | RED evidence | GREEN evidence | Correction |
|---|---|---|---|
| VR-01 | Added cross-role PASS fixtures for HIGH-owned Design, MID-owned Tasks, and LOW-owned Archive; `validateOutcomePacket`/transition assertions failed before the boundary check. | `pnpm test:sdd-runtime`: 22/22 passed; canonical-role acceptance and all three cross-role rejections pass. | `validateOutcomePacket()` now requires `role === PHASE_ROLES[action]`; existing Design fixtures now use HIGH and full lifecycle fixtures use canonical HIGH/MID/LOW roles. |
| VR-02 | Added configured-map integration test; import/binding was RED before `resolveConfiguredRoute`, and empty fallback with unavailable primary is asserted fail-closed. | `node --test scripts/sdd-runtime.integration.test.mjs scripts/sdd-runtime.e2e.test.mjs`: 12/12 passed; actual `.opencode/sdd-model-map.json` metadata selects `low-evidence-fallback` when the cloned configured primary is unavailable and rejects empty fallback exhaustion. | Added LOW primary/fallback metadata and `resolveConfiguredRoute()` that builds records from model-map routing and delegates to `resolveRoute()`; same-role capability/quality/cost ordering and STOP-on-exhaustion remain intact. |

### Direct Fix evidence

- Exact implementation files: `scripts/sdd-runtime.mjs`, `.opencode/sdd-model-map.json`.
- Exact test files: `scripts/sdd-runtime.test.mjs`,
  `scripts/sdd-runtime.integration.test.mjs`,
  `scripts/sdd-runtime.e2e.test.mjs` (fixture role corrections only).
- Configured LOW identities use the existing `longcat/LongCat-2.0` model and
  project-local `sdd-direct-archive` executor. Availability simulation clones
  actual metadata in memory; no provider availability is fabricated.
- Tenant isolation: N/A; no product, tenant, Prisma, or data-access path is in
  the approved Working Set or this correction.
- No Design, Tasks, workflow, Workload Guard, archive, global file, product
  source, or Git lifecycle operation was changed.

### Required command evidence after Direct Fix

| Command | Exact result |
|---|---|
| `pnpm test:sdd-runtime` | PASS — 22 tests passed, 0 failed |
| `node --test scripts/sdd-runtime.integration.test.mjs scripts/sdd-runtime.e2e.test.mjs` | PASS — 12 tests passed, 0 failed (5 integration, 7 E2E) |
| `pnpm test:sdd-resume` | PASS — 12 tests passed, 0 failed |
| `pnpm sdd:validate` | PASS — `CRM-SDD governance validation: PASS` |
| `pnpm sdd:validate:design -- openspec/changes/sdd-autonomous-runtime/design.md` | PASS — `Enterprise Design validation: PASS` |

### Direct Fix rollback boundary

Revert only the canonical-role validation and its inline fixture updates, plus
the configured LOW routing metadata and binding helper/tests. This restores the
pre-fix implementation while leaving all unrelated prior 7.1–7.6 work intact.

## AC-01–AC-15 Evidence

| AC | Evidence in 7.5 |
|---|---|
| AC-01 | E2E one-invocation test reaches Repository Ready with 15 executor calls and one HUMAN handoff |
| AC-02 | Integration context reuse test: bootstrap count 1, normal phase count 0, no bodies |
| AC-03 | Unit legal-transition test and deterministic E2E dispatch; no LLM/executor selection dependency |
| AC-04 | Integration event-only interruption reconciliation and E2E recovery checkpoint |
| AC-05 | E2E generic recovery continues from Apply 7.1 to terminal handoff |
| AC-06 | E2E separately exercises HUMAN_ARCHITECTURE, HUMAN_SECURITY, HUMAN_SCOPE, HUMAN_GIT with zero executor calls |
| AC-07 | E2E AUTO_RETRY completes within bounded policy without HUMAN |
| AC-08 | Context packet references/counters prove no repeated bootstrap bodies |
| AC-09 | Integration LOW route preserves same role and cost/quality constraints |
| AC-10 | Integration LOW unavailable primary selects compatible fallback; exhaustion blocks |
| AC-11 | E2E standing chained workload passes; true exception returns HUMAN_HANDOFF |
| AC-12 | Integration Git barrier rejects mutation/direct-to-main requests before subprocess |
| AC-13 | E2E foreign change scope fails closed |
| AC-14 | E2E corrupt/ambiguous/unsafe state fails closed; integration trace gap recovery is bounded |
| AC-15 | `pnpm sdd:validate`, Design validator, Resume regression, and local STOP-boundary assertions pass |
