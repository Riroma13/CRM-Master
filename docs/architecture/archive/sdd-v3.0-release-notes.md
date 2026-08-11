# SDD v3.0 Stable Release Notes

> Classification: HISTORICAL. Non-authoritative and not loaded by CRM-SDD runtime.

---
status: archived
archived_from: docs/architecture/sdd-v3.0-release-notes.md
archived_at: 2026-07-26
---

> **Status:** Archived historical document. Non-authoritative. The manual
> Release/Tag gate was never executed; this candidate contract is retained
> as historical evidence only.

The following manifest is the single candidate compatibility contract for the
release. It is not a Stable declaration and does not publish a tag or reactivate
the feature freeze.

```json
{
  "schema": "sdd-v3-release-contract/v1",
  "change": "SPEC-SDD-0002-sdd-v3-stable-release",
  "manifest": {
    "phase": 3,
    "release_id": "sdd-v3.0-stable",
    "version": "v3.0",
    "implementation_baseline": "c028537bae6fe1d8ecafc3974cd9cf0e46a673ce",
    "planned_baseline_tag": "sdd-v3.0-baseline",
    "release_state": "candidate",
    "stable_declaration": "maintainer-only-after-repository-ready",
    "planned_tag_state": "NOT_PUBLISHED",
    "freeze_state_after_final_gate": "PENDING",
    "final_gate": {
      "status": "NOT_EXECUTED",
      "authority": "manual-maintainer-release-tag",
      "verified_commit": "DEFERRED",
      "allowed_future_transition": "manual Release/Tag after Repository Ready",
      "automatic_transition": "FORBIDDEN",
      "requires_verified_commit": true
    },
    "approval_record": "openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/architecture-review.md",
    "canonical_documents": [
      "docs/sdd-workflow-guard.md",
      "docs/templates/design-enterprise-template.md",
      "docs/templates/design-master-prompt.md",
      "docs/architecture/platform-baseline.md",
      "docs/architecture/sdd-infrastructure.md",
      "docs/architecture/adr/0021-sdd-v3-stable-release.md",
      "docs/architecture/sdd-v3.0-release-notes.md",
      "docs/architecture/CHANGELOG.md"
    ]
  },
  "compatibility": {
    "pre_v3_0": {
      "version": "v2.1",
      "status": "PASS_WITH_LEGACY_BASELINE",
      "source_commit_policy": "accepted-historical-limitation",
      "aggregate": "not-claimed"
    },
    "v3_0_plus": {
      "version": "v3.0+",
      "source_commit_required": true,
      "source_commit_format": "40-lowercase-hex",
      "aggregate": "canonical-v3-aggregate/v1",
      "aggregate_definition": "qualifying_included / included_v3_records"
    }
  },
  "opt_in_contract": {
    "source_version": "v2.1",
    "target_version": "v3.0",
    "required_fields": [
      "source_identity",
      "target_identity",
      "target_revision",
      "effective_design_boundary",
      "one_time_marker",
      "supersession_link",
      "completed_evidence"
    ],
    "one_time_marker": "required-and-unique",
    "preservation_rule": "completed v2.1 evidence is preserved and never rewritten",
    "reopened_rule": "reopened v2.1 work creates a new v3.0 revision and supersedes the v2.1 revision"
  },
  "legacy_document_mappings": [
    {
      "path": "docs/SDD-WORKFLOW.md",
      "status": "historical-compatible",
      "replacement": "docs/sdd-workflow-guard.md",
      "source_version": "v2.1",
      "immutable": true
    },
    {
      "path": "docs/templates/design-prompt.md",
      "status": "deprecated",
      "replacement": "docs/templates/design-master-prompt.md",
      "source_version": "v2.1",
      "immutable": true
    },
    {
      "path": "docs/architecture/sdd-v3-roadmap.md",
      "status": "superseded",
      "replacement": "docs/architecture/sdd-v3.0-release-notes.md",
      "source_version": "v2.1",
      "immutable": true
    },
    {
      "path": "docs/roadmaps/**",
      "status": "historical-reference",
      "replacement": null,
      "source_version": "v2.1",
      "immutable": true
    },
    {
      "path": "docs/history/**",
      "status": "historical-reference",
      "replacement": null,
      "source_version": "v2.1",
      "immutable": true
    },
    {
      "path": "openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/**",
      "status": "historical-reference",
      "replacement": null,
      "source_version": "v2.1",
      "immutable": true
    },
    {
      "path": "product/runtime/**",
      "status": "not-in-release",
      "replacement": null,
      "source_version": "v2.1",
      "immutable": true
    },
    {
      "path": ".opencode/**",
      "status": "not-in-release",
      "replacement": null,
      "source_version": "v2.1",
      "immutable": true
    }
  ],
  "preservation": {
    "historical_v2_1_immutable": true,
    "completed_evidence": "preserved",
    "historical_paths": [
      "openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/**",
      "openspec/changes/archive/2026-07-24-SPEC-SDD-0001-sdd-v3-stabilization/**"
    ]
  },
  "opt_ins": [],
  "evidence": [],
  "changed_paths": [
    "openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/tasks.md",
    "openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/evidence/phase-2-result.md",
    "openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/validation/owned-path-scope.json",
    "openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/validation/validate-phase1.mjs",
    "openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/validation/validate-release.mjs",
    "openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/validation/test/release-contract.test.mjs",
    "docs/architecture/sdd-v3.0-release-notes.md",
    "docs/architecture/adr/0021-sdd-v3-stable-release.md",
    "openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/evidence/phase-3-result.md",
    "docs/sdd-workflow-guard.md",
    "docs/templates/design-enterprise-template.md",
    "docs/templates/design-master-prompt.md",
    "docs/architecture/platform-baseline.md",
    "docs/architecture/sdd-infrastructure.md",
    "docs/architecture/CHANGELOG.md",
    "docs/SDD-WORKFLOW.md",
    "docs/templates/design-prompt.md",
    "docs/architecture/sdd-v3-roadmap.md",
    "openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/evidence/phase-4-result.md"
  ]
}
```

