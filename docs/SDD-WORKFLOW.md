---
classification: PRIMARY AUTHORITY
semantic_authority: true
sdd_version: v3
status: ACTIVE/STABLE
persistence: hybrid
---

# SDD Workflow — CRM-Master

This document is the sole semantic workflow authority for CRM-Master. It
defines the canonical lifecycle, ownership, gates, transition rules, recovery
budget, evidence contract, and terminal handoff. `AGENTS.md` governs startup,
repository safety, and maintainer boundaries. The Workflow Guard is a
compatibility/enforcement pointer. `docs/architecture/sdd-direct.md` is an
execution adapter. The Enterprise Design template owns Design shape only.

## Version and Status

| Property | Canonical value |
|---|---|
| SDD version | v3 |
| Lifecycle status | ACTIVE / STABLE |
| Semantic authority | This document only |
| Active artifact path | `openspec/changes/<change-name>/` |
| Persistence vocabulary | `hybrid` |

## Canonical Phases

The lifecycle has exactly 14 user-facing phases. Refinement phases are
conditional phases in this count. Apply Summary is nested under Apply as 7.6;
it is not an additional user-facing phase. Workload Guard is a gate, not a
phase.

<!-- canonical-lifecycle:start -->
| # | Phase | Entry condition or result |
|---:|---|---|
| 1 | Design | Create the Enterprise Design artifact |
| 2 | Architecture Review | Review the Design |
| 3 | Design Refinement | Conditional: only after a BLOCKED Architecture Review |
| 4 | Tasks | Derive the implementation plan |
| 5 | Tasks Review | Review the Tasks artifact |
| 6 | Tasks Refinement | Conditional: only after a BLOCKED Tasks Review |
| 7 | Apply | Execute the nested Apply work and summary |
| 8 | Verify | Validate implementation and evidence |
| 9 | Archive | Synchronize completed change evidence and learning |
| 10 | Health Report | Produce the bounded repository health report |
| 11 | Repository Ready | Prepare the maintainer handoff |
| 12 | Commit | Maintainer-only Git phase |
| 13 | Push | Maintainer-only Git phase |
| 14 | Merge | Maintainer-only Git phase |
<!-- canonical-lifecycle:end -->

Apply contains exactly these nested work units:

<!-- apply-substeps:start -->
| ID | Nested Apply work | Boundary |
|---|---|---|
| 7.1 | Foundation | Infrastructure, types, migrations, and base configuration |
| 7.2 | Core Engine | Core business logic, contracts, and state |
| 7.3 | Feature Implementation | SPEC-specific behavior |
| 7.4 | Integration | Component wiring, routes, and UI integration |
| 7.5 | Testing | Unit, integration, doorbell, regression, and required gates |
| 7.6 | Apply Summary | Consolidated execution evidence and Working Set metrics |
<!-- apply-substeps:end -->

Proposal, Spec, and Explore are not CRM lifecycle phases. Proposal and Spec are
compatibility artifacts that may be generated or reconciled when required;
Explore is bounded evidence gathering inside an owned action. None may become a
runtime transition or a user-facing phase.

## Logical Ownership

Governance assigns logical roles, never provider or model names:

| Logical role | Owns |
|---|---|
| HIGH / ARCHITECT | Design, Architecture Review, Design Refinement, and Verify judgment |
| MID / BUILDER | Orchestration, Tasks, Tasks Review, Tasks Refinement, and Apply 7.1–7.6 |
| LOW / OPERATOR-EVIDENCE | Bounded evidence, mechanical checks, Archive, Health Report, and Repository Ready |
| HUMAN / MAINTAINER | Commit, Push, Merge, release/tag authorization, and destructive Git decisions |

LOW may gather facts and produce mechanical summaries. LOW stops and escalates
when architecture, implementation judgment, or scope expansion is required.
MID escalates to HIGH when materially valid architectural options remain. HUMAN
decisions cannot be simulated by an agent.

## Transition Graph

The graph below is deterministic. A transition is legal only when the current
artifact and gate result satisfy the listed edge.

```text
START
  -> Design
  -> Architecture Review
       PASS -> Tasks
       BLOCKED -> Design Refinement -> Architecture Review
  -> Tasks Review
       PASS -> Workload Guard -> Apply 7.1 -> 7.2 -> 7.3 -> 7.4 -> 7.5 -> 7.6
       BLOCKED -> Tasks Refinement -> Tasks Review
  -> Verify
       PASS -> Archive -> Health Report -> Repository Ready
       BLOCKED -> orchestrator-owned Direct Fix -> Verify
  -> Commit -> Push -> Merge
```

The graph is read as a sequence, not as permission to skip an earlier phase.
The only omitted edges are the conditional refinement edges when their review
is not BLOCKED and the maintainer handoff after Repository Ready.

## Gates and Results

Every phase returns a structured result with an explicit normalized gate result:

| Result | Meaning |
|---|---|
| PASS | The phase contract is satisfied and the graph's next edge may be taken |
| BLOCKED | The phase contract is not satisfied; no ordinary next edge is legal |
| CONDITION | A recorded non-blocking condition with owner and evidence; it does not change PASS |
| BASELINE_DEBT | A proven pre-existing unrelated issue; it is recorded and does not change PASS |
| NEEDS_EVIDENCE | Required bounded evidence is missing; stop until the evidence is closed |

