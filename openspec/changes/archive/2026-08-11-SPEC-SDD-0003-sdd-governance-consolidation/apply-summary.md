---
classification: MAINTENANCE EVIDENCE
semantic_authority: false
change: SPEC-SDD-0003-sdd-governance-consolidation
artifact_store: hybrid
status: PASS
---

# Apply Summary — Nested Apply Substep 7.6

> This artifact is 7.6 inside Apply. It is not a separate lifecycle phase.

> **SPEC:** SPEC-SDD-0003-sdd-governance-consolidation
> **Date:** 2026-08-11

## Executive Summary

The recovered governance implementation was accepted without source changes.
Apply recorded bounded evidence for Foundation, Core Engine, Feature
Implementation, Integration, and Testing. All required governance checks passed;
no deviations or unexpected dependencies were found.

## Phases Completed

| Apply substep | Focus | Files Created | Files Modified | WSA |
|-------|-------|:-------------:|:--------------:|:---:|
| 7.1 | Foundation — authority and infrastructure evidence | 0 | 0 | 100% |
| 7.2 | Core Engine — local wiring and model-map evidence | 0 | 0 | 100% |
| 7.3 | Feature Implementation — governance contract evidence | 0 | 0 | 100% |
| 7.4 | Integration — persistence/config and context/template boundary evidence | 0 | 0 | 100% |
| 7.5 | Testing — required validators and diff check | 0 | 0 | 100% |
| **7.6 Summary** | Consolidated Apply evidence | **1** | **0** | **~100%** |

## Work Unit Evidence

| Substep | Focused test command and exact result | Runtime harness | Rollback boundary |
|---|---|---|---|
| 7.1 Foundation | Recovered baseline: `pnpm sdd:validate` previously PASS; current run PASS | N/A — no runtime boundary; governance docs only | No implementation rollback required; recovered 54-file governance set remains untouched |
| 7.2 Core Engine | `pnpm sdd:validate` PASS; local Direct wiring, STOP stubs, bindings, and role map valid | N/A — no product/runtime boundary | Revert only approved governance wiring files; none changed by Apply |
| 7.3 Feature Implementation | `pnpm sdd:validate` PASS; no SPEC-specific product behavior exists or was added | N/A — product behavior explicitly excluded | No feature rollback; no product files changed |
| 7.4 Integration | `pnpm sdd:validate` PASS; hybrid persistence and package-level boundaries valid | N/A — no routes, components, or runtime integration in scope | Revert only governance config/adapter evidence; none changed by Apply |
| 7.5 Testing | `pnpm sdd:validate` PASS; both Design validators PASS; `git diff --check` PASS | N/A — documentation/adapter validation only | Remove only this Apply Summary artifact; preserve recovered implementation and exclusions |

## 7.1–7.4 Recovered Evidence

- **Authority docs:** `AGENTS.md` governs startup/safety, while
  `docs/SDD-WORKFLOW.md` is the sole semantic workflow authority;
  `docs/sdd-workflow-guard.md` is non-semantic compatibility evidence.
- **Local wiring/model map:** `docs/architecture/sdd-direct.md`,
  `.opencode/sdd-model-map.json`, local Direct agents, and STOP-only command
  stubs establish project-local Direct wiring. No global executor was used.
- **Persistence/config:** `openspec/config.yaml`, `package.json`, and the local
  adapter preserve `hybrid` persistence and the project-local validator entry
  points.
- **Context/template boundary:** `.ai/context/*`,
  `docs/templates/design-enterprise-template.md`, and the approved Design
  preserve the context boundary and canonical 18-section/A–G Design shape.
- **Protected work:** SPEC-0028 remains excluded and uninspected. The recovery
  record's protected Design SHA-256 invariant remains
  `0969a1c2d8d256156245657a4339ca9f2588bc57cdb33b1f0c3cc4700798f56b`.
- **Tenant isolation:** N/A. No tenant data, endpoint, schema, client,
  credential, runtime boundary, or product test was read or changed.

## 7.5 Required Checks

| Command | Result |
|---|---|
| `pnpm sdd:validate` | PASS — canonical files, 14 phases, nested Apply, authority, local wiring, persistence, and maintainer gates valid |
| `pnpm sdd:validate:design -- docs/templates/design-enterprise-template.md` | PASS — 18 sections, A–G topics, decisions, and Working Set numbering valid |
| `pnpm sdd:validate:design -- openspec/changes/SPEC-SDD-0003-sdd-governance-consolidation/design.md` | PASS — 18 sections, A–G topics, decisions, and Working Set numbering valid |
| `git diff --check` | PASS — no whitespace errors |

## Overall Metrics

| Metric | Value |
|--------|-------|
| Approved Working Set | 54 files (33 tracked + 21 untracked project-local governance files) |
| Working Set Accuracy | 100% |
| Unexpected Files | 0 |
| Unexpected Dependencies | 0 |
| Governance Working Set Files Created | 0 |
| Governance Working Set Files Modified | 0 |
| Apply Evidence Files Created | 1 (`apply-summary.md`) |
| Build Success | N/A — no product/runtime changes |
| Required checks | 4/4 PASS |

## Acceptance Criteria Summary

| Apply substep | Criteria | Status |
|-------|----------|--------|
| 7.1 | Recovered authority and foundation state recorded | PASS |
| 7.2 | Local Direct wiring and model map recorded | PASS |
| 7.3 | No product behavior or feature implementation added | PASS |
| 7.4 | Persistence/config and context/template boundaries recorded | PASS |
| 7.5 | All required validators and diff check pass | PASS |
| 7.6 | Six-substep evidence, metrics, exclusions, and next action consolidated | PASS |

## Deviations

None. No strictly necessary mechanical correction was proven or applied.

## Architecture Decisions Applied

- `docs/SDD-WORKFLOW.md` remains the sole semantic workflow authority.
- Project-local Direct wiring and `.opencode/sdd-model-map.json` remain the only
  local execution path and concrete role map.
- Exact artifacts remain in OpenSpec with bounded context under hybrid
  persistence.
- SPEC-0028, product/runtime code, schema, product tests, global configuration,
  and Git lifecycle operations remain excluded.

## Deferred Items

| Item | Reason |
|------|--------|
| Verify | Canonical next lifecycle action; explicitly not run in this Apply action |
| Archive, Health Report, Repository Ready | Later workflow phases; explicitly not run in this Apply action |
| Commit, Push, Merge | HUMAN / MAINTAINER-only gates; not executed or simulated |

## Overall Apply Verdict

**PASS**

Next action: **Verify** (HIGH / ARCHITECT). Do not execute Archive, Health,
Repository Ready, or maintainer Git gates as part of this action.
