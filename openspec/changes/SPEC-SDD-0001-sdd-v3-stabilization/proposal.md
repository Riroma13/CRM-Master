# Proposal: SPEC-SDD-0001 SDD v3.0 Final Improvements

## Intent

Reconcile the approved SDD v3.0 stabilization evidence and governance contracts
without introducing a workflow phase, agent, prompt layer, command, metric, or
product behavior. Canonical archived SPEC artifacts remain authoritative; the
exact historical population and aggregates remain gated by the canonical audit.

## Scope

### In Scope

- Documentation and artifact governance only, under the temporary exception
  `SDD_FEATURE_FREEZE_EXCEPTION = SPEC-SDD-0001`.
- Canonical authority/workflow references, the 18-section Design contract, the
  evidence-backed improvement inventory, and reconciliation/idempotency rules.
- Versioned v2.1 source and v3.0 target fixture/mapping validation plus the
  documentation-only readiness boundary.

### Out of Scope

- Product/runtime behavior, tenant data, schema changes, releases, tags, or
  implementation work.
- Stable declaration or freeze restoration. SPEC-SDD-0002 exclusively owns
  stable release/freeze restoration and release/tag actions.
- Reopening Architecture Review or creating Tasks in this compatibility phase.

## Capabilities

### New Capabilities

- `sdd-v3-stabilization`: Canonical SDD v3.0 governance, evidence,
  reconciliation, fixture comparability, and readiness contracts.

### Modified Capabilities

- None.

## Approach

Use the Workflow Guard, Constitution/ADR index, templates, immutable archive
reports, and dated dashboards according to their approved authority hierarchy.
Classify each improvement exactly once as Adopt, Modify, Document Only, Defer,
or Reject, requiring distinct archive paths and source commits for evidence.
Reconcile stable document and revision identities without changing product data.

Affected documentation includes `docs/sdd-workflow-guard.md` and
`docs/templates/design-enterprise-template.md`; later approved Apply may create
the versioned v2.1/v3.0 fixtures named by the Design. Source archives remain
read-only.

## Acceptance Boundary

Readiness is documentation evidence only. R-01 through R-12 must be reported;
pending canonical audit, authority conflicts, invalid mappings, missing fields,
uncovered categories, count mismatches, or non-idempotent reconciliation fail
readiness. SPEC-SDD-0001 MUST NOT declare Stable or perform release actions.

## Rollback Plan

Restore the prior documentation revision and preserve immutable source archives;
there is no runtime rollback because no runtime behavior changes.

## Success Criteria

- [ ] Compatibility artifacts express the approved Design without additional behavior.
- [ ] Fixture, mapping, reconciliation, readiness, and SPEC-SDD-0002 boundaries are testable.
- [ ] No release, tag, product/runtime artifact, or Architecture Review reopening occurs.
