# Design: sdd-opencode-structured-message-recovery — OpenCode Structured Message Recovery

> **Status:** Draft
> **Working document.** This design does not change the SDD pipeline.

---

## 1. Executive Summary

The current OpenCode 1.18.4 path can execute a real child but cannot recover its persisted structured messages: both typed `session.messages` and official `GET /session/:id/message` return `Expected OutputFormatJsonSchema`. This change adds a minimal, isolated compatibility probe that proves or disproves supported structured-message recovery without touching `sdd-low-executor-resilience`, SDD state, dependencies, or production recovery behavior. It records reproducible evidence for structured and non-structured controls, including restart and interruption cases. A confirmed platform incompatibility remains fail-closed rather than being hidden by an adapter.

## 2. Technical Approach

Use the installed v2 SDK (`@opencode-ai/sdk` 1.18.4) to start a local `opencode serve` process and create disposable probe sessions in an OS temporary directory, never the repository or `.sdd-runtime`. Dispatch through the typed flattened `client.session.promptAsync({ sessionID, messageID, model, agent, format, parts })` call with the requested model unchanged, first with `format: { type: "json_schema", schema }`, then with an otherwise equivalent text-format control. Persist only a bounded JSON evidence report with IDs, runtime versions, request fingerprints, statuses, and redacted diagnostic text.

After terminal or interrupted execution, start a fresh local server and recover each session using the supported list and exact-message SDK methods, then repeat those reads with official HTTP. The probe classifies whether the failure is dispatch, persistence, list/exact retrieval, output-format decoding, or a shared SDK/server decoder; it never reads undocumented storage, scrapes the TUI, patches sources, substitutes a model, or fabricates an identity/result.

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
| --- | --- | --- | --- |
| API surface | v1 SDK; v2 SDK; TUI/storage | Installed v2 SDK plus official HTTP control | The typed v2 call is flattened; official HTTP is a separate transport control for retrieval. TUI/storage are prohibited. |
| Evidence scope | Patch existing recovery; isolated probe | Isolated probe only | The prior change is protected and this change must establish platform facts first. |
| Schema lifetime | Retain object in memory; serialize then discard | Serialize/fingerprint then discard | Recovery must not depend on the original schema object. |
| Version drift | Mutate dependencies; isolate first | Compatibility proof then HUMAN stop | A changed CLI/SDK/server version is a material runtime/dependency decision. |

## 4. Data Flow

```text
temporary probe workspace -> v2 createOpencode -> session ID
  -> flattened SDK promptAsync (structured or text control) -> persisted Message + Parts
  -> close/restart server -> SDK list + exact GET / HTTP list + exact GET
  -> classifier -> bounded JSON evidence report
```

The typed SDK structured call is `client.session.promptAsync({ sessionID, messageID, model: { providerID, modelID }, agent, format: { type: "json_schema", schema }, parts: [{ type: "text", text }] })`; the control changes only `format` to `{ type: "text" }`. It must not receive a `{ path, body }` transport envelope. Separately, the official HTTP transport shape is `POST /session/{sessionID}/prompt_async` with `sessionID` in the URL and `{ messageID, model, agent, format, parts }` in the JSON body; the probe uses official HTTP only as an independent list/exact-retrieval control, not as a second dispatch path. Success requires dispatch acceptance, known session ID, assistant message ID, persisted `info` plus `parts`, requested/persisted agent-provider-model, `structured` or `StructuredOutputError`, and list/exact recovery after restart. Interruption uses the supported flattened `client.session.abort({ sessionID })` endpoint, then performs the same recovery; `MessageAbortedError` is valid evidence, not success.

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | `scripts/opencode-structured-message-recovery.mjs` | Create | Disposable real-server probe, supported retrieval controls, classifier, and report. |
| 2 | `scripts/opencode-structured-message-recovery.test.mjs` | Create | Deterministic request, recovery, classifier, and no-substitution tests. |
| 3 | `package.json` | Modify | Add focused probe and test scripts only. |

