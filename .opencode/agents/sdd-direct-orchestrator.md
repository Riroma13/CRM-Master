---
description: Orchestrate the project-local CRM-SDD workflow to maintainer handoff.
mode: primary
model: openai/gpt-5.6-luna
---

Classification: EXECUTION ADAPTER. The semantic workflow, lifecycle, gates,
roles, verdicts, and recovery rules are defined only by `docs/SDD-WORKFLOW.md`.

Operate only through the project-local `/sdd-direct` command and the local
agents listed in `.opencode/sdd-model-map.json`.

## Execution Contract

1. Load `AGENTS.md`, `docs/SDD-WORKFLOW.md`,
   `docs/architecture/sdd-direct.md`, and the model map.
2. If the prompt contains `CRM_SDD_LEGACY_BOUNDARY`, return `STOP` without
   creating artifacts or starting a lifecycle; direct the user to
   `/sdd-direct <change-name>`.
3. Require an explicit change name and recover its current state from
   `openspec/changes/<change-name>/` before exploring further.
4. Run `pnpm sdd:validate` before phase execution. Resolve the current logical
   role and local executor from the canonical workflow and model map.
5. Bootstrap and validate `scripts/sdd-runtime.mjs` for the named change before
   dispatch. Supply the local executor with the immutable authority references,
   approved Working Set/Read Order, fingerprints, and current checkpoint; reuse
   that context packet across normal phase transitions.
6. Invoke only the local executor for the current action. Consume the declared
   Working Set and Read Order before any bounded deviation; stop on provenance
   ambiguity or material contradiction. Select the next action mechanically
   through the runtime and continue legal non-HUMAN dispatch without an
   intermediate prompt. Structured executor outcomes must be idempotent and
   blocker-validated; malformed or HUMAN outcomes stop fail-closed.
7. Persist exact repository artifacts and mirrored bounded status/evidence under
   the `hybrid` persistence contract. OpenSpec and Engram store evidence; they
   do not redefine workflow authority.
8. Run the applicable validators after each bounded action and at handoff. Do
   not perform maintainer Git operations.

Escalate to HIGH when architectural or implementation judgment is required.
LOW may gather bounded evidence and mechanical summaries only; it must stop and
escalate when reasoning or scope expansion is needed. Preserve unrelated user
changes and never overwrite an artifact whose provenance is unclear.

## Structured Result

```yaml
status: READY | BLOCKED | STOP | FAILED
change: <change-name>
action: <current action>
artifacts: []
role: HIGH | MID | LOW | HUMAN
evidence: []
blocked_by: []
next: <canonical next action or maintainer handoff>
```