## Adoption Contract

- Closed or archived v2.1 changes retain their v2.1 identity, paths, review
  evidence, and source semantics indefinitely.
- An active v2.1 change may opt in once at its next Design boundary. The record
  must identify the source artifact, target v3.0 artifact and revision, the
  effective Design boundary, a unique one-time marker, and the supersession
  edge. Completed evidence remains preserved.
- Reopened v2.1 work receives a new v3.0 revision linked to the superseded v2.1
  identity. The v2.1 artifact is never rewritten in place.
- This candidate contains no active opt-in record. Future records must satisfy
  the declared contract before they are accepted.

## Evidence Contract

The accepted pre-v3.0 population retains `PASS_WITH_LEGACY_BASELINE`; it does
not claim a historical aggregate or invent source commits. Every v3.0+ record
must provide an explicit 40-character lowercase source commit and the
`canonical-v3-aggregate/v1` definition before it can be accepted.

## Final-Gate Boundary

The candidate remains non-Stable. The manual Release/Tag gate is the only place
that may bind the verified commit to the planned tag, declare Stable, and
reactivate the feature freeze. No Apply phase performs those actions.

## Document Status Classification

The candidate authority set is the eight-document set in
`manifest.canonical_documents`. The manifest is the single compatibility
authority; the Workflow Guard, Enterprise Design Template, and Design Master
Prompt retain their existing responsibilities.

- `docs/SDD-WORKFLOW.md` is **historical-compatible** and remains v2.1 context only.
- `docs/templates/design-prompt.md` is **deprecated**; use the Design Master Prompt.
- `docs/architecture/sdd-v3-roadmap.md` is **superseded** by this candidate release record.
- `docs/roadmaps/**`, `docs/history/**`, and archived SPEC paths are **historical-reference**.
- Product/runtime and Direct execution paths are **not-in-release**.

Every mapping is immutable and any replacement is explicit in the JSON contract above.