### 5.2 Secondary Files

| # | File | Action | Reason |
| --- | --- | --- | --- |
| 1 | `openspec/changes/sdd-opencode-structured-message-recovery/design.md` | Modify | Record implementation evidence only if Design Refinement is legally entered. |

### 5.3 Expected NOT to Change

- `scripts/sdd-runtime.mjs` and its tests — no lifecycle or recovery-layer change is approved.
- `.opencode/package.json`, `.opencode/package-lock.json`, and installed SDK files — no dependency/runtime mutation.
- `openspec/changes/sdd-low-executor-resilience/` — explicitly protected, including state and evidence.
- `docs/SDD-WORKFLOW.md` and the Enterprise template — no lifecycle or template change.

## 6. Read Order

1. `design.md` and `.sdd-runtime/state.json` — preserve the approved scope and checkpoint.
2. `scripts/opencode-structured-message-recovery.mjs` — understand the probe boundary and report contract.
3. `scripts/opencode-structured-message-recovery.test.mjs` — preserve deterministic contracts before changes.
4. `package.json` — run only focused commands.
5. `.opencode/node_modules/@opencode-ai/sdk/dist/v2/gen/sdk.gen.d.ts`, then `gen/types.gen.d.ts` and `{index,server}.d.ts` — verify flattened SDK dispatch, separate HTTP transport data, and supported lifecycle methods.

## 7. Expected Commands

```bash
pnpm test:opencode-structured-message-recovery  # deterministic contract tests
pnpm opencode:probe:structured-message-recovery # one real, isolated compatibility run
pnpm sdd:validate:design -- openspec/changes/sdd-opencode-structured-message-recovery/design.md # Design gate
```

## 8. Design Confidence

**Confidence:** High

Installed evidence fixes the CLI, plugin, SDK, and spawned server command at 1.18.4. The real probe intentionally distinguishes provider/model availability from a retrieval decoder defect.

## 9. Exploration Budget

| Resource | Budget | Notes |
| --- | ---: | --- |
| Repo searches | 4 | Runtime wiring, focused test conventions, and final deviation check. |
| Files to read | 12 | Only Working Set plus installed v2 SDK declarations. |
| Files to create | 2 | Probe and its focused test. |
| Files to modify | 1 | Root package script registration. |

## 10. Risks

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Provider/model unavailable | Med | Med | Classify as provider/environment, preserve requested identity, do not substitute. |
| Structured decoder blocks all reads | High | High | Compare text control, SDK list/exact, and raw official HTTP status; fail closed. |
| Restart loses server/session access | Med | High | Record server URL/version and classify persistence separately from retrieval. |
| Version mismatch | Low | High | Record CLI, SDK package/lock, and spawned-server command provenance; stop for HUMAN before mutation. |

## 11. Testing Strategy

| Layer | Focus | Approach |
| --- | --- | --- |
| Unit | Typed prompt shape, identity preservation, schema disposal, classification | Spy on `client.session.promptAsync` and require one flattened argument with `sessionID`, `model`, `agent`, `format`, and `parts`; reject a `path`/`body` envelope. Separately assert HTTP list/exact URLs and bounded report fields. |
| Integration | Supported dispatch and retrieval semantics | Opt-in real probe executes structured and text sessions through the typed SDK, then SDK/HTTP list and exact reads after restart. |
| Regression | Known decoder failure | Fixtures bind the same persisted session to the corrected SDK dispatch record and identical SDK/HTTP `Expected OutputFormatJsonSchema`, requiring `SHARED_DECODER_FAILURE`. |

## 12. Doorbell Tests

| Test file | What it proves |
| --- | --- |
| `scripts/opencode-structured-message-recovery.test.mjs` | N/A to tenant isolation; probe uses a temporary local workspace and must not write repository SDD state. |

## 13. Required ADRs

| ADR | Reason | Status |
| --- | --- | --- |
| None | This is a bounded compatibility proof, not an approved platform/runtime change. | Not required |

