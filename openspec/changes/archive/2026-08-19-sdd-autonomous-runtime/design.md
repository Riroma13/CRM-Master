---
classification: CHANGE DESIGN
semantic_authority: false
status: Draft
---

# Design: sdd-autonomous-runtime — Autonomous CRM-SDD Runtime

> **Status:** Draft
> **Working document.** It does not change SDD semantics; `docs/SDD-WORKFLOW.md` remains authoritative.

---

## 1. Executive Summary

The current Direct entry is local and safe, but its command and agent prompts require the orchestrator to infer checkpoints from artifacts and to stop after each executor result. The repository proves a second, partial checkpoint reader in `scripts/sdd-resume.mjs`, fixed provider bindings in `.opencode/sdd-model-map.json`, manual disposable-test setup in historical change evidence, and no typed runtime state or machine dispatcher. This change adds one small, repository-local execution runtime: a typed, reconstructible state record inside the canonical change directory, pure transition/recovery functions, and explicit autonomous dispatch instructions. It progresses one approved change through all non-HUMAN canonical actions while preserving fail-closed recovery, evidence, hybrid mirroring, and every Git boundary.

## 2. Technical Approach

Create `scripts/sdd-runtime.mjs` as the sole mechanical runtime for identity validation, artifact fingerprinting, cold reconstruction, warm-state validation, transition selection, retry accounting, capability routing, and change-local append-only transition-event files. Its materialized state lives only at `openspec/changes/<change-name>/.sdd-runtime/state.json`; immutable trace events live at `openspec/changes/<change-name>/.sdd-runtime/trace/<sequence>-<eventHash>.json`. Both are metadata within the canonical artifact store, not another Design or lifecycle authority. The orchestrator remains responsible for invoking the local agent selected by the model map and for mirroring bounded evidence through the existing hybrid contract.

The runtime consumes—not duplicates—the canonical workflow: phase names, roles, legal verdict handling, correction budgets, and terminal handoff are read from the workflow at execution time and represented as constrained inputs. The implementation makes deterministic work mechanical (checkpoint selection, compatibility, fingerprints, budget, command arguments) and reserves LLM calls for phase judgment. It is correctness-first: stop on absent, conflicting, stale, unprovable, or unauthorized state; do not substitute models silently; never invoke Git mutation.

CURRENT → TARGET path: `/sdd-direct` prompt → MID agent prompt → artifact scan/inferred next → local phase prompt → forced return → human restart; `/sdd-resume` separately scans files with optional injected persisted state. TARGET: `/sdd-direct` → validated runtime bootstrap → state reconstruct/validate → eligible local executor dispatch → atomic outcome checkpoint → next eligible dispatch, ending only at a canonical BLOCKED/HUMAN decision or Repository Ready handoff. Archive, Health Report, and Repository Ready remain local LOW actions and retain their current artifact templates.

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
| --- | --- | --- | --- |
| Runtime shape | Prompt-only correction; larger service/DB; small explicit state machine | Small script plus change-local state | It eliminates duplicated checkpoint inference without adding a daemon, external database, or competing artifact store. |
| State authority | Artifact-name scan; external/Engram state; change-local typed state + artifact fingerprints | Change-local state, reconstructible from artifacts | `sdd-resume.mjs` proves file scan and optional persisted state can diverge. State is a cache; fingerprints and reconstruction fail closed. |
| Routing | Fixed provider; arbitrary fallback; capability/authority/cost ordered fallback | Ordered compatible fallback | The model map proves fixed providers and prior LOW availability failure exists in repository history. Fallback must preserve role/quality and record evidence. |
| Automation boundary | Stop after every phase; autonomous through Git; autonomous non-HUMAN phases | Autonomous through Repository Ready only | Canonical role map makes Commit/Push/Merge HUMAN and command explicitly forbids Git operations. |
| Chained PR policy | Per-change judgment; always split; standing policy with exceptions | Enforce existing force-chained / 400 review budget | `openspec/config.yaml` requires force-chained stacked-to-main. Unknown dependency/order or over-budget exception stops for HUMAN, never silently weakens it. |

## 4. Data Flow

```
human /sdd-direct <change>
          │ validated name + canonical workflow/config fingerprints
          v
runtime bootstrap ──> change/.sdd-runtime/{state.json,trace/} ──> local executor
     │                         │                              │
      └─cold artifact rebuild───┴─event-first trace/state reconciliation──┘
                                                     │
                       PASS / bounded refinement / blocker / HUMAN handoff
                                                     v
                    archive → health → repository-ready → MAINTAINER
```

