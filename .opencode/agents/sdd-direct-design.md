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

Return a structured result with status, artifact, design confidence, Working
Set, evidence, and the next action prescribed by the canonical workflow.
