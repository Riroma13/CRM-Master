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
and at handoff. Do not commit, push, merge, release, or tag.
