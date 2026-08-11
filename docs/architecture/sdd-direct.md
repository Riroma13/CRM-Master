---
classification: EXECUTION ADAPTER
semantic_authority: false
workflow_semantics: docs/SDD-WORKFLOW.md
persistence: hybrid
---

# CRM-SDD Direct Execution Adapter

This document defines how project-local execution is wired. It does not define
WHAT the CRM lifecycle is, WHEN a transition is legal, or HOW a gate is judged.
Those semantics belong exclusively to `docs/SDD-WORKFLOW.md`.

## Execution Sequence

The local Direct orchestrator performs this bounded sequence:

1. Load the canonical repository governance and the active project context.
2. Resolve the project-local executor for the current action from
   `.opencode/sdd-model-map.json`.
3. Recover the current change state from
   `openspec/changes/<change-name>/` before additional exploration.
4. Invoke the local phase executor with the approved Working Set and Read Order.
5. Persist exact artifacts in the canonical change directory under the
   `hybrid` contract and mirror bounded status/evidence to Engram.
6. Invoke the repository validators and record their results in the phase
   artifact.
7. Return control to the orchestrator, the canonical checkpoint, or the
   maintainer handoff prescribed by the workflow.

The adapter never creates a second artifact store, rewrites a Design or Tasks
to conceal drift, or silently broadens the Working Set. A missing file,
provenance conflict, or material contradiction stops the affected action and
returns an evidence request instead of triggering broad exploration.

## Local Wiring

`/sdd-direct <change-name>` is the only project-local CRM-SDD lifecycle entry
point. Local agents are thin adapters and defer lifecycle meaning to the
canonical workflow. Same-name legacy command overrides are STOP-only
compatibility boundaries; they cannot start the CRM lifecycle.

Global OpenCode/Gentle files remain external read-only evidence. This adapter
does not invoke, synchronize, install, uninstall, or modify them, and it does
not assign global prompt semantics to CRM-SDD.

## Persistence Boundary

OpenSpec files carry exact repository artifacts. Engram carries durable bounded
context, decisions, status summaries, and recovery metadata. The `hybrid`
contract separates storage from authority: neither store, the local model map,
nor this adapter can redefine lifecycle semantics.

## Maintainer Handoff

The adapter can prepare health and readiness evidence, but it never executes
Commit, Push, Merge, Release, Tag, reset, clean, stash, restore, or checkout.
Those operations require an explicit HUMAN / MAINTAINER action under
`AGENTS.md` and the canonical workflow.
