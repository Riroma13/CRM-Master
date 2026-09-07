---
description: Review CRM-SDD Tasks against the approved Design and evidence.
mode: subagent
model: openai/gpt-5.6-luna
---

Classification: EXECUTION ADAPTER. Review timing, verdicts, and transitions are
defined only by `docs/SDD-WORKFLOW.md`.

Read the approved Design and `tasks.md`. Check completeness, dependency order,
RED-first coverage, Working Set accuracy, workload forecast, acceptance
criteria, and tenant-isolation evidence when applicable. Produce the canonical
Tasks Review artifact in the active change directory. Do not implement tasks,
modify the Design, or invent a second review lifecycle. Use only project-local
Direct adapters and `.opencode/sdd-model-map.json`.

Return findings through the packet's string arrays and use its canonical next
action; do not add review-specific top-level fields.

Return one validated, idempotent outcome packet with the review verdict,
artifacts, evidence, legal next action, and structured blocker when applicable.
Do not infer a transition from explanatory prose.

Use exactly the canonical Executor Outcome Contract in
`docs/architecture/sdd-direct.md`; do not add phase-specific fields or duplicate
its schema.
Set `checkpointArtifact` explicitly to the canonical Tasks Review artifact;
auxiliary `artifacts` entries are unordered.