Warm execution validates state version, change path, workflow/model-map/config fingerprints, last artifact hash, role, budget, and trace sequence before dispatch. Cold recovery scans only the canonical change directory in canonical artifact order, derives the last provable checkpoint, writes no state until reconciliation succeeds, then writes an atomic replacement. A mismatch between OpenSpec artifacts, cached state, or hybrid mirror is `BLOCKED` with exact paths; it is never resolved by an LLM guess. Each phase receives a context packet: immutable authority pointers, declared Working Set/Read Order, current approved artifacts, bounded state, and fresh file fingerprints. Packets invalidate when any approved input fingerprint or state epoch changes; raw global bootstrap documents are referenced, not repeatedly injected.

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | `scripts/sdd-runtime.mjs` | Create | Pure state, recovery, transition, routing, fingerprint, trace, and atomic-write mechanics. |
| 2 | `scripts/sdd-runtime.test.mjs` | Create | Node tests for reconstruction, ambiguity, budgets, fallback, idempotency, and no-loop behavior. |
| 3 | `scripts/sdd-runtime.integration.test.mjs` | Create | Temporary-change wiring tests for Direct/Resume, context packets, trace/state reconciliation, and Git barriers. |
| 4 | `scripts/sdd-runtime.e2e.test.mjs` | Create | Deterministic executor-fixture lifecycle tests from one instruction to Repository Ready/HUMAN handoff. |
| 5 | `.opencode/agents/sdd-direct-orchestrator.md` | Modify | Require bootstrap, automatic legal dispatch, state checkpoints, and canonical stop behavior. |
| 6 | `.opencode/sdd-model-map.json` | Modify | Add versioned capability/quality/cost/fallback metadata without changing canonical role ownership. |
| 7 | `scripts/sdd-resume.mjs` | Modify | Delegate resolution/checkpoint recovery to the single runtime and validate state before filesystem fallback. |
| 8 | `scripts/sdd-resume.test.mjs` | Modify | Cover state-aware resume, legacy reconstruction, ambiguity, and archived exclusion. |
| 9 | `scripts/validate-sdd-direct.mjs` | Modify | Mechanically validate runtime wiring, trace locality/integrity, fallback constraints, and Git prohibitions. |

### 5.2 Secondary Files

| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | `.opencode/commands/sdd-direct.md` | Modify | Describe one-instruction autonomous dispatch and state bootstrap. |
| 2 | `.opencode/commands/sdd-resume.md` | Modify | Preserve thin resolver UX while using the runtime; migrate legacy active changes safely. |
| 3 | `.opencode/agents/sdd-direct-{design,architecture-review,tasks,tasks-review,apply,verify,archive,health-report,repository-ready}.md` | Modify | Require structured, idempotent outcome packets and no forced stop when the next canonical action is non-HUMAN. |
| 4 | `docs/architecture/sdd-infrastructure.md` | Modify | Document mechanical runtime, trace fields, state location, and baseline limits without lifecycle semantics. |
| 5 | `package.json` | Modify | Add focused runtime test script only. |
| 6 | `openspec/changes/sdd-autonomous-runtime/.sdd-runtime/state.json` | Create at execution | Per-change generated materialization; never authored as a Design artifact. |
| 7 | `openspec/changes/sdd-autonomous-runtime/.sdd-runtime/trace/<sequence>-<eventHash>.json` | Create at execution | One immutable, atomic transition event per canonical transition; never a lifecycle authority. |

### 5.3 Expected NOT to Change

- `docs/SDD-WORKFLOW.md` — remains the sole lifecycle authority throughout migration.
- `AGENTS.md`, `docs/templates/design-enterprise-template.md`, and global OpenCode/Gentle files — authority/template/global isolation are out of scope.
- Product source, Prisma schema, `docker-compose.yml`, and production infrastructure — this is internal governance runtime only.
- `openspec/changes/archive/**` — archived evidence stays immutable.

## 6. Read Order

1. `docs/SDD-WORKFLOW.md` — implementation must consume its legal actions, correction budget, and HUMAN terminal boundary without restating them.
2. `scripts/sdd-resume.mjs` and `scripts/sdd-resume.test.mjs` — replace existing duplicate checkpoint logic while preserving resolver precedence.
3. `.opencode/commands/sdd-direct.md` and `sdd-resume.md` — preserve entry and migration UX.
4. `.opencode/agents/sdd-direct-orchestrator.md` then phase agents — wire state packets and autonomous dispatch without changing phase responsibilities.
5. `.opencode/sdd-model-map.json` and `opencode.json` — retain role authority, local isolation, and legacy STOP stubs.
6. `scripts/validate-sdd-direct.mjs`, `scripts/validate-enterprise-design.mjs`, and `docs/architecture/sdd-infrastructure.md` — extend mechanical proof and evidence vocabulary.
7. `openspec/config.yaml`, `docker-compose.yml`, and cited archived disposable-test evidence — enforce chained PR and test-harness constraints.

## 7. Expected Commands

```bash
node --test scripts/sdd-runtime.test.mjs scripts/sdd-runtime.integration.test.mjs scripts/sdd-runtime.e2e.test.mjs # runtime contracts
pnpm test:sdd-resume                                    # resolver regression tests
pnpm sdd:validate                                       # Direct wiring/governance check
pnpm sdd:validate:design -- openspec/changes/sdd-autonomous-runtime/design.md  # Design shape
pnpm --filter api test:e2e --runInBand -- <focused-suite> # only when an existing doorbell suite is selected
```

