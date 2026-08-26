---
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:566a9bf763a61f96eab0e805c8a5910ef67a903e72ce2d1b24ef37d2773dcf30
phase: Verify
role: HIGH
verdict: BLOCKED
blockers: 1
critical_findings: 2
requirements: 0/0
scenarios: 0/0
test_command: pnpm test:opencode-cli-adapter
test_exit_code: 0
test_output_hash: sha256:ea40ca6d92c82ed15f9e38022f6d800feba9400dcdf1da48b9ce804d2178d1fc
build_command: node --check scripts/opencode-cli-adapter.mjs && node --check scripts/opencode-structured-message-recovery.mjs && node --check scripts/sdd-runtime.mjs && node --check scripts/validate-sdd-direct.mjs
build_exit_code: 0
build_output_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
---

# Verification Report: OpenCode Structured Message Recovery

**Change:** sdd-opencode-structured-message-recovery  
**Mode:** Strict TDD  
**Checkpoint:** schema-v2 sequence 24, `READY`, legal action `Verify`

## Verdict

**BLOCKED.** Deterministic implementation and governance checks pass, but the
approved Design still requires the retired serve/SDK/SSE semantic plane while
the final Apply Summary and current implementation establish Direct CLI as the
sole semantic plane. This is a material Design/Working Set contradiction, not
a mechanical Apply deviation. Strict-TDD Apply evidence is also absent.

No Terra Verify PASS is claimed. The prior Verify export diagnosis is valid
JSON but proves `sdd-direct-orchestrator`, not the required
`sdd-direct-verify` persisted identity; it is negative identity evidence only.

## Completeness

| Metric | Value |
|---|---:|
| Current tasks | 11 |
| `[x]` complete | 2 |
| `[S]` explicitly superseded/not applicable | 9 |
| `[ ]` unchecked current work | 0 |
| Delta-spec requirements/scenarios | 0 / 0 (none present) |

## Acceptance Evidence

| Acceptance area | Result | Independent evidence |
|---|---|---|
| Direct CLI is the only semantic plane | PASS in implementation; **conflicts with Design** | Adapter uses `opencode run --format json` followed by post-exit `opencode export`; recovery utility test passed and source has no live serve/SDK/SSE path. Design §§2, 4, 5, 6, 11, and 16 still require that retired plane. |
| Seven phase executors `mode: all`; orchestrator `primary` | PASS | Static check: `acceptance-static: PASS tasks-no-unchecked=1 executors-all=7 orchestrator-primary=1`; governance validator passed. |
| Role mappings unchanged | PASS | Model map and validator prove HIGH/Terra, MID/Luna, LOW/LongCat. |
| Persisted identity is authoritative; HIGH cannot be orchestrator/Luna | PASS | Adapter tests 15, 16, 22, and 23 passed. `verify-export-diagnosis.json` records valid complete export but `RUNTIME_IDENTITY_MISMATCH` (`sdd-direct-orchestrator` vs `sdd-direct-verify`). |
| NDJSON, complete export, diagnostic separation | PASS | Adapter tests 3–5, 9–15 passed; complete machine capture is distinct from bounded diagnostics. |
| Exit code is insufficient | PASS | Adapter test 19 passed. |
| Single-flight/idempotency and interruption recovery | PASS | Adapter tests 1, 6, 17, 21, and 25 passed. |
| HUMAN_REOPEN is append-only, exact-sequence, HUMAN-only | PASS | Runtime tests 46–48 passed; trace 22 has `operation: HUMAN_REOPEN`, role HUMAN, 21→22, source `HUMAN_HANDOFF`; trace/state validation passed at sequence 24. |
| Serve/SDK/SSE semantic path retired | PASS in implementation; **conflicts with Design** | Recovery utility test 1 and adapter test 26 passed. |
| Git untouched | PASS (bounded evidence) | No Git command was run by this executor; runtime tests include the Git mutation barrier. |
| Tenant isolation | N/A, proven | Tooling scope accesses no CRM tenant, Host context, Prisma client, or database; isolation utility test passed. |

