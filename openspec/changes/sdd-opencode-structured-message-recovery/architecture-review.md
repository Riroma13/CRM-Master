---
phase: Architecture Review
role: HIGH
status: PASS
next: Tasks
change: sdd-opencode-structured-message-recovery
confidence: High
---

# Architecture Review: OpenCode Structured Message Recovery

## Verdict

**PASS.** The single permitted Design Refinement closed the prior material SDK
request-shape finding. The Design is an isolated, fail-closed platform probe;
it does not redesign the SDD lifecycle or integrate with
`sdd-low-executor-resilience`.

## Gate and Authority Evidence

- Recovered state is `READY`, sequence `3`, checkpoint `Design Refinement` PASS,
  with `Architecture Review` as the legal current action.
- The workflow and model map assign Architecture Review to HIGH / ARCHITECT;
  the project-local HIGH model is `openai/gpt-5.6-terra`.
- The approved Working Set and Read Order were consumed. No protected resilience
  change was inspected. No bounded deviation was required.
- The Design permits only the new isolated probe, its focused tests, and root
  script registration. It prohibits SDD-state, dependency, runtime, authority,
  trust, and tenant-data mutation. Version/SDK/authority/trust drift stops for
  HIGH/HUMAN disposition before any mutation.

## Findings

| ID | Classification | Confidence | Finding | Evidence / disposition |
| --- | --- | ---: | --- | --- |
| AR-01 | PASS | High | The refined typed SDK dispatch contract is supported and is distinct from HTTP transport. | `client.session.promptAsync` accepts flattened `sessionID`, `messageID`, `model`, `agent`, `format`, and `parts`; no `{ path, body }` envelope. The generated HTTP data shape retains URL-path `sessionID` plus JSON body for `POST /session/{sessionID}/prompt_async`. Design §§4 and 16 preserve this separation. |
| AR-02 | PASS | High | The proof contract remains complete after the correction. | Design §§4, 11, and 16 require exact 1.18.4 provenance, structured/text controls, persisted `{ info, parts }`, SDK and HTTP list/exact reads, restart and interruption, malformed schema, decoder/error classification, requested-model identity, schema-object disposal, and no SDD-state mutation. |
| AR-03 | CONDITION | High | Provider/model availability can prevent a real probe result. | Design §10 classifies it without model substitution. This is an externally observable probe result, not a Design blocker; requested identity is recorded and no fabricated result is permitted. |

## Architecture Review Topics A–G

| Topic | Classification | Evidence |
| --- | --- | --- |
| A. Scalability | PASS | Opt-in sequential probes, per-session reads, bounded redacted reports, and schema disposal prevent production-scale growth. |
| B. Open/Closed Principle | PASS | Data-driven scenario fixtures extend structured, text, malformed-schema, and interruption controls without duplicating retrieval/classification. |
| C. Ownership | PASS | OpenCode owns persisted Message and Parts; the probe owns only observations and its report. |
| D. Data Retention | PASS | Only bounded redacted evidence remains in the change directory; temporary workspaces are removed and raw transcripts are excluded. |
| E. Idempotency | PASS | Unique disposable run IDs, read-only recovery, separate reports, and no lifecycle mutation prevent a repeat from corrupting evidence. |
| F. Shared Contracts | PASS | `ProbeReport` and `RootCauseClass` are runtime-neutral internal contracts. The report fingerprints flattened SDK dispatch separately from HTTP retrieval observations. |
| G. Partitioning Strategy | PASS | No CRM database, tenant, or production data is touched; timestamped per-run reports are sufficient. |

## Contracts, Security, and Tenant Isolation

- **Supported contracts:** SDK `messages`, exact `message`, `abort`, and flattened
  `promptAsync` are declared. The response declarations specify persisted
  `{ info: Message, parts: Part[] }` for both list and exact reads. The HTTP
  generated transport declarations independently specify the path/body shape.
- **Exact versions:** `.opencode/package.json` and its lock fix the plugin at
  `1.18.4`; the lock fixes `@opencode-ai/sdk` at `1.18.4`. The Design records
  CLI, SDK, and server-command provenance and stops before a version mutation.
- **Security:** PASS. TUI scraping, undocumented storage, OpenCode source
  patching, fabricated output/identity, requested-model substitution, Verify
  weakening, policy bypass, and dependency/runtime mutation are prohibited.
  Diagnostic evidence is bounded and redacted.
- **Tenant isolation:** PASS / N/A by design. The probe uses an OS-temporary
  local workspace and accesses no CRM tenant, Host-derived context, Prisma
  client, or database. Its focused test must prove no repository SDD state is
  written.

## Working Set and Read Order

The Working Set is sufficient. The absent probe and test files are approved
`Create` targets, not missing review evidence. `scripts/sdd-runtime.mjs` and
the installed declarations were read only as approved contract evidence;
neither is approved for mutation. No deviation is recorded.

## Open Questions

| Question | Review status | Disposition |
| --- | --- | --- |
| Do SDK and HTTP share the output-format decoder in 1.18.4? | Open, non-blocking | The isolated probe compares the same persisted session after corrected SDK dispatch and reports exactly one root-cause classification or a precise external limitation. |
| Does a real structured request persist recoverable `structured` or `StructuredOutputError` after restart? | Open, non-blocking | The opt-in real probe proves or disproves it without retaining the original schema object. |
| Is any version, SDK, authority, or trust change required? | Closed as prohibited | Stop before mutation for HIGH/HUMAN-sensitive disposition. |

## Validation

| Validator | Result | Evidence |
| --- | --- | --- |
| `pnpm sdd:validate:design -- openspec/changes/sdd-opencode-structured-message-recovery/design.md` | PASS | Canonical 18 sections, A–G order, decision/rationale separation, and Working Set numbering validated. |
| `pnpm sdd:validate` | PASS | Canonical workflow, local Direct wiring, logical roles, hybrid persistence, maintainer gates, validators, and Enterprise template boundary validated. |

## Required Next Action

Per `docs/SDD-WORKFLOW.md` §§88–143, this PASS permits **Tasks** (MID) as the
only legal next action. This review does not dispatch Tasks, Apply, Verify, or
any Git operation.