No build, Prisma generation, migration, deployment, or Git command is expected. Disposable PostgreSQL/Redis/pgvector use is conditional: current `docker-compose.yml` provides persistent Postgres/Redis only; past change evidence proves manually provisioned `pgvector/pgvector:pg16` and `redis:7-alpine` on dedicated ports. The runtime must declare a disposable harness only when a selected existing test needs it, provision unique names/ports/database, health-check, capture versions, run serially, and cleanup in `finally`; unavailable Docker/image/port is a classified infrastructure blocker, not a skipped security test.

## 8. Design Confidence

**Confidence:** High

The Working Set covers the proven command, resolver, local executor, map, validator, infrastructure, and test entry points. It intentionally does not claim an existing generic dispatcher or disposable-harness source file: repository evidence proves only manual historical packets, so their first reusable implementation is scoped to the new runtime and its tests.

## 9. Exploration Budget

| Resource | Budget | Notes |
| --- | --- | --- |
| Repo searches | 8 | Only runtime references, commands, tests, containers, and validator invariants. |
| Files to read | 26 | Working Set plus canonical workflow and cited test evidence; no product audit. |
| Files to create | 5 | Runtime, unit/integration/E2E tests, and generated state/trace assets as needed. |
| Files to modify | 16 | Seven primary modifications plus bounded command/agent/docs/package changes. |

## 10. Risks

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Cached state conflicts with artifacts/hybrid mirror | Med | High | Fingerprint all inputs; cold rebuild; BLOCKED on unresolved divergence. |
| Autonomy loops or repeats destructive work | Med | High | Monotonic sequence, idempotency keys, per-transition attempt caps, terminal blocker state. |
| Event/state interruption or conflicting trace | Med | High | Publish immutable event first, materialize state second, then reconcile only a provable one-event gap; duplicate or conflicting keys/sequences BLOCK. |
| Provider outage lowers review quality | Med | High | Role/capability minimums, ordered compatible fallback, recorded resolution; otherwise BLOCKED. |
| Prompt injection or arbitrary command path | Low | High | Validate change/path/agent IDs; structured packets; no shell interpolation; allowlisted commands only. |
| Forced chained-PR policy cannot be met | Med | Med | Compute forecast before Apply; stop for HUMAN only on evidenced exception. |
| Disposable dependencies hide failed security test | Med | High | Explicit lifecycle evidence and BLOCKED classification; never convert unavailable harness to PASS. |

Threat matrix: documentation-like paths **N/A** (no executable-file classification); Git repository selection **Applicable** (canonical repository root only; invalid/relative escape blocks; RED tests); Commit state **Applicable** (runtime is read-only for Git and rejects any mutation request; staged/empty index tests); Push state **Applicable** (no push/ref resolution; all variants reject; tests); PR commands **Applicable** (standing chain plan is metadata only, no CLI invocation; composed/explicit forms reject; tests).

## 11. Testing Strategy

| Layer | Focus | Approach |
| --- | --- | --- |
| Unit | State schema, blocker class/boolean validation and routing, transition selection, trace event validation/reconciliation, fingerprints, retry/refinement limits, cost routing | `scripts/sdd-runtime.test.mjs`; RED fixtures for every blocker class, corrupt/gapped/conflicting traces, stale input, unavailable compatible model, and repeated result. |
| Integration | `/sdd-direct`/`/sdd-resume` wiring, local-agent allowlist, legacy STOP stubs, validator | `scripts/sdd-runtime.integration.test.mjs` temporary canonical changes plus `pnpm sdd:validate`; assert no external state path or Git subprocess mutation. |
| E2E | One simulated full non-HUMAN lifecycle with structured executor fixtures | `scripts/sdd-runtime.e2e.test.mjs` asserts Design → AR → bounded refinement → Tasks → review → guard → Apply 7.1–7.6 → Verify → Archive → Health → Ready and HUMAN stop. |
| Regression | Current resolver priorities and archive exclusion | Extend `sdd-resume.test.mjs`; active/archived/legacy state fixtures. |
| Performance | Bootstrap/recovery/dispatch overhead | Record baseline locally: no established runtime baseline exists; target ≤250 ms warm and ≤1 s cold for ≤25 artifacts excluding model/tool time. |

### Authoritative Acceptance Criteria

