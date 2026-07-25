# Tasks: SPEC-SDD-0001 — SDD v3.0 Stabilization

**Scope:** Governance-only. SPEC-SDD-0002 alone owns Stable, freeze restoration, release, and tags.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 700–1,000 (existing forecast; no workload analysis run) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Governance → fixtures/reconciliation → readiness evidence |
| Delivery strategy / chain | force-chained / feature-branch-chain |

Decision needed before apply: No — selected force-chained delivery
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

| Unit | Goal / likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| 1 | Governance / PR 1 | `node --test "$C/validation/test/structure.test.mjs"` | N/A: documentation-only | Guard/template/conditional ADR |
| 2 | Fixtures / PR 2 | `node --test "$C/validation/test/fixtures.test.mjs" "$C/validation/test/reconciliation.test.mjs"` | `node "$C/validation/reconcile-fixtures.mjs" --twice` | `$C/fixtures`, validation, inventory/ledger |
| 3 | Readiness / PR 3 | `node --test "$C/validation/test/readiness.test.mjs" "$C/validation/test/safety.test.mjs"` | `node "$C/validation/validate-readiness.mjs"` | `$C/evidence`, readiness/safety validators |

## Bounded Working Set and Ownership

Let `$C` = `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization`. Create only `$C/fixtures/{v2.1-manifest.json,v2.1-field-map.json,v3.0-sample.json}`, `$C/validation/{validate-structure.mjs,validate-fixtures.mjs,reconcile-fixtures.mjs,validate-readiness.mjs,validate-changed-paths.mjs,owned-path-scope.json}`, `$C/validation/test/{structure.test.mjs,fixtures.test.mjs,reconciliation.test.mjs,readiness.test.mjs,safety.test.mjs}`, and `$C/evidence/{improvement-inventory.json,evidence-ledger.json,architecture-review-approved.md,readiness-report.md}`. Owners: structure pair—transition; manifest/ledger—historical-data; field-map, v3 fixture, fixture/reconciliation pairs—reconciliation; inventory—Design; review input—architecture reviewer; readiness pair—readiness reviewer; changed-path safety and owned-path scope—Apply/Verify owner; Verify is consumer/verifier. Authorized Design §5.2/§13 exceptions: modify `docs/sdd-workflow-guard.md` (transition owner), `docs/templates/design-enterprise-template.md` (shape owner), and conditionally create `docs/architecture/adr/0011-sdd-v3-governance-ratification.md` (policy owner). Nothing else changes.

## Phase 1: Governance RED → GREEN

- [x] **1.1 RED** Create `$C/validation/test/structure.test.mjs`: missing A–G, authority conflicts, and Stable/release/freeze/tag actions fail.
- [x] **1.2 GREEN** Create `$C/validation/validate-structure.mjs`; update only the authorized Guard/template exceptions and conditional ADR after ratification.
- [x] **Exit:** `node "$C/validation/validate-structure.mjs"` passes; duplicate authority or release scope fails.

## Phase 2: Fixtures and reconciliation RED → GREEN

- [x] **2.1 RED** Create `$C/validation/test/fixtures.test.mjs`: unmapped field, category gap, altered audit value, and non-22 cardinality fail.
- [x] **2.2 GREEN** Create the three `$C/fixtures/*` files and `$C/validation/validate-fixtures.mjs`; require 22/22 and explicit defaults.
- [x] **2.3 RED** Create `$C/validation/test/reconciliation.test.mjs`: rerun duplicates, collisions, and source mutation fail.
- [x] **2.4 GREEN** Create `$C/validation/reconcile-fixtures.mjs` and `$C/evidence/{improvement-inventory.json,evidence-ledger.json}`; preserve archives.
- [x] **Exit:** fixture validation and `reconcile-fixtures.mjs --twice` pass; mismatch or duplicate fails.

## Phase 3: Approved legacy-baseline readiness and safety

- [x] **3.1 RED** Create `$C/validation/test/readiness.test.mjs`: require R-01–R-12 owner/value/status; R-01/R-12 exact `PASS_WITH_LEGACY_BASELINE` for the approved pre-v3.0 baseline and strict v3.0+ requirements; R-07 consumes `$C/evidence/architecture-review-approved.md` with `Verdict: APPROVED`; malformed input or another verdict fails.
- [x] **3.2 GREEN** Create that approved-review input, `$C/validation/validate-readiness.mjs`, and `$C/evidence/readiness-report.md`. Validator exits 0 only when the approved legacy-baseline state is correctly reported and keeps v3.0+ strict; command/contract errors exit nonzero.
- [x] **3.3 RED** Create `$C/validation/test/safety.test.mjs`: non-Working-Set paths and SPEC-SDD-0002 Stable, release, freeze-restoration, or tag actions fail.
- [x] **3.4 GREEN** Create `$C/validation/validate-changed-paths.mjs`; Doorbell runs structure, fixture, reconciliation, readiness, and safety checks.
- [x] **Exit:** tests and validators pass correctness; report remains not-ready with R-01/R-12 expected failures. No workflow advancement is authorized.

## Phase 4: Evidence checkpoint

- [x] **4.1** Run `git diff --check` and Prettier only on the declared Working Set; preserve archives and exceptions.
- [x] **4.2** Submit only to repeated Tasks Review. Do not run Workload Guard, Apply, Stable, release, freeze restoration, or tag actions.
- [x] **Exit:** correctness evidence passes, readiness is `READY WITH LEGACY BASELINE` with R-01/R-12 `PASS_WITH_LEGACY_BASELINE`, while v3.0+ remains strict. No Stable, release, freeze-restoration, or tag action is authorized.
