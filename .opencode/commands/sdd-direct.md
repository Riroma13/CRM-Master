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
required, and stop at Repository Ready for the maintainer Git handoff. Do not
commit, push, merge, release, or tag.