## 14. Boundaries

| Boundary | Owner | Purpose |
| --- | --- | --- |
| Probe harness | New script | Creates disposable sessions, captures supported API evidence, and classifies it. |
| OpenCode server/SDK | Installed 1.18.4 tooling | Executes and returns official Message/Parts responses; is not patched. |
| SDD runtime | Existing runtime | Remains untouched; probe never advances or writes change state. |

## 15. Extensibility

| Future feature | How it fits | Effort |
| --- | --- | --- |
| Supported-version matrix | Run the same immutable probe in a separate temporary environment. | Days |
| Runtime integration | Only after a PASS compatibility proof and a separately approved Design. | Days |

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor | 10× | 100× | Mitigation |
| --- | --- | --- | --- |
| Storage | Small reports | Bounded reports | Redact and retain only probe evidence. |
| Query latency | Linear reads | Linear reads | Per-session list/exact only. |
| Write throughput | Low | Low | Opt-in sequential probes. |
| Memory | Small | Small | Discard schema object after dispatch. |

**Decision:** Keep probes opt-in and bounded.

**Rationale:** This is diagnosis, not a production service.

**Alternative:** Batch historical sessions; rejected as scope expansion.

**Future impact:** A version matrix can reuse the report contract.

### B. Open/Closed Principle (OCP)

**Point of extension:** Scenario table for structured, text, malformed-schema, and interruption controls.

**What must change to add one more:** Add a scenario fixture, not retrieval code.

**Decision:** Use data-driven scenarios.

**Rationale:** New probes retain a single supported retrieval path.

**Alternative:** Separate scripts; rejected as duplicate classification logic.

**Future impact:** New output formats can be isolated safely.

### C. Ownership

| Data / Capability | Owner | Consumers |
| --- | --- | --- |
| Probe report | Probe harness | Tasks/Verify evidence |
| Message and Parts | OpenCode server | Probe harness |

**Decision:** OpenCode owns message persistence; the harness owns only observations.

**Rationale:** Prevents fabricated recovery state.

**Alternative:** Local mirror; rejected as a second store.

**Future impact:** Runtime may consume only proven official observations.

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
| --- | --- | --- | --- |
| Redacted probe report | Change lifetime | Canonical change directory | Per repository retention policy |
| Temporary workspace | Probe run | None | Remove on completion/failure |

**Decision:** Retain bounded evidence, not raw conversations.

**Rationale:** Evidence must be reproducible without exposing prompts.

**Alternative:** Full transcripts; rejected as unnecessary.

**Future impact:** Reports remain reviewable.

### E. Idempotency

| Operation | Duplicate risk | Protection | Fallback |
| --- | --- | --- | --- |
| Probe run | Duplicate sessions | Unique run ID and explicit opt-in | Keep each report separate; no SDD mutation |
| Retrieval | Repeated reads | Read-only | Same classification |

**Decision:** Probe sessions are disposable and never advance state.

**Rationale:** Re-runs cannot corrupt lifecycle evidence.

**Alternative:** Reuse one session; rejected because interruption contaminates results.

**Future impact:** CI/manual reruns remain comparable.

### F. Shared Contracts

| Contract | Location | Consumers | Producers |
| --- | --- | --- | --- |
| `ProbeReport` / `RootCauseClass` | New probe module | Tests, Tasks, Verify | Probe harness |

**Decision:** Export one runtime-neutral report contract that records the flattened SDK dispatch fingerprint separately from HTTP retrieval observations.

**Rationale:** Tests can prove the typed request contract and classify SDK/HTTP retrieval for the same persisted session without importing SDD runtime state or conflating SDK parameters with HTTP transport envelopes.

**Alternative:** Untyped console output; rejected as non-reviewable.

**Future impact:** A later approved integration can consume the same contract.

### G. Partitioning Strategy

| Dimension | Risk | Strategy |
| --- | --- | --- |
| Tenant | None | No CRM data or tenant access. |
| Time | Low | Timestamped bounded reports. |
| Volume | Low | One report per explicit probe run. |

