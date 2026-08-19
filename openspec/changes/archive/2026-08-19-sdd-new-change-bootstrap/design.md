# Design: sdd-new-change-bootstrap — Deterministic Missing-Change Bootstrap

> **Status:** Draft
> **Scope:** Project-local CRM-SDD runtime bootstrap only. Lifecycle semantics remain in `docs/SDD-WORKFLOW.md`.

## 1. Executive Summary

`/sdd-direct <new-change>` currently cannot reliably start when its canonical change directory does not exist. Add one fail-closed runtime bootstrap operation that creates the canonical directory and READY state only for a validated, previously absent change. The orchestrator will invoke that operation before dispatch, so the first legal checkpoint is Design; existing state provenance is only validated and reused, never overwritten.

## 2. Technical Approach

Extend the project-local runtime with an explicit missing-change bootstrap API, rather than making the command or an agent invent filesystem state. It validates identity and required fingerprints, exclusively creates `openspec/changes/<change>`, then exclusively publishes the schema-v2 initial state (`READY`, sequence 0, `next: Design`).

The Direct orchestrator will call this runtime API after governance validation and before recovery/dispatch. A pre-existing directory is recovery evidence: a matching valid state is reused; an absent, foreign, corrupt, or inconsistent state blocks without writing. This preserves the single canonical artifact store and existing event-first provenance rules.

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
| --- | --- | --- | --- |
| Bootstrap owner | Agent prompt; command; runtime | `scripts/sdd-runtime.mjs` | The runtime already owns identity, initial state shape, and atomic/exclusive persistence; prompts cannot make a race-safe contract. |
| Existing directory | Reinitialize; create missing state; validate/reuse or block | Validate/reuse only valid matching state; otherwise block | Prevents overwriting user work, legacy artifacts, and recovered state provenance. |
| Initial checkpoint | Infer from files; hard-code in command; `buildInitialState` | `buildInitialState` | It already creates the canonical START checkpoint and validates fingerprints. |

## 4. Data Flow

```text
/sdd-direct <change>
  -> governance validation / fingerprints
  -> runtime bootstrap
       -> absent canonical directory: exclusive mkdir + exclusive state write
       -> existing directory: validate matching state or BLOCKED
  -> recovered READY checkpoint (next: Design)
  -> HIGH Design executor
```

On a create collision, reread only the canonical state: return the same valid state if another actor completed bootstrap; otherwise return a provenance blocker. No trace event is created before a phase outcome.

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | `scripts/sdd-runtime.mjs` | Modify | Add validated, exclusive missing-change bootstrap and explicit non-overwrite outcomes. |
| 2 | `scripts/sdd-runtime.test.mjs` | Modify | RED/GREEN unit coverage for creation, idempotent reuse, and fail-closed conflicts. |
| 3 | `.opencode/agents/sdd-direct-orchestrator.md` | Modify | Require runtime bootstrap before recovery/dispatch and require failure to stop. |

### 5.2 Secondary Files

| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | `scripts/sdd-runtime.integration.test.mjs` | Modify | Prove a fresh canonical path receives only READY state and concurrent/pre-existing evidence is not overwritten. |

### 5.3 Expected NOT to Change

- `docs/SDD-WORKFLOW.md` — semantic lifecycle and START → Design edge are already canonical.
- `docs/templates/design-enterprise-template.md` — artifact shape is unrelated.
- `.opencode/commands/sdd-direct.md` — it already requires validated runtime bootstrap; no second adapter policy is needed.
- `scripts/validate-sdd-direct.mjs` and `.opencode/sdd-model-map.json` — governance/model bindings are immutable scope evidence, not bootstrap implementation.
- `openspec/changes/sdd-new-change-bootstrap/.sdd-runtime/state.json` — recovered provenance; Design must not rewrite it.
- `openspec/changes/SPEC-0028-jobs-background-processing-platform/` — protected unrelated user work.

## 6. Read Order

1. `scripts/sdd-runtime.mjs` — reuse identity, state, and exclusive-write primitives.
2. `scripts/sdd-runtime.test.mjs` — extend existing runtime contract style.
3. `scripts/sdd-runtime.integration.test.mjs` — add filesystem-level proof without repository mutation.
4. `.opencode/agents/sdd-direct-orchestrator.md` — bind the existing local dispatch sequence to the new API.
5. `docs/SDD-WORKFLOW.md` — reconfirm the resulting checkpoint remains Design.