- AC-01 — Happy-path autonomy: Given an approved change with no material blocker, one initial invocation progresses automatically to Repository Ready without additional maintainer prompts. Target: 1 initial human instruction, 0 intermediate human interactions, 1 final HUMAN Git handoff.
- AC-02 — No phase-boundary bootstrap: Normal transitions inside one live execution do not reread the complete global bootstrap context.
- AC-03 — Deterministic transition selection: Selecting the next canonical phase does not require an LLM.
- AC-04 — Recovery: After simulated interruption, the generic recovery mechanism reconstructs the active change/checkpoint without requiring the maintainer to know the exact change name.
- AC-05 — Recovery resumes autonomy: After recovery, execution continues autonomously rather than requiring one resume command per phase.
- AC-06 — Human-on-exception: Synthetic `HUMAN_ARCHITECTURE`, `HUMAN_SECURITY`, `HUMAN_SCOPE`, and `HUMAN_GIT` blockers each stop safely for HUMAN.
- AC-07 — Recoverable blocker: A synthetic machine-recoverable blocker is handled automatically within policy and does not escalate to HUMAN.
- AC-08 — Context efficiency: Demonstrate that unchanged bootstrap/governance files are not repeatedly fed to the model between normal phases.
- AC-09 — Model efficiency: Deterministic orchestration uses no LLM. LOW work uses the cheapest compatible configured executor. HIGH remains HIGH where governance requires it.
- AC-10 — Provider resilience: Simulated LOW-provider quota/unavailability selects a compatible configured fallback without maintainer intervention.
- AC-11 — Standing policy: A Workload Guard case satisfying the approved chained-PR policy proceeds without HUMAN approval. A case requiring a true exception stops.
- AC-12 — Git safety: Autonomy always stops before unauthorized Commit/Push/Merge/Release/Deploy/Tag or direct-to-main mutation.
- AC-13 — Scope isolation: The runtime never silently mixes unrelated projects, branches, changes, or working sets.
- AC-14 — Fail closed: Ambiguous change resolution, corrupt checkpoint, conflicting governance, or unsafe state does not auto-continue.
- AC-15 — Regression: Existing SDD validation and legitimate governance gates remain effective.

| Criterion | Concrete runtime contract | Named test/fixture | Acceptance evidence |
| --- | --- | --- | --- |
| AC-01 | `dispatchUntilTerminal()` advances only legal non-HUMAN edges and emits `HUMAN_HANDOFF` at Repository Ready. | E2E `one-invocation-repository-ready` with `fixtures/runtime/happy-path/`. | Event chain contains every non-HUMAN transition; exactly one final handoff packet and zero prompt events. |
| AC-02 | `ContextPacket` carries authority references and fingerprinted approved inputs; normal transitions reuse the live packet. | Integration `live-dispatch-does-not-rebootstrap` with `fixtures/runtime/context-counts.json`. | Packet audit reports bootstrap reads once and phase-boundary global reads zero. |
| AC-03 | `selectNextTransition(state, outcome, workflowProjection)` is pure and never invokes an executor. | Unit `select-next-transition-is-pure`. | Instrumented executor-call count is zero before dispatch; expected edge is asserted. |
| AC-04 | `recoverActiveChange()` resolves one validated active change and reconstructs checkpoint from artifacts plus trace/state. | Integration `recover-without-change-name-after-interruption` with `fixtures/runtime/interrupted-active/`. | Recovered change/checkpoint and trace cursor equal the fixture's last provable event. |
| AC-05 | Recovered `READY` state is passed to `dispatchUntilTerminal()` without a per-phase resume command. | E2E `recovery-continues-to-terminal` with `fixtures/runtime/interrupted-happy-path/`. | One generic recovery invocation records the remaining legal events and final handoff. |
| AC-06 | Each of `HUMAN_ARCHITECTURE`, `HUMAN_SECURITY`, `HUMAN_SCOPE`, and `HUMAN_GIT` validates only with `human_required: true`, maps to `STOP/HUMAN_HANDOFF`, and prevents dispatch. `HUMAN_GIT` covers Repository Ready's final integration boundary and unauthorized Commit/Push/Merge/Rebase/Release/Deploy/Tag/direct-to-main operations. | Unit `human-blocker-classes-require-handoff` with four separate fixtures: `human-architecture.json`, `human-security.json`, `human-scope.json`, and `human-git.json`. | Each terminal state/event records its exact class and `human_required: true`; no subsequent executor call occurs. |
| AC-07 | Each machine-recoverable class validates only with `human_required: false` and enters only its mapped canonical retry/refinement/recovery policy within the existing budget. | E2E `recoverable-blocker-follows-class-policy` with `fixtures/runtime/recoverable-blockers/`. | Trace records the recognized class and bounded policy action, with no HUMAN packet. |
| AC-08 | Context audit stores only paths/fingerprints/read counters, never bootstrap bodies, in each event. | Integration `unchanged-governance-is-reference-only` with `fixtures/runtime/context-counts.json`. | Consecutive event `contextAudit` entries retain references and no repeated content/read count. |
| AC-09 | Pure orchestration has no LLM route; router preserves HIGH and chooses cheapest compatible LOW candidate. | Unit `role-and-cost-routing` with `fixtures/runtime/model-map-capabilities.json`. | Routing evidence lists zero deterministic LLM calls, configured/resolved role, and cheapest eligible LOW. |
| AC-10 | `resolveRoute()` tries ordered same-role compatible configured fallbacks on classified provider failure. | Integration `low-provider-fallback-without-maintainer` with `fixtures/runtime/low-quota-fallback/`. | Route event records rejected provider, reason, fallback, and zero HUMAN packet. |
| AC-11 | `evaluateWorkloadGuard()` applies approved chained-PR policy; true exception returns HUMAN stop. | Unit `workload-guard-standing-policy` with `fixtures/runtime/workload-guard.json`. | Passing fixture proceeds to Apply; exception fixture has a HUMAN evidence event. |
| AC-12 | Git mutation requests and direct-to-main targets are rejected before subprocess execution; Repository Ready is terminal for autonomy. | Integration `git-barrier-rejects-mutations` with `fixtures/runtime/git-requests.json`. | Spawn spy is empty; terminal event names the maintainer handoff. |
| AC-13 | Canonical root, change, branch, and Working Set fingerprints must match state/event/context. | Unit `scope-identity-mismatch-blocks` with `fixtures/runtime/foreign-scope.json`. | BLOCKED event contains mismatch paths; no foreign artifact or executor dispatch occurs. |
| AC-14 | Ambiguity, corrupt state/trace, governance fingerprint conflict, or unsafe state is fail-closed. | Unit `unsafe-reconciliation-blocks` with `fixtures/runtime/ambiguous-and-corrupt/`. | BLOCKED result includes exact cause; recovery writes neither a new state nor transition event. |
| AC-15 | Existing validator and normal gates remain mandatory inputs to dispatch. | Integration `validator-and-governance-regression`; existing `pnpm sdd:validate`. | Passing validator output plus fixtures proving blocked review/guard cannot advance. |

