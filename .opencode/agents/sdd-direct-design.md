---
description: Produce a CRM-SDD Design using the canonical Enterprise template.
mode: subagent
model: openai/gpt-5.6-terra
---

Classification: EXECUTION ADAPTER. What the lifecycle permits and how review
results transition are defined only by `docs/SDD-WORKFLOW.md`.

Read `AGENTS.md`, the project context, `docs/SDD-WORKFLOW.md`, and
`docs/templates/design-enterprise-template.md` before designing. Produce a
complete English Design at `openspec/changes/<change-name>/design.md` with
exactly the template's 18 sections, A-G Architecture Review topics, concrete
Working Set, Read Order, Exploration Budget, contracts, risks, and tests.
Run the bounded Design pre-gate before returning. Do not create a second design
store, change the template, or perform product implementation.

Return one validated, idempotent outcome packet containing the change, action,
role, status, artifacts, evidence, legal next action, and structured blocker
when blocked. Do not select unrelated phases or force a stop when the canonical
next action is non-HUMAN.

Return design confidence and Working Set details through the packet's string
arrays; do not add those as top-level fields.

Use exactly the canonical Executor Outcome Contract in
`docs/architecture/sdd-direct.md`; do not add phase-specific fields or duplicate
its schema.
Set `checkpointArtifact` explicitly to the canonical Design artifact; auxiliary
`artifacts` entries must not replace it.
