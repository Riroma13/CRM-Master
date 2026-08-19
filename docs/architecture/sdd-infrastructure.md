---
classification: EXECUTION ADAPTER
semantic_authority: false
workflow_semantics: docs/SDD-WORKFLOW.md
mechanical_validation: scripts/validate-sdd-direct.mjs
---

# SDD Platform Infrastructure

This document records repository-owned mechanical checks, health evidence, and
maintenance policy for CRM-SDD. It does not define lifecycle phases,
transitions, ownership, verdicts, or recovery. Those semantics belong to
`docs/SDD-WORKFLOW.md`.

## Mechanical Preflight

The project-local orchestrator runs `pnpm sdd:validate` before execution and at
handoff. The validator checks required governance files, local wiring, model-map
bindings, persistence vocabulary, Design shape availability, terminal ownership,
and the legacy-command boundary. It never modifies global configuration or
reads an active change artifact merely to validate repository governance.

The Design executor runs the bounded Design validator against the selected
Design path before Architecture Review. That validator checks only stable,
machine-checkable Enterprise Design invariants and refuses the protected
SPEC-0028 path.

## Evidence Records

Mechanical evidence records should include:

| Field | Requirement |
|---|---|
| Check | Exact command or validator rule |
| Result | PASS, BLOCKED, or a documented baseline-debt result |
| Evidence | Exact repository path or read-only command output |
| Scope | Working Set path and bounded reason |
| Runtime | Project-local config and logical role, when relevant |

An evidence record is not permission to broaden scope. Architectural or
implementation judgment is escalated to the logical role named by the canonical
workflow.

## Mechanical Runtime Evidence

The project-local `scripts/sdd-runtime.mjs` is a mechanical contract and
recovery adapter. It validates change identity, fingerprints, typed outcomes and
blockers, selects legal transitions from constrained workflow inputs, and
records routing/context evidence without storing prompt bodies. Direct and
Resume use the same runtime boundary; normal phase transitions reuse the live
context packet rather than rereading global bootstrap documents.

When execution output is required, materialized state is located only at
`openspec/changes/<change-name>/.sdd-runtime/state.json` and immutable events
are located only under its change-local `trace/` directory. Event-first
exclusive publication followed by atomic state replacement supports one-event
interruption reconciliation. Corrupt, ambiguous, stale, foreign, or
state-ahead evidence stops fail-closed. These files are cache/audit evidence;
they never replace `docs/SDD-WORKFLOW.md` as lifecycle authority.

Autonomous dispatch ends at Repository Ready and emits a maintainer Git
handoff. Commit, Push, Merge, Rebase, Release, Deploy, Tag, and direct-to-main
requests are rejected before subprocess execution. Legacy commands remain
STOP-only compatibility boundaries.

## Model Fallback Evidence

Concrete bindings are resolved from `.opencode/sdd-model-map.json`. If runtime
availability requires a fallback, record the configured logical role, resolved
logical role, exact runtime evidence, reason, and timestamp. A fallback cannot
silently change phase ownership or route Apply through an unapproved executor.

## Health and Learning

Health and Archive artifacts may record observational metrics such as Working Set
accuracy, unexpected files, unexpected dependencies, Verify iterations, and
baseline debt. These measurements improve future Designs; they do not create a
new lifecycle phase or change a gate result retroactively.

## Stability Policy

The product platform is feature-frozen. New governance capabilities require
recurring repository evidence or a durable ADR. This one-time governance
consolidation is an explicitly authorized migration and is limited to governance
artifacts, local execution wiring, and validators.

## References

- `docs/SDD-WORKFLOW.md` — sole semantic workflow authority
- `docs/sdd-workflow-guard.md` — compatibility and enforcement pointer
- `docs/architecture/sdd-direct.md` — local execution adapter
- `.opencode/sdd-model-map.json` — concrete role and agent mapping
- `scripts/validate-sdd-direct.mjs` — governance validator
- `scripts/validate-enterprise-design.mjs` — Design pre-gate validator
- `docs/templates/design-enterprise-template.md` — sole Design shape