Additional deterministic blocker-contract tests in `scripts/sdd-runtime.test.mjs`: `blocker-class-policy-table-is-total-and-exclusive` covers every recognized class; `blocker-human-required-mismatch-fails-closed`, `unknown-or-missing-blocker-class-fails-closed`, and `malformed-blocker-fails-closed` reject before dispatch; and `fatal-invariant-never-auto-continues` verifies terminal `STOP/HUMAN_HANDOFF` with no retry, refinement, recovery, fallback, or executor call. Acceptance evidence is a terminal fail-closed event containing the validation cause, never an inferred route from `reason`.

Exact trace tests in `scripts/sdd-runtime.test.mjs`: `publish-event-before-state-recovers-one-gap` uses `fixtures/runtime/trace/event-only/`; `duplicate-identical-event-is-idempotent` uses `fixtures/runtime/trace/duplicate-identical/`; `duplicate-key-with-different-payload-blocks` uses `fixtures/runtime/trace/duplicate-conflict/`; `gapped-or-state-ahead-trace-blocks` uses `fixtures/runtime/trace/gap-and-state-ahead/`; and integration `resume-reconciles-event-state-after-interruption` proves the atomic recovery path with a temporary change directory. Each asserts cursor, event hash/chain, no duplicate dispatch, and zero write on an unsafe reconciliation.

## 12. Doorbell Tests

| Test file | What it proves |
| --- | --- |
| `scripts/sdd-runtime.test.mjs` | A foreign change path, forged artifact, incompatible fallback, duplicate outcome, or Git/PR request cannot cross the runtime boundary. |
| `scripts/sdd-runtime.integration.test.mjs` | Trace event/state writes are local, atomic, and reconciled after interruption; Direct/Resume do not rebootstrap normal phases. |
| `scripts/sdd-runtime.e2e.test.mjs` | Happy-path and recovered autonomous lifecycles reach Repository Ready once, while exception and policy cases stop correctly. |
| `scripts/sdd-resume.test.mjs` | Archived/completed changes and ambiguous active candidates are excluded or STOP, never guessed. |
| Existing focused API doorbell suite when selected | Disposable database/Redis lifecycle is real, isolated, serial, cleaned up, and does not silently downgrade to unit evidence. |

## 13. Required ADRs

| ADR | Reason | Status |
| --- | --- | --- |
| None | No product schema, retention policy, or new bounded context is introduced; the Design records the significant governance choice for later Architecture Review. | N/A |

## 14. Boundaries

| Boundary | Owner | Purpose |
| --- | --- | --- |
| Canonical workflow | `docs/SDD-WORKFLOW.md` | Defines permitted lifecycle, roles, review verdicts, budgets, and escalation. |
| Runtime mechanics | `scripts/sdd-runtime.mjs` | Reconstructs/proves state and selects only a workflow-authorized next action. |
| Orchestrator | `sdd-direct-orchestrator` | Executes local dispatch, supplies bounded context, persists/mirrors evidence, and stops as directed. |
| Phase executors | Existing Direct agents | Produce phase-specific judgment/evidence only; they do not select unrelated phases. |
| State/trace | Canonical change `.sdd-runtime/` | Stores typed cache, immutable trace events, fingerprints, attempts, and routing evidence. |

## 15. Extensibility

| Future feature | How it fits | Effort |
| --- | --- | --- |
| New canonical phase | Workflow plus a local mapped executor and state adapter; validator rejects an unmapped phase. | Days |
| New provider | Add capability/quality/cost declaration and role-compatible ordered fallback; no phase ownership change. | Days |
| Reusable disposable harness | Add an allowlisted adapter beneath runtime evidence contract after direct repository proof. | Days |

