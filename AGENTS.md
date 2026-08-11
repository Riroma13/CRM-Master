---
classification: PRIMARY AUTHORITY
semantic_authority: false
scope: startup, authority, recovery, execution tiers, and maintainer boundaries
---

# CRM-Master Agent Governance

`AGENTS.md` is the only repository startup and authority document. It defines
how an agent enters the repository and which source controls a decision. The
semantic lifecycle is defined only by `docs/SDD-WORKFLOW.md`.

## Mandatory Startup

At the start of every session, read these files in this exact order:

1. `.ai/context/PROJECT.md` — stack, architecture, and repository conventions
2. `.ai/context/SESSION.md` — factual current repository state
3. `.ai/context/DECISIONS.md` — durable product and architecture decisions
4. `.ai/context/KNOWN_ISSUES.md` — known non-blocking debt
5. `.ai/context/ROADMAP.md` — completed, current, and upcoming product work

Then load only the governance or active-SPEC files required by the current
bounded task. Do not repeat a completed broad audit without a direct
contradiction or an explicit requirement.

## Authority Precedence

When sources disagree, apply this order from highest to lowest:

1. Maintainer / User
2. Approved active SPEC Design
3. `AGENTS.md`
4. `docs/SDD-WORKFLOW.md`
5. Active SPEC artifacts
6. `.ai/context`
7. Templates and project-local execution adapters
8. External/global tools and skills
9. Model heuristics

The approved Design is authoritative for the active SPEC's intended change.
This document is authoritative for repository startup, safety, escalation, and
maintainer boundaries. The workflow document is authoritative for lifecycle
semantics. No lower source may silently override a higher source.

## Recovery First

Before acting, recover the current state from the canonical repository artifact
store and the active session context. Consume an approved Working Set and Read
Order before exploring additional files. Prefer the smallest bounded evidence
packet that can prove the next action.

Stop and report the exact conflict when a user-owned overlap, artifact
provenance, scope boundary, or material repository fact is unclear. Do not
overwrite, normalize, or discard unclear work. Reopen exploration only when
direct evidence contradicts a material fact or the canonical workflow requires
bounded evidence.

## Logical Execution Tiers

Governance uses logical roles, never provider or model names as semantics:

| Tier | Logical role | Responsibility |
|---|---|---|
| HIGH | ARCHITECT | Architecture, Design judgment, Architecture Review, Design Refinement, and final Verify judgment |
| MID | BUILDER | Orchestration, Tasks, Tasks Review, Tasks Refinement, and Apply execution |
| LOW | OPERATOR-EVIDENCE | Bounded evidence, mechanical checks, Archive, Health Report, and Repository Ready |
| HUMAN | MAINTAINER | Commit, Push, Merge, release/tag authorization, and destructive Git decisions |

LOW must stop and escalate to HIGH or MID when architectural or implementation
reasoning is required. MID must stop and escalate to HIGH when multiple
materially valid architectural options remain. HUMAN decisions cannot be
simulated by an agent.

## Stop and Escalation Rules

- Stop on a blocked gate, unresolved material contradiction, missing required
  evidence, unclear provenance, or a request outside the approved scope.
- Use the correction and recovery budget defined by the canonical workflow;
  never invent another retry loop.
- Preserve baseline debt when it is proven pre-existing and unrelated. Record
  it as baseline debt; do not convert it into a new implementation task.
- Never broaden a Working Set silently. Report necessary bounded deviations and
  return to the canonical checkpoint.

## Maintainer-Controlled Git

Agents do not commit, push, merge, release, tag, reset, clean, stash, restore,
or discard repository state. The workflow may prepare evidence through
Repository Ready, then hands the terminal Git actions to the HUMAN / MAINTAINER.
An explicit maintainer action is required for every destructive Git operation.

## Global Gentle SDD Isolation

The project-local `.opencode/` CRM-SDD command, agents, model map, and validator
are the only active CRM lifecycle path. Global OpenCode/Gentle SDD files are
read-only external evidence and are not a repository authority.

- Do not invoke, consult, synchronize, install, uninstall, or modify global
  Gentle SDD governance for CRM lifecycle work.
- Project-local configuration disables conflicting global SDD agents and places
  STOP-only compatibility boundaries over same-name legacy commands.
- This is project-local runtime isolation, not a claim that global files were
  removed. If runtime evidence contradicts the local boundary, stop and report
  it rather than weakening the boundary or editing global files.

## Canonical Workflow

Read `docs/SDD-WORKFLOW.md` for the complete v3 ACTIVE / STABLE lifecycle,
ownership, gates, transition graph, correction budget, recovery rules,
hybrid-persistence contract, and terminal handoff. The Workflow Guard is only a
compatibility/enforcement pointer; `docs/architecture/sdd-direct.md` is only an
execution adapter.

Project architecture and product conventions live in `.ai/context/PROJECT.md`.
The sole Design shape is `docs/templates/design-enterprise-template.md`.
