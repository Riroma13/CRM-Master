---
description: Run the project-local CRM-SDD workflow for a named change.
agent: sdd-direct-orchestrator
---

Classification: EXECUTION ADAPTER.

Start the project-local CRM-SDD execution adapter for `$ARGUMENTS`. The change
name is required. Load `AGENTS.md`, then the semantic workflow authority at
`docs/SDD-WORKFLOW.md`, and recover the active state from
`openspec/changes/<change-name>/` before any additional inspection.

Use only project-local Direct agents and `.opencode/sdd-model-map.json`. This
command is an entry adapter only: it forwards lifecycle control to
`sdd-direct-orchestrator` and never dispatches an executor, materializes an
executor outcome, or writes change-local runtime state itself. The orchestrator
is the sole persistence owner under the `hybrid` contract and owns the
`sdd-runtime` bootstrap and autonomous dispatch boundary. It runs
`pnpm sdd:validate`, bootstraps the validated identity, and uses the canonical
event-first persistence boundary before each next dispatch. Stop at Repository
Ready for the maintainer Git handoff. Do not commit, push, merge, release, or
tag.

Return exactly the canonical Executor Outcome Contract in
`docs/architecture/sdd-direct.md`; do not add phase-specific fields or duplicate
its schema.
Every outcome must include the explicit `checkpointArtifact` required by the
action-to-artifact mapping; auxiliary `artifacts` entries are unordered evidence
and never select the checkpoint by position.

## Explicit HUMAN stranded-checkpoint recovery

Only an explicit maintainer request may invoke the exported
`recoverStrandedCheckpoint` operation. Its exact input is
`{ root, change, canonicalPath, expectedSequence, target,
authorityRefs: { workflow: "docs/SDD-WORKFLOW.md",
modelMap: ".opencode/sdd-model-map.json", config: "openspec/config.yaml" },
fingerprints, authorization: { actor: "HUMAN / MAINTAINER", approval } }`. The operation is limited to a proven
blocked `HUMAN_HANDOFF` at Apply 7.3, appends one recovery event, and returns a
READY checkpoint whose verdict remains BLOCKED and whose next action is Apply
7.3. It must not inspect executor payloads, dispatch an executor, or be used
against a real product change during hotfix work. Normal HUMAN_HANDOFF remains
terminal unless this exact HUMAN authorization is separately supplied.

## Exact dispatch-materialization compatibility recovery

Do not invoke this operation during ordinary dispatch. A separate explicit
HUMAN / MAINTAINER authorization may invoke the runtime's bounded
`recoverDispatchMaterialization` operation only for the exact sequence-21
compatibility predicate: the latest accepted event is `Apply 7.5 Testing`, the
persisted checkpoint is `Apply 7.4 Integration`, and all identity, trace,
authority, fingerprint, provenance, predecessor-edge, and recoverable BLOCKED
evidence checks pass, including binding the evidence to the originating
handoff hashes. It appends one event and returns READY/BLOCKED with
`next: Apply 7.5 Testing`; the next executor result must be fresh and
schema-valid. It does not alter the executor outcome contract or the existing
Apply 7.3 recovery operation.

## Workload Guard policy

Workload Guard estimates the forecast and records it as informational evidence.
Forecast size never requires HUMAN approval. When the approved Design, Tasks,
and Working Set remain sufficient, pass every forecast and continue to `Apply 7.1
Foundation`. Partitioning, delivery, verification boundaries, and Git/PR topology
are technical planning decisions owned by Design, Tasks, and Apply based on
semantic cohesion, dependencies, Working Set, context, and implementation risk.
Do not re-ask HUMAN to approve a technical decision already passed by
Architecture Review.

If evidence shows a material Design or Working Set departure, stop with the
appropriate semantic `HUMAN_SCOPE` / Design-Review path. Security or risk
acceptance, destructive or irreversible operations, material production or
infrastructure risk, material external cost, and Git/merge/release decisions
remain HUMAN-owned. Never use line count as the reason for a HUMAN_HANDOFF and
never invoke Apply directly from an unvalidated semantic exception.