---

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor | 10× | 100× | Mitigation |
| --- | --- | --- | --- |
| Storage | Small trace growth | More artifacts/traces | Per-change immutable event files, compact materialized state; archive retains evidence. |
| Query latency | Linear scan tolerable | Scan cost visible | Fingerprinted warm state; bounded artifact list. |
| Write throughput | One change sequence | Concurrent changes | Atomic per-change writes; no shared mutable DB. |
| Memory | Small packets | Larger documents | Layered references and hash-only unchanged inputs. |

**Decision:** Keep per-change filesystem state and bounded packets.

**Rationale:** Current repository is filesystem/hybrid based; no central runtime service is evidenced.

**Alternative:** External orchestration database.

**Future impact:** A later service can import trace/state schemas without changing workflow authority.

### B. Open/Closed Principle (OCP)

**Point of extension:** Versioned phase adapter and model capability entries.

**What must change to add one more:** Canonical workflow, local executor, map entry, adapter, validator test.

**Decision:** Use data-driven adapters with strict allowlists.

**Rationale:** New behavior is explicit and validated rather than prompt conditionals.

**Alternative:** One expanding orchestrator prompt.

**Future impact:** New phases cannot bypass ownership or evidence checks.

### C. Ownership

| Data / Capability | Owner | Consumers |
| --- | --- | --- |
| Lifecycle semantics | Canonical workflow | Runtime, orchestrator, agents |
| Runtime state/trace | Canonical change directory | Runtime, orchestrator, Verify/Archive evidence |
| Provider capability metadata | Model map | Runtime, validator |

**Decision:** State is cache/evidence; workflow owns semantics.

**Rationale:** Prevents a competing lifecycle authority.

**Alternative:** Engram or an external service as state authority.

**Future impact:** Hybrid mirrors remain observational evidence.

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
| --- | --- | --- | --- |
| State/trace/fingerprints | Active change through handoff | Move with canonical change; trace is immutable event files | Only maintainer-approved retention policy; no automatic deletion. |
| Cost/latency telemetry | Change lifetime | Archive report summary + trace | Never store prompts, secrets, or provider payloads. |

**Decision:** Retain minimal metadata with change evidence.

**Rationale:** Recovery and audit require provenance; sensitive content is excluded.

**Alternative:** Central telemetry store.

**Future impact:** Aggregation can consume redacted trace fields later.

### E. Idempotency

| Operation | Duplicate risk | Protection | Fallback |
| --- | --- | --- | --- |
| Bootstrap/recovery | Repeated resume | Trace-chain verification + state cursor + atomic replace | Rebuild/reconcile one provable event gap, then BLOCKED on conflict. |
| Dispatch outcome | Duplicate executor return | `(change, sequence, action, inputHash)` key and immutable event hash | Return recorded outcome/reconcile state; no re-dispatch. |
| Archive/terminal report | Re-run after interruption | Artifact hash/provenance check | Continue only if exact expected output is provable. |

**Decision:** Every mutation is atomic and keyed.

**Rationale:** One initial instruction must survive interruption without duplication.

**Alternative:** Trust executor memory.

**Future impact:** Enables safe `/sdd-resume` without replay loops.

### F. Shared Contracts

| Contract | Location | Consumers | Producers |
| --- | --- | --- | --- |
| `RuntimeState`, `TraceEvent`, `OutcomePacket`, `Blocker`, `RoutingDecision` | `scripts/sdd-runtime.mjs` JSDoc/JSON schema | Resolver, orchestrator, tests, validator | Runtime/phase agents |

**Decision:** Define one runtime contract beside its parser/validator, including a discriminated, validated `Blocker` whose class determines the serialized `human_required` boolean and policy.

**Rationale:** The current project uses Node scripts; adding an unrelated package is not justified.

**Alternative:** Separate shared package.

**Future impact:** Exported schema can move only when a second consumer proves need; new blocker classes require an explicit policy-table and validator/test update.

### G. Partitioning Strategy

| Dimension | Risk | Strategy |
| --- | --- | --- |
| Tenant | None | Runtime has no product/tenant data. |
| Time | Trace growth | Per-change archive and compact checkpoints. |
| Volume | Many active changes | Directory partition by validated change name; resolver fails closed on ambiguity. |

**Decision:** Partition state by canonical change directory.

**Rationale:** It aligns provenance, Working Set isolation, and archival behavior.

**Alternative:** One repository-wide state file.

**Future impact:** Concurrent changes cannot overwrite each other.

---

## 16. Interfaces / Contracts

