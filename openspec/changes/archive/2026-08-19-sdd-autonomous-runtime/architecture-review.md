---
classification: ARCHITECTURE REVIEW
semantic_authority: false
status: PASS
---

# Architecture Review: sdd-autonomous-runtime

## Verdict

**Status:** PASS

This is the one fresh HIGH review after the HUMAN-authorized bounded AR-003
Design correction. The corrected Design closes AR-003 without changing
canonical workflow semantics, authority ownership, or Git boundaries. All
material findings are closed; the canonical next action is **Tasks**.

## Fresh Validator Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Enterprise Design shape | PASS | `pnpm sdd:validate:design -- openspec/changes/sdd-autonomous-runtime/design.md` passed: 18 ordered sections, A–G topics, decision/rationale separation, and Working Set structure. |
| Governance wiring | PASS | `pnpm sdd:validate` passed: canonical phase/role map, hybrid persistence, local Direct isolation, legacy STOP stubs, and HUMAN Git gates. |
| Bounded current-state basis | PASS | `scripts/sdd-resume.mjs:10-23,96-121,252-325` remains the existing inferred-checkpoint baseline; no runtime implementation exists yet. The Design scopes its replacement to `scripts/sdd-runtime.mjs` and the declared local wiring. |

## Findings and Prior Provenance

| ID | Historical classification | Fresh disposition | Evidence |
| --- | --- | --- | --- |
| AR-001 | BLOCKED | PASS | Design §11 preserves AC-01–AC-15 and maps each to a contract, named test/fixture, and acceptance evidence (lines 149-183). |
| AR-002 | BLOCKED | PASS | Design §§2, 11, 15E, and 16 specify immutable change-local event files, event-first atomic publication, hash-chain/idempotency validation, one-event reconciliation, and fail-closed trace conflicts (lines 20-24, 289-303, 418-420). |
| AR-003 | BLOCKED | PASS | Design §16 supplies the typed `BlockerClass`, strict `Blocker` parser contract, complete policy table, and named contract tests (lines 382-412; 174-185). |

No material finding remains. Planned runtime tests are Design commitments, not
executed implementation evidence; they must be delivered during Apply and
judged in Verify.

## AR-003 and AC-06 Verification

| Requirement | Result | Evidence |
| --- | --- | --- |
| Typed recognized classes | PASS | `BlockerClass` includes `AUTO_RETRY`, `AUTO_REFINE`, `AUTO_RECOVER`, `ENVIRONMENT_RECOVERABLE`, `PROVIDER_FALLBACK`, and independently `HUMAN_ARCHITECTURE`, `HUMAN_SECURITY`, `HUMAN_SCOPE`, `HUMAN_GIT`; only the justified `HUMAN_RISK_ACCEPTANCE`, `HUMAN_INFRASTRUCTURE`, and `FATAL_INVARIANT` additions appear (Design lines 382-385, 408-410). |
| Exact blocker shape | PASS | A blocked/failed outcome requires exactly one `Blocker`; `PASS` emits none. `class`, boolean `human_required`, structured allowlisted-or-null `resume_phase`, and explanatory-only `reason` are strictly validated (lines 387-395). |
| Policy and fail-closed behavior | PASS | The five false classes are complete and limited to their mapped canonical bounded retry/refinement/recovery/fallback policy. Every true class produces `STOP/HUMAN_HANDOFF`; `FATAL_INVARIANT` cannot auto-continue. Unknown, missing, mismatched, or malformed blockers are terminal fail-closed before dispatch (lines 397-414; 185). |
| AC-06 architecture/security/scope fixtures | PASS | Four separate fixtures are named: `human-architecture.json`, `human-security.json`, `human-scope.json`, and `human-git.json`; each asserts its exact class, `human_required: true`, handoff, and no later executor call (lines 174-175). |
| AC-06 Git boundary | PASS | `HUMAN_GIT` explicitly covers Repository Ready’s final integration boundary and unauthorized Commit/Push/Merge/Rebase/Release/Deploy/Tag/direct-to-main operations (lines 174, 407). This agrees with the workflow’s HUMAN-only Commit/Push/Merge handoff and project-local Direct Git prohibition. |

## Architecture Review Topics A–G

| Topic | Result | Evidence and judgment |
| --- | --- | --- |
| A. Scalability | PASS | §15A bounds state and trace per validated change, uses compact state/fingerprinted warm reads, and avoids a shared service/database. |
| B. OCP | PASS | §15B provides explicit allowlisted extension points: versioned phase adapters and model-capability entries. |
| C. Ownership | PASS | §§14–15C preserve workflow ownership of lifecycle semantics; runtime state/trace remains cache and evidence. |
| D. Data Retention | PASS | §15D retains minimum redacted change evidence, excludes prompts/secrets/provider payloads, and permits no automatic deletion. |
| E. Idempotency | PASS | §15E and §16 define keyed event publication, duplicate behavior, atomic materialization, and fail-closed reconciliation. |
| F. Shared Contracts | PASS | §16 defines `RuntimeState`, `TraceEvent`, `OutcomePacket`, `BlockerClass`, `Blocker`, routing, validation, and trace contracts in one bounded implementation location. |
| G. Partitioning | PASS | §15G partitions by validated canonical change directory; the runtime carries no product tenant data. |

## Contract, Security, Scope, and Delivery Evidence

- **Authority and routing — PASS:** The Design consumes workflow phase/role/budget rules rather than creating authority. The model map assigns HIGH to Architecture Review/Verify, LOW to Archive/Health/Repository Ready, and HUMAN to Commit/Push/Merge. Routing retains same-role, compatible, project-local candidates only (Design §§2, 14, 16; model map lines 29-61).
- **Security, provenance, and tenant isolation — PASS:** Canonical root/change/agent validation, fingerprints, allowlists, no shell interpolation, trace integrity, and fail-closed divergence are specified. No tenant/product data or tenant query path is introduced; the existing critical `tenant_id` isolation policy is unchanged (Design §§4, 10, 12, 16; `openspec/config.yaml:31-35`).
- **Working Set and recovery — PASS:** §5 confines work to runtime, Direct wiring, resolver, validator, map, tests, documentation, and generated change-local metadata; it explicitly excludes workflow/template/global files, product sources, infrastructure, and archives. §§4, 15E, 16, and 17 make cold/warm recovery and legacy migration bounded, provenance-checked, and fail-closed.
- **Standing policy and disposable tests — PASS:** The Design preserves `force-chained`, stacked-to-main, and the 400-line review budget. It correctly treats reusable disposable infrastructure as new conditional work: `docker-compose.yml` provides persistent Postgres/Redis, while the Design requires explicit isolated lifecycle evidence and blocks when required infrastructure cannot be safely recovered (Design §§7, 10-11, 17; `openspec/config.yaml:74-77`; `docker-compose.yml:4-34`).
- **Acceptance mappings, migration, and testability — PASS:** AC-01–AC-15 each have named fixture/evidence rows; blocker and trace failure modes add direct unit/integration coverage. Migration preserves legacy cold reconstruction, archive immutability, existing STOP-only legacy commands, and requires fresh HIGH Verify before Archive (Design §§11, 16-17).
- **Condition — non-blocking:** Provider capability/quality/cost telemetry does not yet exist in the current model map. The Design scopes its versioned addition and redacted evidence without fabricating telemetry; implementation must validate configured values before routing (Design §§3, 15F, 16, 18; `.opencode/sdd-model-map.json:7-62`).

## Canonical Next Action

**Tasks** — derive the implementation plan from this approved Design. No further
Design Refinement is authorized or required by this review.
