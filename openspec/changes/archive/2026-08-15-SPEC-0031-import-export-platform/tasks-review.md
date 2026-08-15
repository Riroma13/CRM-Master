# Tasks Review: SPEC-0031 — Import / Export Platform

> **Status:** PASS
> **Phase:** Tasks Review (MID / BUILDER)
> **Reviewed:** approved refined Design, fresh PASS Architecture Review, preserved pre-refinement review, and `tasks.md`

## Verdict

PASS. The Tasks artifact is complete, dependency-ordered, RED-first, and bounded to the approved Design. All material review requirements are represented. The known Working Set forecast-count variance remains a non-blocking CONDITION and does not broaden scope.

## Findings

| ID     | Status    | Finding                                                                                                                                                                                          | Evidence                                        |
| ------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| TR-001 | PASS      | RED → GREEN → REFACTOR sequencing is explicit; RED covers exports, authorization/audit, importer contracts, rollback, retention, and the Host/session doorbell before GREEN implementation.      | `tasks.md:24-40`                                |
| TR-002 | PASS      | The authoritative Working Set contains exactly 16 enumerated paths and explicitly forbids all others.                                                                                            | `tasks.md:16-18`; Design §§5.1–5.2              |
| TR-003 | PASS      | Unsafe Admin Tools CSV importer removal is an explicit GREEN task and acceptance exclusion; Reporting, schema/migrations, UI, and composition boundaries are preserved.                          | `tasks.md:35,42-46`; Design §5.3                |
| TR-004 | PASS      | Session → Host → tenant → organization → active membership → `configuracion:read`, session-derived actor, fail-closed audit, and 401/403/503 outcomes are covered by RED and doorbell tasks.     | `tasks.md:26-29`; Design §§4, 11–12, 16         |
| TR-005 | PASS      | `clientes-csv-v1` exact CSV validation, duplicate rejection, pre-validation, serializable all-or-nothing transaction, Jobs reuse, idempotency, and bounded retention are explicit and ordered.   | `tasks.md:27,32-35,44`; Design §§2–3, 14, 16    |
| TR-006 | PASS      | Workload forecast, feature-branch-chain strategy, work-unit commands, runtime harnesses, rollback boundaries, and required commands are present. HUMAN / Workload Guard remains before Apply.    | `tasks.md:3-14,46-48`; Design §9                |
| TR-007 | CONDITION | Design Section 9 forecasts six created files while the enumerated path-level Working Set contains seven created files. The exact 16-path list is authoritative; no scope expansion is permitted. | Fresh Architecture Review AR-010; `tasks.md:18` |

## Blockers

None. No material finding remains open, and the single Tasks Refinement budget is not consumed.

## Validation Evidence

| Check                                                                                                                                                                                                                                                                                                                        | Result                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `pnpm sdd:validate`                                                                                                                                                                                                                                                                                                          | PASS — governance, Direct wiring, roles, hybrid persistence, and maintainer gates |
| `pnpm sdd:validate:design -- "openspec/changes/SPEC-0031-import-export-platform/design.md"`                                                                                                                                                                                                                                  | PASS — canonical 18 sections, A–G topics, decisions, and Working Set numbering    |
| `pnpm exec prettier --check "openspec/changes/SPEC-0031-import-export-platform/tasks.md" "openspec/changes/SPEC-0031-import-export-platform/design.md" "openspec/changes/SPEC-0031-import-export-platform/architecture-review.md" "openspec/changes/SPEC-0031-import-export-platform/architecture-review-pre-refinement.md"` | PASS — all applicable active artifacts formatted                                  |

## Canonical Next Action

**PASS → Workload Guard → Apply 7.1 Foundation**, only after the required HUMAN / MAINTAINER decision for the high 520–680 changed-line forecast and feature-branch-chain delivery strategy. Apply must remain within the exact 16-path Working Set and preserve RED → GREEN → REFACTOR evidence.
