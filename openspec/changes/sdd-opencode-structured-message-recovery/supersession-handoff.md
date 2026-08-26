---
artifact: supersession-handoff
change: sdd-opencode-structured-message-recovery
classification: SUPERSEDED_NON_MERGEABLE
status: STOP
checkpoint_sequence: 27
checkpoint: Verify
git_readiness: REJECTED
replacement_change: sdd-direct-cli-executor
---

# Supersession and Replacement Handoff

## Disposition

This change is **SUPERSEDED_NON_MERGEABLE**. The investigation proved the
correct OpenCode semantic execution architecture, but the historical
Strict-TDD evidence required by this repository is unavailable. The current
change therefore cannot be made mergeable without fabricating evidence or
introducing an unauthorized waiver.

The runtime state, append-only trace, existing tests, diagnostics, and
implementation evidence remain preserved. The runtime checkpoint remains
schema-v2 sequence 27 with a blocked Verify checkpoint and
`gitReadiness: INVALIDATED`; this artifact records the maintainer disposition
as `REJECTED` without rewriting that history.

## Discovered Architecture

- The sole semantic execution plane is:
  `opencode run --format json` → process PID/stdout/stderr/exit code →
  `sessionID` → `opencode export <sessionID>` → persisted runtime identity →
  semantic result validation → deterministic lifecycle transition.
- `opencode serve`, SDK session prompting, SDK prompt APIs, SSE semantic
  observation, and server-instance message recovery are superseded semantic
  paths.
- Phase executors use `mode: all`; the orchestrator remains `mode: primary`.
- Requested agent/provider/model identity is not sufficient. Persisted export
  identity is authoritative, and HIGH execution must prove
  `sdd-direct-verify` / `openai` / `gpt-5.6-terra`.
- Real OpenCode output is NDJSON. Complete machine export output must be
  captured before parsing; bounded diagnostic presentation is separate.
- Invocation-key single-flight behavior, bounded retry, and conservative
  parent-loss recovery are required. Exit code alone is never a semantic PASS.
- `HUMAN_REOPEN` is the append-only recovery primitive for an explicitly
  authorized blocked HUMAN checkpoint.
- Provenance records include concrete path, raw SHA-256, commit, branch, dirty
  state, timestamp, continuity, and authority. The recorded reset continuity
  remains `UNPROVEN`.

## Proven Evidence for the Replacement

The following evidence is reusable as engineering reference only. It is not
retrospective Strict-TDD evidence for this change and must not be presented as
TDD evidence in the replacement:

- `scripts/opencode-cli-adapter.test.mjs` — recorded PASS, 26/26. Covers exact
  CLI invocation, real NDJSON/session-ID parsing, post-exit export ordering,
  complete machine capture, export-shape/identity validation, fail-closed
  mismatch and malformed-result classes, single-flight, retry, and interrupted
  invocation recovery.
- `scripts/opencode-structured-message-recovery.test.mjs` — recorded PASS,
  7/7. Covers retired-path detection, transport/request utilities, identity
  preservation, fail-closed classification, redaction, filesystem isolation,
  and malformed-schema refusal.
- `scripts/sdd-runtime.test.mjs` and `scripts/sdd-resume.test.mjs` — recorded
  PASS, 64/64 and 12/12 respectively after provenance hardening. The focused
  provenance suite recorded PASS, 5/5.
- `export-shape-diagnosis.json` proves that `opencode export` is a complete
  JSON envelope (`info` plus `messages`/`parts`, 288808 bytes, 15 messages),
  but its persisted identity is the orchestrator/Luna identity and is not HIGH
  Verify evidence.
- `verify-export-diagnosis.json` records a valid complete export whose
  persisted identity mismatched the required HIGH Verify executor. It is
  negative identity evidence, not a Verify PASS.
- `apply-summary.md`, `verify-report.md`, `.sdd-runtime/state.json`, and the
  append-only trace preserve the Direct CLI reconciliation, V-001/V-002
  findings, provenance reset, HUMAN_REOPEN, and all recorded fingerprints.

## Strict-TDD Disposition

```text
Strict-TDD historical evidence: UNAVAILABLE
fabrication: PROHIBITED
current change mergeability: REJECTED
```

The repository contract enables strict TDD and requires RED-first evidence;
the historical RED/GREEN/Triangulate/Safety-Net chronology cannot be recovered.
No canonical HUMAN waiver or exception mechanism exists for this condition.
No code was intentionally broken to manufacture a RED state.

## Replacement Recommendation

Start a clean change named **`sdd-direct-cli-executor`** from the canonical
current `main` baseline and run the normal SDD lifecycle beginning at Design.

Before implementation, its Design must incorporate the architecture above.
Its Tasks must split the work into slices that can produce real
Strict-TDD RED → GREEN → Triangulate → Safety-Net evidence during execution.
The current implementation may be consulted as an engineering reference, but
its tests, PASS results, and diagnostics must not be represented as historical
TDD evidence for the replacement.

## Terminal Boundary

This handoff does not Archive the change, mark Repository Ready, alter runtime
state, or perform Commit, Push, Merge, Rebase, Release, Deploy, or Tag.