**Decision:** No database partitioning.

**Rationale:** The change has no database or production data.

**Alternative:** Persist probe records in Prisma; rejected as disproportionate.

**Future impact:** External matrix storage needs a separate Design.

## 16. Interfaces / Contracts

```typescript
type SdkPromptAsyncParameters = {
  sessionID: string;
  messageID?: string;
  model: { providerID: string; modelID: string };
  agent?: string;
  format: { type: 'json_schema'; schema: Record<string, unknown> } | { type: 'text' };
  parts: Array<{ type: 'text'; text: string }>;
};

// Typed SDK only: client.session.promptAsync(parameters).
// It does not accept an OpenAPI { path, body } envelope.
// Official HTTP transport is POST /session/{sessionID}/prompt_async:
// path sessionID; JSON body { messageID, model, agent, format, parts }.

type RootCauseClass =
  | 'PASS'
  | 'DISPATCH_FAILURE'
  | 'PROVIDER_OR_MODEL_FAILURE'
  | 'PERSISTENCE_FAILURE'
  | 'LIST_RETRIEVAL_FAILURE'
  | 'EXACT_RETRIEVAL_FAILURE'
  | 'SHARED_DECODER_FAILURE'
  | 'STRUCTURED_OUTPUT_ERROR'
  | 'INTERRUPTION_RECOVERED'
  | 'MALFORMED_SCHEMA_REJECTED'
  | 'VERSION_MISMATCH';

interface ProbeReport {
  runID: string;
  versions: { cli: '1.18.4'; sdk: '1.18.4'; serverCommand: 'opencode serve' };
  requested: { agent?: string; providerID: string; modelID: string; format: 'json_schema' | 'text'; sdkDispatch: 'flattened' };
  sessionID: string;
  assistantMessageID?: string;
  recovery: { sdkList: string; sdkExact: string; httpList: number; httpExact: number; afterRestart: boolean };
  result: RootCauseClass;
}
```

`SdkPromptAsyncParameters` is the only dispatch contract exercised by the typed client; the report fingerprints its flattened fields without retaining the schema object. Malformed schema is a control that must be rejected as `MALFORMED_SCHEMA_REJECTED`; it is never retried with a different model/schema. `StructuredOutputError` is read from persisted assistant `info.error.name`; success accepts `info.structured` only when recovery is complete. If SDK and HTTP list both fail with the same output-format error for the same session dispatched through the corrected SDK contract, classify `SHARED_DECODER_FAILURE`; if one works, classify the failing client boundary instead.

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
| --- | --- | --- | --- |
| 1 | Add isolated script, test, and package scripts. | Low | Remove only new files/scripts in a future approved change. |
| 2 | Run opt-in compatibility proof. | Provider cost/failure | Preserve report; no runtime mutation. |
| 3 | On CLI/SDK/server version drift, stop for HUMAN before any dependency or runtime mutation. | High | No mutation has occurred. |

No migration, feature flag, or runtime/dependency upgrade is authorized.

## 18. Open Questions

| # | Question | Status | Resolution |
| --- | --- | --- | --- |
| 1 | Do SDK and HTTP share the output-format decoder in 1.18.4? | Open | BLOCKING for runtime integration; compare retrieval of the same session dispatched through flattened SDK parameters. |
| 2 | Does a real structured request persist recoverable `structured` or `StructuredOutputError` after restart? | Open | BLOCKING for integration; prove with the real opt-in probe. |
| 3 | What is the next legal lifecycle action after this Design passes? | Resolved | Architecture Review, owned by HIGH. |
| 4 | Is the SDK dispatch contract ambiguous with the HTTP request transport shape? | Resolved | No. SDK `promptAsync` is flattened; HTTP uses path `sessionID` plus a JSON body. The probe dispatches only through the SDK and uses HTTP only for retrieval controls. |

---

> **End of document.**
> It does not modify the pipeline, prompts, or workflow.
