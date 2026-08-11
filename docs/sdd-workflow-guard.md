---
classification: COMPATIBILITY STUB
semantic_authority: false
workflow_semantics: docs/SDD-WORKFLOW.md
mechanical_enforcement: scripts/validate-sdd-direct.mjs
---

# Workflow Guard Compatibility Pointer

This file is retained for callers that still resolve the historical Workflow
Guard path. It is not a workflow authority and does not define a transition
table, state machine, phase ownership, verdict semantics, correction budget, or
recovery loop.

- Workflow semantics → `docs/SDD-WORKFLOW.md`
- Mechanical enforcement → repository validators, primarily
  `scripts/validate-sdd-direct.mjs` and
  `scripts/validate-enterprise-design.mjs`

Project-local execution adapters may reference this file to locate the
validator boundary, but they must defer WHAT happens and WHEN it happens to the
canonical workflow document. No global or historical prompt can override that
boundary.
