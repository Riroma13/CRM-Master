# Specification: SPEC-SDD-0002 - SDD v3.0 Stable Release

> **Artifact status:** Derived compatibility artifact generated from the
> approved `design.md` after Architecture Review.
> **Authority boundary:** `design.md` and the approved findings in
> `architecture-review.md` control this change. This compatibility spec must
> not alter either artifact and must not block Tasks.

## Requirements

### R-001 - Documentation-only release contract

The change MUST create or update only the Design-declared documentation and
change-local validation paths. It MUST NOT change product/runtime code, schema,
dependencies, tenant behavior, Direct infrastructure, global configuration,
SPEC-SDD-0001, or unrelated recovery work.

### R-002 - One stable authority set

The release manifest MUST identify exactly one `release_id` of
`sdd-v3.0-stable`, version `v3.0`, implementation baseline
`c028537bae6fe1d8ecafc3974cd9cf0e46a673ce`, and planned tag
`sdd-v3.0-baseline`. Guard transitions and the 18-section/A-G Design shape
remain owned by their existing canonical documents.

### R-003 - Forward-only v2.1 adoption

Closed or archived v2.1 changes MUST remain v2.1 and immutable. An active v2.1
opt-in MUST be one-time, append-only, and record the source identity, target
v3.0 identity/revision, effective Design boundary, and supersession link.
Reopened v2.1 work MUST use a new v3.0 revision. Completed v2.1 evidence MUST
never be rewritten in place.

### R-004 - Strict release evidence by version

`PASS_WITH_LEGACY_BASELINE` MUST remain valid only for the accepted pre-v3.0
population. Every v3.0+ record MUST contain an explicit source commit and
`canonical-v3-aggregate/v1`; missing or conflicting evidence fails closed.

### R-005 - Final-gate-only Stable state

Before the manual Release/Tag gate, artifacts MUST remain candidate/draft
metadata and MUST NOT claim Stable, publish `sdd-v3.0-baseline`, or claim
`freeze_state_after_final_gate: ACTIVE`. Only the verified commit at that
manual gate may bind Stable, the tag, and freeze reactivation. No automatic
release action is allowed.

### R-006 - Scope and preservation safety

Validation MUST capture the dirty worktree boundary against the baseline,
preserve existing Direct-mode and recovery changes, accept only declared
SPEC-SDD-0002 paths, and fail closed on unclassified paths. Any Guard update
is metadata/reference-only and MUST preserve transition semantics and the
existing Direct-mode section.

## Scenarios and Acceptance

1. A rerun with the same release and document identities is a no-op; a
   conflicting identity, duplicate entry, missing link, or historical edit
   fails closed.
2. A pre-final manifest with Stable, the planned tag as published, or active
   freeze state fails validation.
3. A v2.1 opt-in without all required identity fields, or a second opt-in,
   fails validation; completed v2.1 evidence remains unchanged.
4. A changed path outside the Working Set, including SPEC-SDD-0001 or global
   configuration, fails the safety doorbell.
5. The Architecture Review artifact is the approval record for authority and
   scope; proposal/spec generation does not authorize release gates.
6. SPEC-SDD-0001 regression evidence preserves the accepted legacy baseline
   distinction while v3.0+ remains strict.

The focused validator/tests MUST cover AR-001 through AR-005 and DC-001
through DC-006. AR-NB-001 and AR-NB-002 remain CLOSED.
