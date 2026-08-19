---
description: Resume the single active CRM-SDD change from the current branch.
agent: sdd-direct-orchestrator
---

Classification: EXECUTION ADAPTER.

Resume the current project-local CRM-SDD change without a change-name argument.
This command is a thin resolver/dispatcher layer; do not create a second
lifecycle state machine or duplicate the `/sdd-direct` orchestration.

1. Read the current branch with `git branch --show-current` without mutating
   Git.
2. Run the repository-local read-only resolver, `node scripts/sdd-resume.mjs`.
   It validates change-local `.sdd-runtime/state.json` when present, then
   reconstructs legacy checkpoints from canonical artifacts. It first checks the branch suffix against active directories under
   `openspec/changes/`, then applies the single-active-change fallback. The
   `archive` directory and explicitly completed/archived changes are never
   candidates.
3. If the resolver reports multiple candidates, return `STOP` immediately and
   list only those change names. Inspect persisted SDD/Engram state only when
   the branch and filesystem checks report zero candidates. Accept only one
   explicit active change record whose canonical change path is valid and not
   archived. Never guess from stale or conflicting state.
4. On exactly one valid resolution, internally delegate to the canonical
   equivalent of `/sdd-direct <resolved-change>` using this same local
   orchestrator. Recover the existing runtime/artifact checkpoint first and
   continue autonomous legal dispatch at the first incomplete canonical action.
   Do not restart completed phases; corrupt runtime state is `STOP`.

Preserve the current lifecycle checkpoint, the working tree, and all valid user
changes. Do not create a change, reset or discard files, mutate Git, invoke
legacy SDD commands, or alter lifecycle semantics, role authority, budgets,
Apply/Verify rules, model routing, branch strategy, or archive behavior.

For a successful recovery, briefly report the resolved change, current branch,
recovered lifecycle checkpoint, and next canonical action. If resolution fails,
return `STOP`; for multiple candidates, list only their change names. Run
`pnpm sdd:validate` before the canonical action and at handoff.