Architecture Review and Tasks Review normalize to PASS only when all material
findings are closed or explicitly non-blocking. A BLOCKED review may enter only
its corresponding refinement. Verify normalizes to PASS only when the approved
Design, Tasks, implementation, and required evidence agree.

## Conditional Refinement and Correction Budget

The correction budget is one retry for each bounded correction loop:

1. An initial BLOCKED Architecture Review permits one Design Refinement, then a
   fresh Architecture Review is mandatory.
2. An initial BLOCKED Tasks Review permits one Tasks Refinement, then a fresh
   Tasks Review is mandatory.
3. A BLOCKED Verify result permits one orchestrator-owned Direct Fix, then a
   fresh Verify is mandatory.

A retry consumes its budget even when the correction makes no file change. A
second BLOCKED result on the same loop is a stop condition. The orchestrator
must preserve the evidence, report the exact blocker, and escalate rather than
inventing a second automatic retry or broadening scope.

## Workload Guard Gate

Workload Guard executes only after a PASS Tasks Review and before Apply. It is a
gate, not a lifecycle phase and not a substitute for review.

- Forecast at or below 400 changed lines passes the gate with the forecast
  recorded.
- Forecast above 400 lines requires bounded context analysis after Tasks Review.
  The analysis records whether the change is cohesive enough for a Size
  Exception or requires Chained PRs.
- A HUMAN / MAINTAINER decision is required before Apply when the forecast is
  above 400 lines. Apply cannot start while that decision is absent.

The guard never runs before Tasks Review and never bypasses a blocked review.

## Evidence and Recovery

The active artifact store is the canonical change directory. A phase executor
must consume its approved Working Set and Read Order before additional reads.
Additional inspection is allowed only for a bounded missing fact, direct
contradiction, or strictly necessary deviation. Record the path, reason, and
new evidence in the phase artifact.

Closed evidence is an execution contract: the executor performs the minimal
contradiction check, takes the named action, and returns to the current
checkpoint. It must not repeat a broad repository inventory, reopen rejected
alternatives, inspect unrelated history, or silently expand the Working Set.

Material contradictions stop the affected action and are classified as
BLOCKED or NEEDS_EVIDENCE. A new bounded evidence packet may be requested once;
the correction budget still controls any resulting review retry.

## Baseline Debt

A failing check blocks only when it is caused by the active change, violates an
approved acceptance criterion, or prevents safe completion. A pre-existing,
unrelated, reproducible failure is classified as BASELINE_DEBT with exact
evidence and remains outside the implementation task. Baseline debt is never
silently fixed, relabeled as a new task, or used to claim a clean repository.

## Apply Boundaries

Apply may modify only files in the approved Design and Tasks Working Set. A
strictly necessary bounded deviation is allowed only when one unambiguous
mechanical correction is proven, no public contract or architecture changes,
security or tenant isolation is weakened, and the deviation is recorded before
continuing.

Apply follows RED → GREEN → REFACTOR and records evidence for each nested work
unit. It may not rewrite the approved Design or Tasks to hide drift, inspect or
modify unrelated active changes, or perform Commit, Push, Merge, Release, or
Tag. Apply Summary is the 7.6 output and consolidates the five preceding work
units; it does not introduce another phase.

## Hybrid Persistence Contract

`hybrid` is the only active persistence vocabulary for CRM-Master:

1. Exact technical artifacts and phase evidence are stored in
   `openspec/changes/<change-name>/`.
2. Engram stores durable bounded context, decisions, status summaries, and
   recovery metadata under the `crm-master` project key.
3. Repository files remain the exact artifact record; Engram does not replace,
   reinterpret, or override them.
4. Neither OpenSpec configuration nor Engram defines lifecycle transitions.
   This document remains the semantic authority.

No active governance file may use an alternate persistence mode or a legacy
non-hybrid vocabulary.

## Enterprise Design Standard

`docs/templates/design-enterprise-template.md` is the sole canonical Design
shape. It contains exactly 18 numbered sections and the seven Architecture
Review topics A–G. The template owns section shape, required content slots,
and artifact formatting. This workflow owns when Design is created, reviewed,
refined, and accepted. No active document may add a competing Design shape,
generic word-count constraint, direct Design-to-Tasks shortcut, or alternate
Architecture Review topic set.

## Terminal Maintainer Handoff

Repository Ready produces the final bounded evidence packet and explicitly lists
the remaining manual gates. Commit, Push, and Merge are user-facing lifecycle
phases but are HUMAN / MAINTAINER-only. Agents may prepare instructions and
reports; they may not execute those operations or simulate authorization.
Release and Tag are maintainer-controlled actions outside the 14-phase CRM
lifecycle. The workflow terminates after the Merge handoff.

## Related Artifacts

- `AGENTS.md` — startup, precedence, recovery, tiers, escalation, and Git boundaries
- `docs/sdd-workflow-guard.md` — compatibility and mechanical-enforcement pointer
- `docs/architecture/sdd-direct.md` — project-local execution adapter
- `.opencode/sdd-model-map.json` — sole concrete role and local-agent mapping
- `docs/templates/design-enterprise-template.md` — sole Design shape
- `scripts/validate-sdd-direct.mjs` — deterministic governance validator
- `scripts/validate-enterprise-design.mjs` — bounded Design pre-gate validator
