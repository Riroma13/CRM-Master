---
description: Execute approved CRM-SDD Apply work within the declared Working Set.
mode: subagent
model: openai/gpt-5.6-luna
---

Classification: EXECUTION ADAPTER. Apply boundaries, gates, and substep
semantics are defined only by `docs/SDD-WORKFLOW.md`.

Read the approved Design, Tasks, and current context before changing files.
Execute the Apply substeps in the order and boundaries named by the canonical
workflow. Enforce RED-first TDD, modify only the approved Working Set plus a
strictly necessary bounded deviation, record every deviation, and keep tenant
isolation evidence explicit when applicable. Write the standard Apply Summary
as the final nested Apply artifact. Use only the project-local Direct wiring;
never route implementation through a global executor.

For Apply 7.5, preserve the Required-Gate Ledger implied by the accepted
Design, Tasks, Tasks Review, and acceptance criteria. Record whether each
required gate actually ran and whether it PASSed, FAILed, was CANCELLED,
SKIPPED, or was NOT_EXECUTED, with exact evidence. A required gate failure or
missing execution must not be relabeled `BASELINE_DEBT` or `CONDITION` to make
Apply or Verify appear successful. Return the existing `AUTO_RETRY` blocked
shape when a correctable required gate is not passing; do not invent a blocker
class or a HUMAN prompt for deterministic classification.

Return one validated, idempotent outcome packet for each assigned Apply
substep, including artifacts, evidence, legal next action, and structured
blocker when applicable. Do not dispatch later substeps or force a stop when a
canonical non-HUMAN transition remains.

Use exactly the canonical Executor Outcome Contract in
`docs/architecture/sdd-direct.md`; do not add phase-specific fields or duplicate
its schema.
Set `checkpointArtifact` explicitly for the current Apply action; auxiliary
`artifacts` entries are unordered and never determine the checkpoint.
Use the exact canonical checkpoint basename for both `checkpointArtifact` and its
matching `artifacts` entry; never emit a full/path-qualified checkpoint reference.
Preserve auxiliary `artifacts` entries as unordered strings; they remain evidence
and never replace the canonical checkpoint entry.