## Commands and Exact Output Evidence

| Command | Exit | Result | SHA-256 exact output |
|---|---:|---|---|
| `pnpm test:opencode-cli-adapter` | 0 | PASS, 26/26 | `ea40ca6d92c82ed15f9e38022f6d800feba9400dcdf1da48b9ce804d2178d1fc` |
| `pnpm test:opencode-structured-message-recovery` | 0 | PASS, 7/7 | `b1253984c583f4577b7635e498a5261c790582ad2690ed664491d06b5f33af9c` |
| `pnpm test:sdd-runtime` | 0 | PASS, 59/59 | `b85f4841b268de0ae19468850919bdb40011a2434f717c821cc3dd9492b03996` |
| `pnpm sdd:validate` | 0 | PASS | `5ac4b7e7759460826a732e49fbc82a120a41bbffeaee9d3b420a173ff0e38552` |
| `pnpm sdd:validate:design -- openspec/changes/sdd-opencode-structured-message-recovery/design.md` | 0 | PASS | `9dd6108a99a1ea0d4d7453da7bab9501c1daf6d04f2be234ed2f72f9f9b89e38` |
| Four-file `node --check` command in envelope | 0 | PASS | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Change-local trace/state validation | 0 | PASS, sequence 24 / 24 traces / Verify | `53af0479682be6f89e01c830ed99385de5a668166aa79f097f898215fcf567fe` |
| Static task/mode check | 0 | PASS | `60c9523f3514f30a0372410587b1d674ec9ade16167a47b07db2b1935640c506` |

Build/type evidence is the bounded Node syntax check. No change-scoped linter,
type-checker, build target, or coverage runner is declared for these Node
scripts; full product build/lint is outside the approved tooling-only scope.

## TDD Compliance

| Check | Result | Details |
|---|---|---|
| TDD Cycle Evidence reported | ❌ | No `apply-progress` artifact or TDD Cycle Evidence table exists. |
| RED/GREEN verification | ❌ | Current tests pass, but required per-task RED/Green provenance cannot be verified. |
| Test layer distribution | ➖ | 33 focused Node unit tests across two change-specific files; no change-specific integration/E2E runner. |
| Changed-file coverage | ➖ | No coverage tool is declared. |
| Assertion quality | ✅ | Reviewed focused assertions exercise adapter/runtime utilities and failure paths; no tautology or ghost-loop finding. |

## Findings

### CRITICAL

1. **Design/implementation material contradiction.** The approved Design
   authorizes and requires an isolated `opencode serve` plus SDK/HTTP recovery
   probe, while the Apply Summary says that plane is retired and Direct CLI is
   authoritative. Its Working Set excludes the Direct adapter, runtime,
   validator, and seven agent files now fingerprinted in state. The workflow
   permits PASS only when Design, Tasks, implementation, and required evidence
   agree.
2. **Strict-TDD evidence missing.** `openspec/config.yaml` enables strict TDD,
   but no Apply progress artifact records the required RED/GREEN/Triangulate/
   Safety Net evidence. Passing current tests cannot recreate that historical
   evidence.

### WARNING

None.

## Narrow Required Correction Evidence

A maintainer-authorized, canonically recorded resolution is required because
Design Refinement is already exhausted and the semantic-plane replacement is
architectural. It must reconcile the approved Design and Working Set with the
Direct CLI scope, preserve the one-Direct-plane prohibition, and provide a
strict-TDD Apply evidence record for the current changed files. Then a fresh
HIGH Verify may assess the reconciled artifacts. Do not alter task markers or
state merely to conceal this contradiction.

## Legal Next Action

`Verify` remains the requested action only after a HUMAN / MAINTAINER resolves
the fatal scope/authority contradiction. Archive is not legal.
