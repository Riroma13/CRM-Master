---
classification: HISTORICAL
semantic_authority: false
runtime: not-loaded
---

# Architecture Changelog

> Historical release evidence. Current CRM-SDD semantics are defined only by
> `docs/SDD-WORKFLOW.md`.

## Stable: SDD v3.0

| Field                  | Value                                      |
| ---------------------- | ------------------------------------------ |
| Release ID             | `sdd-v3.0-stable`                           |
| Version                | `v3.0`                                      |
| Implementation baseline | `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce` |
| Verified candidate     | `03ecd9d18a329986f71214bb3ecd16b1b62ff264` |
| Finalization commit    | `dad0024e25bfc9a44af2f4d61ea6b8d2d899e2a1` |
| Published tag          | `sdd-v3.0-baseline`                         |
| Tag target             | `dad0024e25bfc9a44af2f4d61ea6b8d2d899e2a1` |
| Published release      | `SDD v3.0 Stable`                           |
| Release state          | stable                                     |
| Stable declaration     | EXECUTED                                   |
| Feature freeze         | ACTIVE                                     |

The existing candidate entry below is preserved as pre-finalization historical
evidence. This entry is the current release state.

<!-- HISTORICAL EVIDENCE: preserved pre-finalization candidate contract. -->
<!-- sdd-v3-release-contract:v1
release_id: sdd-v3.0-stable
version: v3.0
implementation_baseline: c028537bae6fe1d8ecafc3974cd9cf0e46a673ce
planned_baseline_tag: sdd-v3.0-baseline
release_state: candidate
stable_declaration: maintainer-only-after-repository-ready
planned_tag_state: NOT_PUBLISHED
freeze_state_after_final_gate: PENDING
pre_v3_0_compatibility: PASS_WITH_LEGACY_BASELINE
v3_0_plus_aggregate: canonical-v3-aggregate/v1
approval_record: openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/architecture-review.md
manifest: docs/architecture/archive/sdd-v3.0-release-notes.md
adr: docs/architecture/archive/adr-0021-sdd-v3-stable-release.md
-->

## Candidate: SDD v3.0

**Date:** 2026-07-24

| Field                                                                                              | Value                                                                   |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Release ID                                                                                         | `sdd-v3.0-stable`                                                       |
| Version                                                                                            | `v3.0`                                                                  |
| Implementation baseline                                                                            | `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce`                              |
| Planned tag                                                                                        | `sdd-v3.0-baseline` (not published)                                     |
| Release state                                                                                      | candidate                                                               |
| Stable declaration                                                                                 | maintainer-only-after-repository-ready                                  |
| Freeze after final gate                                                                            | PENDING                                                                 |
| Compatibility                                                                                      | pre-v3.0 `PASS_WITH_LEGACY_BASELINE`; v3.0+ `canonical-v3-aggregate/v1` |
| Manifest                                                                                           | `docs/architecture/archive/sdd-v3.0-release-notes.md`                  |
| ADR                                                                                                | `docs/architecture/archive/adr-0021-sdd-v3-stable-release.md`           |
| **Approval record:** `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/architecture-review.md` |

This is a candidate record only. The manual Release/Tag gate has not executed;
Stable declaration, tag publication, and freeze reactivation remain pending.

## Baseline — SDD v2.1

**Fecha:** 2026-07-18

**Estado:** Stable Baseline

### Principales hitos

- SDD v2.0 Workflow completed
- Working Set introduced
- Read Order introduced
- Exploration Budget introduced
- Design Confidence introduced
- Verify Learning loop introduced
- Archive JSON artifacts introduced
- Environment Verification added
- SDD Doctor implemented
- Observational Metrics implemented (Verify Discoveries, Prediction Accuracy)
- Feature Freeze declared
- NestJS Module Aggregators introduced (3 bounded contexts)
- Frontend Navigation Registry introduced (6 feature modules)
- Module Composition Standard documented
- Fallback telemetry and model verification added
- Platform Stability Policy enacted

### Future Policy

- Future SDD changes require historical evidence from `/sdd-metrics`.
- Metrics drive evolution — no changes without data.
- Prefer improving Design quality over adding workflow complexity.
- Preserve architectural stability over introducing new phases.
- Feature Freeze active since SDD v2.1.