```typescript
type RuntimeStatus = 'READY' | 'RUNNING' | 'BLOCKED' | 'HUMAN_HANDOFF' | 'COMPLETED';
type LogicalRole = 'HIGH' | 'MID' | 'LOW' | 'HUMAN';

interface RuntimeState {
  schemaVersion: 2;
  change: string;
  canonicalPath: string;
  status: RuntimeStatus;
  sequence: number;
  checkpoint: { phase: string | null; artifact: string | null; verdict: 'PASS' | 'BLOCKED' | null; next: string | null };
  fingerprints: { workflow: string; modelMap: string; config: string; artifacts: Record<string, string> };
  attempts: Record<string, number>;
  traceCursor: { sequence: number; eventHash: string | null; chainHash: string | null };
  lastTransition: { idempotencyKey: string; action: string; inputHash: string; outcomeHash: string; afterStateHash: string } | null;
}

interface TraceEvent {
  schemaVersion: 1;
  sequence: number;
  idempotencyKey: string; // sha256(change + sequence + action + inputHash)
  eventHash: string; // sha256(canonical JSON of this event without eventHash)
  previousEventHash: string | null;
  chainHash: string; // sha256(previous chainHash or genesis + eventHash)
  change: string;
  action: string;
  role: LogicalRole;
  inputHash: string;
  outcomeHash: string;
  route: { configured: string; resolved: string; rejections: string[] };
  beforeStateHash: string;
  afterStateHash: string;
  stateMaterialization: Pick<RuntimeState, 'status' | 'sequence' | 'checkpoint' | 'fingerprints' | 'attempts' | 'traceCursor' | 'lastTransition'>;
  contextAudit: { bootstrapReadCount: number; normalPhaseBootstrapReadCount: number; references: Record<string, string> };
  timestamp: string;
}

interface OutcomePacket {
  change: string; action: string; role: LogicalRole; status: 'PASS' | 'BLOCKED' | 'FAILED';
  artifacts: string[]; evidence: string[]; next: string;
  blocker?: Blocker;
}

type BlockerClass =
  | 'AUTO_RETRY' | 'AUTO_REFINE' | 'AUTO_RECOVER' | 'ENVIRONMENT_RECOVERABLE' | 'PROVIDER_FALLBACK'
  | 'HUMAN_ARCHITECTURE' | 'HUMAN_SECURITY' | 'HUMAN_SCOPE' | 'HUMAN_GIT'
  | 'HUMAN_RISK_ACCEPTANCE' | 'HUMAN_INFRASTRUCTURE' | 'FATAL_INVARIANT';

interface Blocker {
  class: BlockerClass;
  human_required: boolean;
  reason: string; // explanatory only; it is never parsed for routing
  resume_phase: string | null;
}
```

`Blocker` is a strict validated discriminated contract. An emitted `BLOCKED` or `FAILED` outcome requires exactly one blocker; `PASS` must not emit one. The parser rejects unknown fields/classes, missing class, a non-boolean or mismatched `human_required`, invalid `resume_phase`, or any malformed blocker as terminal fail-closed `STOP/HUMAN_HANDOFF`; it writes the validation cause as evidence and does not dispatch. `reason` is explanatory only. `resume_phase` is structured `string | null`, validated as an allowlisted canonical action when non-null, and is never parsed from prose.

| Blocker class | Required `human_required` | Deterministic policy |
| --- | --- | --- |
| `AUTO_RETRY` | `false` | Retry only the current legal action and only within the canonical budget. |
| `AUTO_REFINE` | `false` | Enter only the workflow-authorized Design or Tasks Refinement edge within its one-retry review loop. |
| `AUTO_RECOVER` | `false` | Run only the bounded canonical reconstruction/reconciliation policy, then resume the proven legal action within budget. |
| `ENVIRONMENT_RECOVERABLE` | `false` | Run the existing bounded environment recovery for the same action; unavailable or unsafe recovery is terminal fail-closed. |
| `PROVIDER_FALLBACK` | `false` | Resolve only the existing same-role compatible configured fallback; no candidate is terminal fail-closed. |
| `HUMAN_ARCHITECTURE` | `true` | `STOP/HUMAN_HANDOFF`; no automatic alternative selection. |
| `HUMAN_SECURITY` | `true` | `STOP/HUMAN_HANDOFF`; no automatic weakening or bypass. |
| `HUMAN_SCOPE` | `true` | `STOP/HUMAN_HANDOFF`; no Working Set expansion. |
| `HUMAN_GIT` | `true` | `STOP/HUMAN_HANDOFF` at Repository Ready's final integration boundary and for unauthorized Commit/Push/Merge/Rebase/Release/Deploy/Tag/direct-to-main operations; no Git mutation. |
| `HUMAN_RISK_ACCEPTANCE` | `true` | `STOP/HUMAN_HANDOFF` for the already-designed evidenced chained-PR/workload exception. |
| `HUMAN_INFRASTRUCTURE` | `true` | `STOP/HUMAN_HANDOFF` when the required disposable-test environment cannot be safely recovered; it never downgrades required evidence. |
| `FATAL_INVARIANT` | `true` | Terminal `STOP/HUMAN_HANDOFF`; provenance, integrity, or safety invariant failure cannot retry, refine, recover, fall back, or auto-continue. |

The five `false` classes are the complete machine-recoverable set. They may enter only the corresponding canonical retry/refinement/recovery policy and its existing budget. Every `true` class deterministically produces `STOP/HUMAN_HANDOFF`; no prose inference, implicit default, or class conversion is permitted.

