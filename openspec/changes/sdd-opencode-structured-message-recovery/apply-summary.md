---
phase: Apply 7.6 Apply Summary
role: MID
status: PASS
next: Verify
change: sdd-opencode-structured-message-recovery
---

# Apply Summary — Nested Apply Substep 7.6

## Executive Summary

Apply reconciled the implementation around the project-local Direct CLI adapter
and removed the obsolete semantic serve/SDK/SSE execution plane. The adapter is
the only authoritative semantic path: one `opencode run --format json` child,
NDJSON parsing and sessionID capture, then one post-exit `opencode export
<sessionID>` with complete machine capture, export parsing, persisted identity
validation, and fail-closed result validation.

The authorized seven-agent mode correction was applied and statically validated.
HUMAN_REOPEN is proven by the existing runtime tests and was not repeated here.
The obsolete opt-in serve/SDK/SSE probe is not an Apply prerequisite: it was
explicitly superseded by the authorized Direct CLI execution-plane correction.
Fresh HIGH Verify remains the next gate; no Verify PASS or real Terra result is
claimed here.

## Phases Completed

| Apply substep | Focus | Files Created | Files Modified | WSA |
|---|---|---:|---:|---:|
| 7.1 | Foundation | 0 | 0 | 100% |
| 7.2 | Core Engine | 0 | 0 | 100% |
| 7.3 | Feature Implementation | 0 | 0 | 100% |
| 7.4 | Integration | 0 | 0 | 100% |
| 7.5 | Testing and reconciliation | 0 | 11 | bounded deviations recorded |
| **7.6 Summary** | Consolidated Apply evidence | **1** | **0** | bounded |

## Implementation Evidence

- Direct CLI runtime path: `scripts/opencode-cli-adapter.mjs` invokes exactly
  `opencode run --dir ... --agent ... --model provider/model --format json`,
  parses real NDJSON, requires a consistent sessionID, and performs export only
  after child exit.
- Export evidence: machine capture preserves the complete JSON envelope up to
  the explicit ceiling, records exit code/size/hash, parses `info` plus all
  `messages` and `parts`, and rejects malformed, overflowed, failed, or
  identity-incomplete exports.
- Identity/result evidence: persisted agent/provider/model must match the
  request and HIGH authority; semantic packets are parsed from persisted text
  and validated against change/action/role/next.
- HUMAN_REOPEN: existing deterministic runtime coverage proves the single
  append-only transition from sequence 21 HUMAN_HANDOFF to sequence 22 READY
  with `Apply 7.5 Testing` as the next action and preserved attempts/fingerprints.
- Tenant isolation: N/A. This change accesses no CRM tenant, Host context,
  Prisma client, or database. Probe workspace isolation remains explicitly
  tested as a filesystem boundary.

## Superseded Semantic Plane

`scripts/opencode-structured-message-recovery.mjs` no longer starts an
`opencode serve` instance, creates SDK sessions, calls SDK prompt/promptAsync,
subscribes to SSE, polls session state, or performs SDK/HTTP recovery. Those
operations were solely the old semantic execution plane and are superseded.
The file retains only deterministic request-shape, classification, identity,
redaction, isolation, and report utilities that remain useful as fixtures and
compatibility diagnostics. Its direct invocation is inert and points to the CLI
adapter; the old opt-in real probe was not run.

## Mode Correction

Exactly these seven frontmatters changed `mode: subagent` to `mode: all`, with
models, permissions, descriptions, and roles unchanged:

`sdd-direct-design`, `sdd-direct-architecture-review`, `sdd-direct-apply`,
`sdd-direct-verify`, `sdd-direct-archive`, `sdd-direct-health-report`, and
`sdd-direct-repository-ready`. `sdd-direct-orchestrator` remains `primary`.
`scripts/validate-sdd-direct.mjs` now deterministically validates this mapping.

## Tasks Reconciliation

Completed: 2.4 and 3.3. Superseded/not applicable in the current scope: 1.1–1.3,
2.1–2.3, 3.1, and 3.2. These describe the retired serve/SDK/SSE probe and its
old acceptance contract; they are marked `[S]` in `tasks.md`, not marked PASS.
No unsupported serve/SDK result is claimed.

## Corrections and Bounded Deviations

1. **Agent frontmatter deviation (HUMAN-authorized):** seven project-local mode
   values corrected to `all`; validator expectation updated. No model or
   permission changed.
2. **Apply artifact deviation (HUMAN-authorized):** this canonical 7.6 summary
   records the final bounded reconciliation.
3. **Superseded-path cleanup deviation (HUMAN-authorized):** old recovery script
   and tests were reduced to deterministic utilities because the old semantic
   serve/SDK/SSE path conflicts with the now-authoritative Direct CLI contract.
   No direct adapter, fail-closed check, runtime state, dependency, or product
   source was changed.

## Validation and Acceptance Evidence

Focused deterministic commands and results:

- `pnpm test:opencode-cli-adapter` — PASS, 26/26 tests.
- `pnpm test:opencode-structured-message-recovery` — PASS, 7/7 tests.
- `pnpm test:sdd-runtime` — PASS, 59/59 tests, including HUMAN_REOPEN and
  trace validation.
- `pnpm sdd:validate` — PASS, including seven `mode: all` bindings and
  orchestrator `mode: primary`.
- `pnpm sdd:validate:design -- openspec/changes/sdd-opencode-structured-message-recovery/design.md` — PASS.
- `node --check` for the CLI adapter, recovery utility, and Direct validator —
  PASS.

The opt-in real probe was deliberately **not run**. Therefore real structured
message recovery, real Terra identity, and Verify PASS remain unproven.

## Overall Metrics

| Metric | Value |
|---|---:|
| Working Set Accuracy | bounded; deviations listed above |
| Unexpected Files | 0 |
| Unexpected Dependencies | 0 |
| Total Files Created | 1 |
| Total Files Modified | 11 |
| Tenant-isolation impact | N/A; no tenant data path |

## Overall Apply Verdict

**PASS** — the approved current Direct CLI Apply scope is complete and
deterministically validated. The obsolete opt-in serve/SDK/SSE probe is not a
remaining blocker. Legal next action is exactly one Fresh HIGH Verify after the
parent performs final pre-Verify validation. Do not claim Verify PASS or Terra
evidence from this artifact.
