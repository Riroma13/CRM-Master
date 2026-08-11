---
classification: MAINTENANCE EVIDENCE
semantic_authority: false
change: SPEC-SDD-0003-sdd-governance-consolidation
artifact_store: hybrid
status: RECOVERED
---

# Recovery Record: SPEC-SDD-0003 — SDD Governance Consolidation

## Recovery Boundary

This maintenance change records the interrupted CRM-Master governance
consolidation. It is evidence-only and does not define or replace the CRM-SDD
lifecycle. Lifecycle semantics remain authoritative in
`docs/SDD-WORKFLOW.md`.

The protected user work at
`openspec/changes/SPEC-0028-jobs-background-processing-platform/` is excluded
from this change. Its existing `design.md` was not read or modified during
recovery and retains the verified SHA-256:

`0969a1c2d8d256156245657a4339ca9f2588bc57cdb33b1f0c3cc4700798f56b`

## Recovered Completed Work

- Project-local authority and execution-adapter boundaries are present in
  `AGENTS.md`, `docs/SDD-WORKFLOW.md`, `docs/architecture/sdd-direct.md`, and
  `docs/sdd-workflow-guard.md`.
- The local Direct agent set, compatibility STOP stubs, project-local config,
  and `.opencode/sdd-model-map.json` are present.
- The deterministic governance validator and Enterprise Design pre-gate are
  present and exposed through `pnpm sdd:validate` and
  `pnpm sdd:validate:design`.
- The first recovery validation passed before this record was created:
  `pnpm sdd:validate` → `PASS`.
- `git diff --check` passed before this record was created.

## Recovered Working Set

The existing interrupted working tree changes are the bounded governance
Working Set. They cover governance documentation, project-local OpenCode
wiring, model mapping, OpenSpec governance metadata, project context, and
deterministic validators. Product/runtime code, schema, product tests, global
OpenCode configuration, and SPEC-0028 remain outside the Working Set.

## Recovered Read Order

1. `AGENTS.md`
2. `.ai/context/PROJECT.md`
3. `.ai/context/SESSION.md`
4. `.ai/context/DECISIONS.md`
5. `.ai/context/KNOWN_ISSUES.md`
6. `.ai/context/ROADMAP.md`
7. `docs/SDD-WORKFLOW.md`
8. `docs/architecture/sdd-direct.md`
9. `.opencode/sdd-model-map.json`
10. `openspec/changes/SPEC-SDD-0003-sdd-governance-consolidation/recovery.md`

Additional reads are permitted only for a bounded validator or contradiction
fact required by the current consolidation checkpoint.

## Current Checkpoint

The repository governance edits are already present in the interrupted working
tree. The remaining bounded work is to produce maintenance evidence, run the
canonical validators, and complete the final active-governance contradiction
scan before Repository Ready. No product SDD phase is being resumed.
