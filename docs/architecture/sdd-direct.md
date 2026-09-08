---
classification: EXECUTION ADAPTER
semantic_authority: false
workflow_semantics: docs/SDD-WORKFLOW.md
persistence: hybrid
---

# CRM-SDD Direct Execution Adapter

This document defines how project-local execution is wired. It does not define
WHAT the CRM lifecycle is, WHEN a transition is legal, or HOW a gate is judged.
Those semantics belong exclusively to `docs/SDD-WORKFLOW.md`.

## Execution Sequence

The local Direct orchestrator performs this bounded sequence:

1. Load the canonical repository governance and the active project context.
2. Resolve the project-local executor for the current action from
   `.opencode/sdd-model-map.json`.
3. Recover the current change state from
   `openspec/changes/<change-name>/` before additional exploration.
4. Invoke the local phase executor with the approved Working Set and Read Order.
5. Persist exact artifacts in the canonical change directory under the
   `hybrid` contract and mirror bounded status/evidence to Engram.
6. Invoke the repository validators and record their results in the phase
   artifact.
7. Return control to the orchestrator, the canonical checkpoint, or the
   maintainer handoff prescribed by the workflow.

## Canonical Executor Outcome Contract

Every local Direct executor MUST return exactly one JSON/YAML outcome packet
with these top-level keys and no others:

<!-- executor-outcome-contract:start -->
```yaml
change: <named change string>
action: <canonical action from docs/SDD-WORKFLOW.md>
role: HIGH | MID | LOW
status: PASS | BLOCKED | FAILED
checkpointArtifact: <canonical artifact basename for the action>
artifacts: [<checkpointArtifact and auxiliary artifact strings>, ...]
evidence: [<string>, ...]
next: <canonical next action string>
# blocker is required only when status is BLOCKED or FAILED:
blocker:
  class: <class listed in scripts/sdd-runtime.mjs>
  human_required: <boolean matching that class policy>
  reason: <non-empty string>
  resume_phase: null | <canonical action>
```
<!-- executor-outcome-contract:end -->

`checkpointArtifact` is required, must equal the action's canonical artifact
basename, and must also appear in `artifacts`; `artifacts` and `evidence` are
unordered string arrays (never objects), and auxiliary entries never select the
checkpoint artifact. `blocker` MUST be absent for `PASS`, and MUST be present
for `BLOCKED` or `FAILED`. `action`, `role`, and `next` must use canonical
workflow values, and unknown or phase-specific top-level fields are forbidden.
The runtime validator is the mechanical enforcement point for this contract;
this section is its sole documentation source. See this section from every
local Direct command and agent; do not maintain a second executor schema
elsewhere.

The adapter never creates a second artifact store, rewrites a Design or Tasks
to conceal drift, or silently broadens the Working Set. A missing file,
provenance conflict, or material contradiction stops the affected action and
returns an evidence request instead of triggering broad exploration.

## Local Wiring

`/sdd-direct <change-name>` is the only project-local CRM-SDD lifecycle entry
point. Local agents are thin adapters and defer lifecycle meaning to the
canonical workflow. Same-name legacy command overrides are STOP-only
compatibility boundaries; they cannot start the CRM lifecycle.

Global OpenCode/Gentle files remain external read-only evidence. This adapter
does not invoke, synchronize, install, uninstall, or modify them, and it does
not assign global prompt semantics to CRM-SDD.

## Persistence Boundary

OpenSpec files carry exact repository artifacts. Engram carries durable bounded
context, decisions, status summaries, and recovery metadata. The `hybrid`
contract separates storage from authority: neither store, the local model map,
nor this adapter can redefine lifecycle semantics.

Each executor result crosses the runtime through the exported
`persistExecutorOutcome` operation in `scripts/sdd-runtime.mjs`. It validates
and projects exactly one result, creates its trace event, and invokes
`persistTransition`, which publishes the trace before materializing state.
`dispatchUntilTerminal` is a projection helper only; using it without
`persistExecutorOutcome` is incomplete and must stop before the next dispatch.

Archive is the one filesystem-boundary exception owned by that same operation:
the Archive executor leaves the active change directory and
`archive-report.md` at the active canonical path. After `persistTransition`
accepts the Archive event, the runtime atomically relocates the complete change
directory to its deterministic date-prefixed archive destination and
materializes the returned state with that destination as `canonicalPath`.
Health Report and Repository Ready consume that returned path. No executor or
orchestrator may move the directory, persist a second Archive event, or rewrite
the path manually.

Workload Guard has no size-based approval transition. The runtime records the
forecast as informational evidence and materializes the normal `READY` result
whose next action is `Apply 7.1 Foundation`; it does not derive partitioning,
delivery, verification boundaries, or Git/PR topology from line count. Those
technical planning decisions belong to the approved Design, Tasks, and Apply
work. A material Design or Working Set departure, security/risk acceptance,
destructive operation, material production/infrastructure risk, material
external cost, or Git/release decision uses the applicable semantic HUMAN
blocker; line count never supplies the reason for a HUMAN_HANDOFF. A passed
Architecture Review already authorizes ordinary technical Apply decisions.

## Canonical checkpoint artifact mapping

The runtime validates this action-to-artifact mapping before persistence:

| Action | Canonical checkpoint artifact |
|---|---|
| Design | `design.md` |
| Architecture Review | `architecture-review.md` |
| Design Refinement | `design.md` |
| Tasks | `tasks.md` |
| Tasks Review | `tasks-review.md` |
| Tasks Refinement | `tasks.md` |
| Workload Guard | `workload-guard.md` |
| Apply 7.1 Foundation | `apply-7.1-foundation.md` |
| Apply 7.2 Core Engine | `apply-7.2-core-engine.md` |
| Apply 7.3 Feature Implementation | `apply-7.3-feature-implementation.md` |
| Apply 7.4 Integration | `apply-7.4-integration.md` |
| Apply 7.5 Testing | `apply-7.5-testing.md` |
| Apply 7.6 Apply Summary | `apply-7.6-apply-summary.md` |
| Verify | `verify-report.md` |
| Archive | `archive-report.md` |
| Health Report | `health-report.md` |
| Repository Ready | `repository-ready.md` |

The mapping follows the current lifecycle names and the established change
artifact evidence; legacy aliases are not accepted as checkpoint artifacts.

## Maintainer Handoff

The adapter can prepare health and readiness evidence, but it never executes
Commit, Push, Merge, Release, Tag, reset, clean, stash, restore, or checkout.
Those operations require an explicit HUMAN / MAINTAINER action under
`AGENTS.md` and the canonical workflow.
