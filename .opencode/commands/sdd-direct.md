---
description: Run the project-local CRM-SDD workflow for a named change.
agent: sdd-direct-orchestrator
---

Classification: EXECUTION ADAPTER.

Start the project-local CRM-SDD execution adapter for `$ARGUMENTS`. The change
name is required. Load `AGENTS.md`, then the semantic workflow authority at
`docs/SDD-WORKFLOW.md`, and recover the active state from
`openspec/changes/<change-name>/` before any additional inspection.

Use only project-local Direct agents and `.opencode/sdd-model-map.json`. Persist
artifacts under the canonical change directory and mirror bounded status and
evidence under the `hybrid` contract. Run `pnpm sdd:validate` before execution
and at handoff. Bootstrap `scripts/sdd-runtime.mjs` with the validated change
identity, fingerprints, Working Set, and current checkpoint before dispatch.
Continue only through legal non-HUMAN actions, persist event-first state/trace
evidence under the change-local `.sdd-runtime/` path when execution output is
required, and stop at Repository Ready for the maintainer Git handoff. After
each executor result, invoke the exported `persistExecutorOutcome` operation
from `scripts/sdd-runtime.mjs`; it must project exactly one transition, create
the trace event, call `persistTransition` (trace first, state second), and
return the accepted checkpoint before any next executor dispatch. Never use
`dispatchUntilTerminal` alone for persistence. Do not commit, push, merge,
release, or tag.

Return exactly the canonical Executor Outcome Contract in
`docs/architecture/sdd-direct.md`; do not add phase-specific fields or duplicate
its schema.

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