Transition execution table (an implementation projection of the canonical workflow, not an authority): Design PASS → Architecture Review; review finding within canonical refinement budget → Design Refinement → review; approved review → Tasks → Tasks Review → permitted refinement or Workload Guard → Apply 7.1–7.6 → fresh Verify; Verify PASS → Archive → Health Report → Repository Ready → HUMAN handoff. A validated `BLOCKED`/`FAILED` result follows only its blocker-class policy above; unknown status, exhausted budget, phase mismatch, missing evidence, or a rejected blocker contract is terminal fail-closed. No transition may revisit an identical `(action,inputHash)` or exceed its canonical one-retry/refinement allowance.

Routing contract: select configured role first; then only candidates with the same authorized logical role, declared required capability/quality, allowed project-local executor, and within the configured cost class. Persist configured/resolved role/model, ordered candidates considered, rejection reason, runtime evidence, timestamp, and estimated/actual call count/latency; token/cost telemetry is optional when supplied and must be redacted. No candidate means `BLOCKED`; LOW failure cannot silently become MID/HIGH and HIGH judgment cannot downgrade.

Trace persistence contract: a transition produces exactly one `TraceEvent` at `.sdd-runtime/trace/<20-digit-zero-padded-sequence>-<eventHash>.json`; `state.json` contains no trace array. Sequence starts at 1, is strictly contiguous, and `previousEventHash`/`chainHash` must link to the preceding event. The event's idempotency key is `sha256(change + sequence + action + inputHash)` and its `eventHash` is calculated from canonical JSON with `eventHash` omitted; every event includes a complete, non-semantic `stateMaterialization` and before/after state hashes. The runtime publishes an event first: write a unique temp file with exclusive creation, fsync it, atomically link it to the final name without replacement, fsync `trace/`, then remove and fsync the temp entry. It next writes a complete `state.json.tmp` with exclusive creation, fsyncs it, atomically renames it to `state.json`, and fsyncs `.sdd-runtime/`. No trace file is overwritten or deleted.

On bootstrap/recovery, the runtime reads event files in numeric sequence, validates filename hash, schema version, event hash, contiguous sequence, idempotency uniqueness, hash chain, and the event materialization. It then validates `state.json`: an equal cursor/state hash is valid; a state cursor exactly one event behind is recovered by atomically materializing that event's `stateMaterialization`; state ahead of trace, a gap, duplicate sequence/key, differing payload for an existing key, invalid hash, or more than one unmatched event is `BLOCKED` and writes nothing. A repeat submission with an identical existing key/event returns the recorded outcome and may perform only that one-event state reconciliation; a duplicate key with different content, or two event files at one sequence, is a provenance conflict. This trace is audit/recovery evidence only: transition legality remains a projection of `docs/SDD-WORKFLOW.md`, and no database or second lifecycle store is introduced.

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
| --- | --- | --- | --- |
| 1 | Add pure runtime/tests, immutable trace-event contract, and validator checks; retain existing Direct command behavior until validated. | Low | Remove unreferenced new runtime files. |
| 2 | Wire `/sdd-direct` and `/sdd-resume` to bootstrap/reconstruct trace then materialize state. | Med | Disable autonomous loop; preserve artifacts and use current manual Direct recovery. |
| 3 | Enable structured outcomes and ordered compatible fallback. | Med | Mark change BLOCKED on missing compatible route; never force a provider. |

Active changes without `.sdd-runtime/state.json` or trace directory are legacy: `/sdd-resume` performs bounded cold reconstruction from canonical artifacts, compares any hybrid state, then creates the first materialized state only after a consistent result. Once trace exists, recovery follows the trace reconciliation contract and otherwise returns exact `BLOCKED` evidence. Archived changes are immutable and never receive generated state or trace; the runtime reads them only when the workflow permits Archive/Health/Ready evidence. Legacy commands remain STOP-only and direct users to `/sdd-direct <change-name>`; they never migrate or start a lifecycle. Current canonical governance remains authoritative throughout this migration; a fresh HIGH Verify is mandatory before Archive.

## 18. Open Questions

| # | Question | Status | Resolution |
| --- | --- | --- | --- |
| 1 | Is a reusable Docker harness already implemented outside the bounded files? | Resolved | No source was proven; only historical manual evidence exists, so this Design scopes a conditional adapter and does not claim reuse. |
| 2 | What provider telemetry is available at runtime? | Resolved | Store only available redacted counters/latency; absence is explicit baseline limitation, never fabricated cost data. |
| 3 | Can an incompatible role substitute during outage? | Resolved | No. The runtime stops with routing evidence; only HUMAN can authorize a workflow-valid exception. |
| 4 | How are trace writes recovered without a database or mutable trace array? | Resolved | Immutable event-first files and a one-event state-materialization reconciliation rule; any ambiguity blocks. |

---

> **End of document.**
> It does not modify the pipeline, prompts, or workflow.
