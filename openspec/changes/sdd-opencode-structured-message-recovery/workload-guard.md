---
phase: Workload Guard
role: MID
status: PASS
next: Apply 7.1 Foundation
change: sdd-opencode-structured-message-recovery
estimated_lines: 380
delivery: within-budget
chain_strategy: none
human_required: false
---

# Workload Guard: OpenCode Structured Message Recovery

## Verdict

**PASS.** The approved Tasks forecast is 300–380 changed lines. The upper
bound of 380 is within the canonical 400-line budget, so no Size Exception or
Chained PR decision is required before Apply.

## Evidence

- Tasks Review is PASS and is the immediate preceding gate.
- `evaluateWorkloadGuard({ estimatedLines: 380, delivery: "within-budget", chainStrategy: "none", exception: false })` returned `PASS / within-budget`.
- The approved change is cohesive: one disposable probe, one focused test file,
  and two root package-script entries.
- No dependency, runtime, SDD workflow, product, or protected-change mutation is
  authorized by this gate.

## Required Next Action

The only legal next action is **Apply 7.1 Foundation**. Apply remains bounded by
the approved Design and Tasks Working Set and must preserve the no-Git boundary.
