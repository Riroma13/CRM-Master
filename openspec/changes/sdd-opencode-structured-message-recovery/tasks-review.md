---
phase: Tasks Review
role: MID
status: PASS
next: Workload Guard
change: sdd-opencode-structured-message-recovery
confidence: High
---

# Tasks Review: OpenCode Structured Message Recovery

## Verdict

**PASS.** The single permitted Tasks Refinement closed TR-01 and TR-02. The
refined plan is complete, minimal, RED-first, dependency-ordered, and
acceptance-checkable without changing the approved Design or scope.

## Findings

| ID | Classification | Confidence | Disposition |
|---|---|---:|---|
| TR-01 | CLOSED | High | Tasks 1.1 and 2.1 require exact CLI, SDK, server-command, and `@opencode-ai/plugin` 1.18.4 provenance, including lockfile `resolved` URL and `integrity`, with an unchanged snapshot and no mutation. |
| TR-02 | CLOSED | High | Tasks 1.2 and 2.2 require exact list and specific-message GET paths plus a distinct official `POST /session/{sessionID}/prompt_async` URL/body fixture; real dispatch remains typed flattened SDK-only. |

## Completeness and Ordering Evidence

- Tasks 1.1–1.3 provide RED coverage before the probe: flattened
  `promptAsync`, requested model identity, schema fingerprint/disposal,
  rejection of `{ path, body }`, exact transport paths/body, persisted
  Message + Parts and authoritative assistant ID, structured/text controls,
  malformed schema, `StructuredOutputError`, SDK/API errors, restart, abort
  interruption, redaction, and no SDD-state writes.
- Tasks 2.1–2.4 provide the corresponding GREEN implementation in dependency
  order: provenance and disposable workspace, typed dispatch and supported
  SDK/HTTP recovery, fail-closed exact one-of root-cause classification, then
  root scripts.
- Tasks 3.1–3.3 make acceptance checkable and preserve the prohibition on
  model substitution, schema-object dependence, dependency/runtime mutation,
  product tests, source patching, scraping, undocumented storage, fabricated
  evidence, and reopening `sdd-low-executor-resilience`.
- Working Set and Read Order remain bounded and accurate. Tenant isolation is
  N/A by design; temporary-workspace and no-CRM-access evidence is explicit.
- No product files, dependency files, runtime files, or protected change files
  are approved for mutation.

## Contract and Provenance Evidence

- `.opencode/package.json` fixes `@opencode-ai/plugin` at `1.18.4`; the lock
  resolves the package to the npm tarball with an integrity hash and records
  `@opencode-ai/sdk` `1.18.4`.
- Installed v2 declarations support flattened
  `client.session.promptAsync({ sessionID, messageID, model, agent, format,
  parts })`, `messages`, `message`, and `abort`.
- Generated transport declarations separately prove
  `GET /session/{sessionID}/message`, `GET
  /session/{sessionID}/message/{messageID}`, and
  `POST /session/{sessionID}/prompt_async` with path `sessionID` and body
  `{ messageID, model, agent, format, parts }`; both retrieval responses carry
  `info` and `parts`.

## Workload Verdict

- Forecast: **Low**, estimated **300–380 changed lines**.
- Chained PRs: **No**; decision before Apply: **No**; chain strategy: `pending`.
- Workload Guard is required next and has not been executed by this review.
- Confidence: **High**.

## Validation Evidence

- `pnpm sdd:validate`: PASS (bounded project-local Direct governance).
- `pnpm sdd:validate:design -- openspec/changes/sdd-opencode-structured-message-recovery/design.md`: PASS (approved Design unchanged).
- No implementation, test suite, Workload Guard, Apply, Verify, or Git operation was performed.

## Legal Next Action

`Workload Guard` only. It is legal because this fresh Tasks Review is PASS and
must run before Apply. No further Tasks Refinement is legal or required.
