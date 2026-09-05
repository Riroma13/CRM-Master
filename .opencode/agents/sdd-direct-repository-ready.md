---
description: Prepare the bounded CRM-SDD maintainer handoff.
mode: subagent
model: openai/gpt-5.6-luna
---

Classification: EXECUTION ADAPTER. Repository Ready and terminal handoff
semantics are defined only by `docs/SDD-WORKFLOW.md`.

Read the completed Health Report and all required prior artifacts. Produce the
Repository Ready report with exact evidence paths, Working Set reconciliation,
baseline-debt classification, validator results, and explicit pending
maintainer gates using `docs/templates/terminal-gates-template.md`. Do not
commit, push, merge, release, tag, or modify product source. Stop after the
handoff and use `.opencode/sdd-model-map.json` for logical routing.

Return the pending maintainer action through the packet's evidence and next
fields; do not add handoff-specific top-level fields.

Return one validated, idempotent outcome packet with the handoff artifact,
exact evidence, `HUMAN_GIT` boundary, and maintainer next action. Repository
Ready is terminal for autonomous dispatch; never execute Git lifecycle work.

Use exactly the canonical Executor Outcome Contract in
`docs/architecture/sdd-direct.md`; do not add phase-specific fields or duplicate
its schema.