## 7. Expected Commands

```bash
pnpm sdd:validate                                      # governance wiring remains valid
pnpm sdd:validate:design -- openspec/changes/sdd-new-change-bootstrap/design.md  # Design pre-gate
node --test scripts/sdd-runtime.test.mjs                # runtime unit contract
node --test scripts/sdd-runtime.integration.test.mjs    # isolated filesystem bootstrap contract
```

## 8. Design Confidence

**Confidence:** High

The runtime already supplies validated identity, `buildInitialState`, exclusive JSON publication, and tests with disposable directories. The bounded missing fact is only the absent-directory branch; no product, schema, routing-provider, or lifecycle change is required.

## 9. Exploration Budget

| Resource | Budget | Notes |
| --- | --- | --- |
| Repo searches | 3 | Runtime call sites and test coverage only. |
| Files to read | 5 | The Read Order only. |
| Files to create | 0 | Tests remain in established files. |
| Files to modify | 4 | Exact Working Set; no deviation without recorded proof. |

## 10. Risks

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Concurrent bootstrap races | Med | High | Use exclusive directory/state creation; validate winner state before reuse. |
| Existing user/legacy directory is mistaken for new | Low | High | Never initialize an already-existing directory without a valid matching state; return BLOCKED evidence. |
| Prompt bypasses runtime API | Low | Med | Make orchestrator instruction explicit and cover its required ordering in governance evidence. |

## 11. Testing Strategy

| Layer | Focus | Approach |
| --- | --- | --- |
| Unit | Valid identity and absent path | RED test: bootstrap returns schema-v2 READY state with `next: Design`. |
| Unit | Idempotency/provenance | RED tests: valid matching state is reused; corrupt, foreign, or state-missing existing directory rejects without mutation. |
| Integration | Filesystem race boundary | Disposable root: competing/bootstrap-preexisting path yields one state and no replacement; no trace is emitted. |
| Regression | Direct governance | Run `pnpm sdd:validate`; existing runtime and resume tests remain unchanged. |

## 12. Doorbell Tests

| Test file | What it proves |
| --- | --- |
| N/A | No tenant, client, database, HTTP, or authorization boundary is changed. |

## 13. Required ADRs

| ADR | Reason | Status |
| --- | --- | --- |
| None | This implements the existing runtime persistence boundary; no schema or material product architecture decision changes. | Not required |

## 14. Boundaries

| Boundary | Owner | Purpose |
| --- | --- | --- |
| Initial state creation | `scripts/sdd-runtime.mjs` | Validate identity/fingerprints and safely create or reuse canonical state. |
| Dispatch ordering | `sdd-direct-orchestrator` | Invoke bootstrap before recovery, then delegate only the canonical next action. |
| Lifecycle legality | `docs/SDD-WORKFLOW.md` | Remains external semantic authority; bootstrap cannot choose another phase. |

## 15. Extensibility

| Future feature | How it fits | Effort |
| --- | --- | --- |
| Additional bootstrap evidence | Add validated fields to a versioned runtime schema and migration tests, without a new store. | Days |
| Recovery diagnostics | Return structured provenance reasons from the same bootstrap result; no lifecycle changes. | Days |

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor | 10× | 100× | Mitigation |
| --- | --- | --- | --- |
| Storage | One small state/change | Linear small metadata | One state file only; no duplicate store. |
| Query latency | Local stat/read | Local stat/read | Bounded canonical path access. |
| Write throughput | Independent directories | Independent directories | Exclusive per-change creation. |
| Memory | Constant | Constant | Stream no artifact inventory. |

**Decision:** Per-change local bootstrap with no global index.

**Rationale:** Canonical paths isolate creation and preserve bounded recovery.

**Alternative:** Central registry; rejected as a second state store.

**Future impact:** Parallel new changes remain independent.

### B. Open/Closed Principle (OCP)

**Point of extension:** Runtime bootstrap result and schema-versioned state validation.

**What must change to add one more:** Add an explicit validated field/migration test in the runtime, not a command-specific branch.

