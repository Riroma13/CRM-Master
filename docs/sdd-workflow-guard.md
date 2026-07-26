---
status: active
role: canonical transition authority
workflow_doc: docs/SDD-WORKFLOW.md
---

# SDD Workflow Guard

> **Centralized transition validator for the SDD orchestrator.**
> Do NOT duplicate these rules in individual skills or phase prompts.
> The orchestrator is the sole enforcer. The Workflow Guard is the sole
> workflow transition authority.
> **Lifecycle:** see `docs/SDD-WORKFLOW.md` for phase descriptions and roles.

---

## Transition Table

| Current phase       | Allowed next phases      | Forbidden next phases                              |
| ------------------- | ------------------------ | -------------------------------------------------- |
| — (start)           | Design                   | Architecture Review, Tasks, Apply, Verify, Archive |
| Design              | Architecture Review      | Tasks, Apply, Verify, Archive                      |
| Architecture Review | Design Refinement, Tasks | Apply, Verify, Archive                             |
| Design Refinement   | Architecture Review      | Tasks, Apply, Verify, Archive                      |
| Tasks               | Tasks Review             | Apply, Verify, Archive                             |
| Tasks Review        | Tasks Refinement, Apply  | Verify, Archive                                    |
| Tasks Refinement    | Tasks Review             | Apply, Verify, Archive                             |
| Apply               | Verify                   | Archive, Health Report, Commit, Push               |
| Verify              | Archive                  | Health Report, Commit, Push                        |
| Archive             | Health Report            | Commit, Push                                       |
| Health Report       | Repository Ready         | Commit, Push                                       |
| Repository Ready    | Commit                   | Push                                               |
| Commit              | Push                     | —                                                  |
| Push                | — (end)                  | —                                                  |

---

## Conditional Transitions

### Architecture Review → Design Refinement

If the Architecture Review verdict is `REJECTED` or `APPROVED WITH CONDITIONS`,
the next phase MUST be **Design Refinement**.

If the verdict is `APPROVED`, the next phase is **Tasks** (skip Design Refinement).

### Tasks Review → Tasks Refinement

If the Tasks Review produces conditions or corrections,
the next phase MUST be **Tasks Refinement**.

If the review is clean (no conditions), the next phase is **Apply**.

### Tasks Refinement → Tasks Review

After refinement, the review must run again.
Only after a clean review can the workflow proceed to Apply.

---

## Guard Rules

### Rule 1 — Validate Before Delegation

Before invoking any sub-agent for the next phase, the orchestrator MUST:

1. Identify the current phase (from artifact store or session state).
2. Look up the current phase in the Transition Table.
3. If the requested next phase is in **Forbidden**, BLOCK the transition:
   - Do NOT invoke the sub-agent.
   - Explain which phase is expected next.
   - Wait for user confirmation.
4. If the requested next phase is in **Allowed**, proceed normally.

### Rule 2 — Conditional Check

If the transition is conditional (Architecture Review → Design Refinement,
Tasks Review → Tasks Refinement), check the condition BEFORE delegating:

- Architecture Review: read the verdict from the review output.
  - `REJECTED` or `APPROVED WITH CONDITIONS` → Design Refinement required.
  - `APPROVED` → proceed to Tasks.
- Tasks Review: read the review output.
  - If conditions exist → Tasks Refinement required.
  - If clean → run Review Workload Guard (Rule 5) BEFORE authorizing Apply.

### Rule 3 — No Skipping

Every phase in the workflow MUST be visited at least once.
Skipping from Design to Apply, or from Tasks to Verify, is ALWAYS invalid.

Exception: Design Refinement and Tasks Refinement may be skipped
when the respective review produces no conditions.

### Rule 4 — No Re-entrance Without Condition

A phase cannot be re-entered unless the preceding review demands it:

- Architecture Review → Design Refinement (re-enters refinement)
- Tasks Review → Tasks Refinement (re-enters refinement)
- Design Refinement → Architecture Review (re-enters review)
- Tasks Refinement → Tasks Review (re-enters review)

Direct re-entrance (e.g., Design → Design) is ALWAYS invalid.

