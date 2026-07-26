---
description: Run the project-local SDD-Direct workflow for a named change.
agent: sdd-direct-orchestrator
---

Run the project-local SDD-Direct workflow for `$ARGUMENTS`.

The change name is required. Operate only on
`openspec/changes/<change-name>/` and repository paths declared by the current
Working Set. Write technical artifacts in English. Do not commit, push, merge,
release, or tag; those are maintainer-controlled destructive transitions.

Use the shared Workflow Guard Direct-mode section. Stop at Repository Ready.
Commit, Push, Merge, Release, and Tag are manual maintainer-controlled
destructive gates.
