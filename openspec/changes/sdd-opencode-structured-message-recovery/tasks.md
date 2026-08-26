# Tasks: OpenCode Structured Message Recovery

## Review Workload Forecast

Estimated changed lines: 300–380; two scripts plus root entries. The change is cohesive and below the review budget.

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| 1 | Probe and deterministic contracts | `pnpm test:opencode-structured-message-recovery` | `pnpm opencode:probe:structured-message-recovery` (opt-in) | New scripts and root entries only |

## Exact Working Set and Read Order

Working Set: `scripts/opencode-structured-message-recovery.mjs` (create), `scripts/opencode-structured-message-recovery.test.mjs` (create), `package.json` (root scripts only), `design.md`, `architecture-review.md`, `scripts/sdd-runtime.mjs`, `.opencode/package.json`, `.opencode/package-lock.json`, and four installed v2 SDK declarations. Do not modify any other file.

Read Order: (1) Design, Architecture Review, and change `.sdd-runtime/state.json`; (2) implementation targets and SDK declarations; (3) derive RED-first scopes; (4) run Design pre-gate and bounded mechanical validation.

## Phase 1: RED Contracts

- [S] 1.1 Add failing deterministic tests for the superseded SDK `promptAsync` probe contract, schema fingerprint/disposal, requested identity, transport-envelope rejection, and plugin provenance.
- [S] 1.2 Add failing mechanical tests for the superseded SDK/HTTP transport and persisted Message + Parts recovery plane.
- [S] 1.3 Add recovery fixtures for the superseded SDK/API restart and abort probe.

## Phase 2: GREEN Probe

- [S] 2.1 Create the disposable real-server SDK probe. Superseded by the authorized Direct CLI execution-plane correction.
- [S] 2.2 Implement SDK/HTTP restart and interruption recovery. Superseded; SDK/server/SSE execution is prohibited for the current scope.
- [S] 2.3 Implement the old probe's RootCause classification and external limitation report. Superseded by the Direct adapter's fail-closed status/result classes and deterministic compatibility fixtures.
- [x] 2.4 Add only `test:opencode-structured-message-recovery` and `opencode:probe:structured-message-recovery` to root `package.json`.

## Phase 3: Checkpoints and Acceptance

- [S] 3.1 The opt-in serve/SDK/SSE probe portion is superseded and must not run; the current direct-scope focused tests, validators, design validation, syntax, runtime, and trace checks passed.
- [S] 3.2 The old RED-case checkpoint contract is superseded by the Direct CLI adapter contract; current-scope evidence proves NDJSON/sessionID/export/identity/result validation and unchanged runtime state. No real Terra result is implied.
- [x] 3.3 Stop and escalate to HIGH/HUMAN for version, runtime, dependency, authority, trust, or scope change; prohibit TUI scraping, undocumented storage, source patching, fabricated results/identity, runtime/workflow changes, dependency upgrades, product tests, or `sdd-low-executor-resilience` reopening.

Post-Tasks Review boundary: return only to `Tasks Review`; Workload Guard runs only after a PASS Tasks Review and before Apply.

## Task Status Legend

- `[x]` = implemented and deterministically validated in the current scope.
- `[S]` = explicitly superseded/not applicable in the current scope; not an incomplete implementation task and not a PASS claim.
- `[ ]` = genuinely incomplete current-scope work.

## Apply Reconciliation Notes

- The direct CLI adapter (`scripts/opencode-cli-adapter.mjs`) is the authoritative semantic execution path and is covered by its deterministic tests: one `opencode run --format json` child, session ID capture, post-exit `opencode export`, complete export parsing, persisted identity validation, and fail-closed result validation.
- The HUMAN_REOPEN runtime primitive and deterministic coverage are proven in `scripts/sdd-runtime.test.mjs`; this Apply checkpoint does not modify or re-run the lifecycle primitive.
- Tasks 1.1–1.3, 2.1–2.3, 3.1, and 3.2 are marked `[S]`: they describe the superseded serve/SDK/SSE execution plane, not incomplete current-scope work. The Direct CLI replacement is separately evidenced; no unsupported probe behavior or real Terra result is claimed.