### Rule 5 — Review Workload Guard (Execution Order & Bounded Context Analysis)

**IMPORTANT — Execution order.** The Review Workload Guard runs AFTER
Tasks Review (and only if the review is clean), NOT after Tasks.

Correct sequence:

```
Tasks → Tasks Review → [if clean] → Review Workload Guard → Apply decision
```

If the Review Workload Guard executes after Tasks (before Tasks Review),
it violates the official workflow. BLOCK the transition.

When the Review Workload Forecast exceeds 400 lines, the orchestrator MUST
analyze the change's scope before recommending Size Exception or Chained PRs.
This analysis happens AFTER Tasks Review confirms the tasks are sound.

**Apply the Complexity Score:**

| Criterion                     | Points | Reason                                               |
| ----------------------------- | ------ | ---------------------------------------------------- |
| > 1500 estimated LOC          | +2     | Large change, hard to review                         |
| Multiple bounded contexts     | +2     | Touches 2+ modules with independent ownership        |
| Shared contracts modified     | +2     | Changes in `packages/shared/` affect all consumers   |
| Existing consumers            | +2     | Migration risk for current callers                   |
| Migration required            | +2     | Schema migration, data migration, or breaking change |
| Multiple repositories/modules | +1     | Cross-package coordination                           |
| Backward compatibility        | +1     | Must preserve existing behavior                      |

**Score interpretation:**

| Score | Recommendation             |
| ----- | -------------------------- |
| ≤ 3   | Size Exception (single PR) |
| ≥ 4   | Chained PRs                |

**How to score:**

- Sum points for each criterion that applies to the current SPEC.
- Base the estimate on the Tasks Review Workload Forecast.
- **Multiple bounded contexts**: the change touches 2+ modules that own
  different data (e.g., NotificationModule + CommunicationModule).
- **Existing consumers**: 1+ modules currently depend on the code being
  changed. Migration planning required.
- **Migration required**: Prisma migration, data backfill, or breaking
  API change. Not just adding new optional columns.

**The recommendation is advisory.** The user makes the final decision.
If the user overrides the recommendation, record the override and reason.

**Default chain strategy:** When the recommendation is Chained PRs and the user
does not specify a strategy, default to **stacked-to-main**.

---

## Guard Execution Order (MANDATORY)

The guards execute in a fixed order. Violating this order is a workflow
violation.

### Rule 6 — Workflow Guard Priority

Workflow validity ALWAYS has higher priority than workload analysis.

The Review Workload Guard must NEVER bypass the Workflow Guard.

### Execution sequence

```
After Tasks:

  1. Generate tasks.md.
  2. STOP.
  3. Do NOT execute Review Workload Guard.
  4. Do NOT forecast Apply.
  5. Wait for Tasks Review.

After Tasks Review (conditions exist):

  1. Wait for Tasks Refinement.
  2. After refinement, repeat Tasks Review.
  3. Only after clean review → continue below.

After Tasks Review (clean — no conditions):

  1. ✅ Workflow Guard authorizes the transition Tasks Review → Apply.
  2. ▶️ THEN execute Review Workload Guard (Rule 5):
     a. Read Review Workload Forecast from tasks.md.
     b. If ≤ 400 lines → proceed to Apply.
     c. If > 400 lines → apply Bounded Context Analysis:
        - Single BC + Single SPEC + Cohesive → recommend Size Exception.
        - Otherwise → recommend Chained PRs.
     d. Ask user for decision.
  3. Wait for user confirmation before Apply.
```

### Summary

| Step                       | Action                        | Guard                                              |
| -------------------------- | ----------------------------- | -------------------------------------------------- |
| After Tasks                | STOP. No workload analysis.   | Workflow Guard blocks Apply                        |
| After Tasks Review (clean) | Run Workload Guard. Ask user. | Workflow Guard authorizes → Workload Guard advises |
| User confirms              | Launch Apply                  | Both guards satisfied                              |

---

## File location

This guard is the SINGLE source of truth for SDD workflow transitions.
All orchestrator instances MUST read this file at session start
and validate every transition against it.