**Decision:** One runtime API is the extension point.

**Rationale:** Adapter callers remain unchanged as persistence detail evolves.

**Alternative:** Duplicate filesystem logic in each command; rejected.

**Future impact:** Resume and Direct can share future bootstrap evidence.

### C. Ownership

| Data / Capability | Owner | Consumers |
| --- | --- | --- |
| Change-local READY state | Runtime | Direct orchestrator, resume recovery |
| Lifecycle transition meaning | Canonical workflow | Runtime projection, all adapters |

**Decision:** Runtime owns state materialization; workflow owns meaning.

**Rationale:** Separates mechanical persistence from semantic authority.

**Alternative:** Agent-owned state; rejected as non-deterministic.

**Future impact:** Auditable recovery without authority drift.

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
| --- | --- | --- | --- |
| READY state | Active change lifetime | Existing Archive phase policy | Never by bootstrap |

**Decision:** Bootstrap adds no retention behavior.

**Rationale:** State is existing canonical artifact metadata.

**Alternative:** Central transient cache; rejected as a second store.

**Future impact:** Archive remains the only retention transition.

### E. Idempotency

| Operation | Duplicate risk | Protection | Fallback |
| --- | --- | --- | --- |
| Bootstrap change | Concurrent/repeated invocation | Exclusive create plus matching-state validation | Reuse exact valid state; otherwise BLOCKED |

**Decision:** Idempotency is state-equivalence, never replacement.

**Rationale:** It preserves recovered provenance and user work.

**Alternative:** Atomic overwrite; rejected.

**Future impact:** Safe retries after adapter interruption.

### F. Shared Contracts

| Contract | Location | Consumers | Producers |
| --- | --- | --- | --- |
| Bootstrap result/state | `scripts/sdd-runtime.mjs` | Direct orchestrator/tests | Runtime |

**Decision:** Export a typed/structured runtime contract only.

**Rationale:** No frontend/backend or API contract exists.

**Alternative:** Markdown-only convention; rejected as untestable.

**Future impact:** Other local adapters can consume the same contract.

### G. Partitioning Strategy

| Dimension | Risk | Strategy |
| --- | --- | --- |
| Tenant | None | N/A: governance metadata has no tenant data. |
| Time | Low | Archive policy owns historical movement. |
| Volume | Low | One bounded state per change directory. |

**Decision:** Partition by canonical change directory only.

**Rationale:** Matches active artifact-store isolation.

**Alternative:** Date/global partitions; rejected as unnecessary.

**Future impact:** No destructive migration is anticipated.

## 16. Interfaces / Contracts

```typescript
export interface BootstrapChangeResult {
  changePath: string;
  state: RuntimeState;
  disposition: 'CREATED' | 'REUSED';
}

// Preconditions: validated change identity and workflow/modelMap/config hashes.
// CREATED only when the canonical change directory was absent.
// REUSED only when its existing state validates and matches the identity.
// Any existing directory without matching valid state throws a provenance error;
// it must not write state, trace, or artifacts.
export async function bootstrapChange(input: {
  root: string;
  change: string;
  fingerprints: RuntimeFingerprints;
}): Promise<BootstrapChangeResult>;
```

The resulting state must equal `buildInitialState(input)`: schema 2, `READY`, sequence 0, no attempts, empty artifact fingerprints, and checkpoint `{ phase: null, artifact: null, verdict: null, next: 'Design' }`. No CLI/API, database, or shared package contract is added.

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
| --- | --- | --- | --- |
| 1 | Add RED tests, then runtime bootstrap and orchestrator ordering. | Incorrect reuse classification | Revert code only; existing state is never modified. |
| 2 | Run runtime/integration and governance validators. | Environment test failure | Preserve evidence; no generated state cleanup by this change. |

No data migration, feature flag, deployment ordering, or backfill is required.

## 18. Open Questions

| # | Question | Status | Resolution |
| --- | --- | --- | --- |
| 1 | Should an existing directory with no state be initialized? | Resolved | No. It is legacy/user provenance and must block for bounded recovery rather than be overwritten. |
| 2 | Does bootstrap emit a trace event? | Resolved | No. Trace starts with a phase outcome; START state remains sequence 0. |