Do not create additional workflow guard files.
Do not embed transition rules in individual skills.

---

## Direct Mode (Opt-In, Project-Local)

This section extends the shared Workflow Guard for the project-local
SDD-Direct mode. All rules above remain unchanged for the legacy/Gentle-AI
workflow. Direct mode is additive and does not modify the legacy dispatcher,
review lifecycle, or global configuration.

### Direct Authority Boundary

- The sole canonical active artifact store is
  `openspec/changes/<change-name>/`.
- SDD-Direct reads and writes those artifacts directly.
- Direct mode does not consult dispatcher state, native review lifecycle
  state, or any other workflow state; those states are irrelevant to Direct.
- `docs/sdd-direct/changes/` is not an artifact location and must not be
  created or referenced as a store.
- The Enterprise Design Standard remains the existing 18-section standard;
  `docs/templates/design-enterprise-template.md` is not duplicated or changed.

### Direct Workflow

```text
Design → Architecture Review → Design Refinement only on BLOCKER → Tasks → Tasks Review → Tasks Refinement only on BLOCKER → Workload Guard → Apply 1–5 → Apply Summary → Verify → Archive → Health Report → Repository Ready → STOP.
```

The Direct decision model is classification-based:

- `BLOCKER` requires the corresponding refinement and a repeat review.
- `CONDITION` → continue after recording the condition and owner.
- `NON-BLOCKING` → continue without refinement.
- Resolved findings are closed and remain closed unless new evidence creates a
  new finding; closed findings are not reopened by default.

After an approved Tasks Review, Direct mode automatically executes the
Workload Guard and then Apply 1–5, Apply Summary, Verify, Archive, Health
Report, and Repository Ready. It does not wait for a second approval between
those non-destructive phases. The Workload Guard remains advisory and records
its result in the change artifacts.

### Direct Terminal Gates

Health Report and Repository Ready use the shared
`docs/templates/terminal-gates-template.md`. They must explicitly record the
remaining maintainer-controlled gates. Commit, Push, Merge, Release, and Tag
are manual destructive gates; Direct mode stops at Repository Ready and never
performs them automatically.

### Direct Transition Rules

1. Start Direct only with a declared `<change-name>` and the canonical change
   directory under `openspec/changes/`.
2. Design must be complete under the unchanged Enterprise Design Standard
   before Architecture Review.
3. Only a `BLOCKER` may authorize Design Refinement or Tasks Refinement.
4. A clean Tasks Review authorizes the automatic post-review execution chain;
   a `CONDITION` or `NON-BLOCKING` finding does not pause that chain.
5. Every phase returns a structured result and records its evidence in the
   canonical change directory.
6. Archive, Health Report, and Repository Ready cannot bypass a completed
   Verify result or the preceding artifact checks; they are forbidden while
   Verify is `BLOCKED`.
7. Direct-specific agents may not perform Commit, Push, Merge, Release, or
   Tag. Those transitions require an explicit maintainer action outside the
   Direct workflow.

### Direct Verify Recovery

For Direct mode, the normal `Verify → Archive` transition is valid only when
Verify returns `VERIFIED`. A blocked result follows this legal recovery loop:

```text
Verify BLOCKED -> orchestrator-owned Direct Fix -> Verify
```

Direct Fix is a repair mode owned by `sdd-direct-orchestrator`; it is not an
agent or a phase agent. It may modify only what is necessary to resolve the
concrete Verify blocker. The approved Design and Tasks remain unchanged unless
the blocker proves a real contract inconsistency. After the repair, control
returns to Verify for revalidation. While Verify is `BLOCKED`, Archive, Health
Report, and Repository Ready are forbidden.

### Compatibility and Rollback

Direct mode is selected only through the project-local
`.opencode/commands/sdd-direct.md` command and its Direct-specific agents.
Existing legacy/Gentle-AI agents, commands, state, templates, and global
configuration remain untouched. Rolling back Direct mode means removing the
project-local Direct agents/command and Direct documentation/validator; it
does not migrate, rewrite, or delete artifacts under `openspec/changes/`.
