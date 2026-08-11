# ADR-0021 - SDD v3.0 Stable Release Contract

> Classification: HISTORICAL. Non-authoritative and not loaded by CRM-SDD runtime.

---
status: archived
archived_from: docs/architecture/adr/0021-sdd-v3-stable-release.md
archived_at: 2026-07-26
---

- **Number:** ADR-0021
- **Status:** Archived. Final acceptance was deferred to the manual Release/Tag
  gate, which was never executed. Retained as historical evidence only.
- **Owner:** SPEC-SDD-0002 release/compatibility owner
- **Scope:** Documentation and release-governance metadata only

## Context

SPEC-SDD-0001 provides the verified implementation baseline at
`c028537bae6fe1d8ecafc3974cd9cf0e46a673ce`. Its accepted pre-v3.0 population
has a documented `PASS_WITH_LEGACY_BASELINE` limitation: canonical source
commits and a historical aggregate were not available for that population.
The v3.0 contract must preserve that history while making new evidence strict.

The Architecture Review for this change is the approval record:
`openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/architecture-review.md`.
Its conditions and DC criteria remain mandatory downstream acceptance criteria.

## Decision

Adopt one candidate identity for the release notes manifest:

- `release_id`: `sdd-v3.0-stable`
- `version`: `v3.0`
- implementation baseline: `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce`
- planned tag: `sdd-v3.0-baseline`

The manifest remains candidate-only. Stable declaration, tag publication, and
freeze reactivation require the final manual Release/Tag gate against the
verified commit. The candidate records `freeze_state_after_final_gate: PENDING`
and `final_gate.status: NOT_EXECUTED`.

## Compatibility and Migration

- Closed and archived v2.1 artifacts remain immutable v2.1 history.
- An active v2.1 opt-in is one-time and append-only. It must contain source and
  target identities, the target v3.0 revision, effective Design boundary,
  one-time marker, supersession link, and preserved completed evidence.
- Reopened v2.1 work creates a new v3.0 revision and supersedes the old identity;
  the old artifact is not edited in place.
- The legacy population retains `PASS_WITH_LEGACY_BASELINE`.
- Every v3.0+ record requires an explicit source commit and
  `canonical-v3-aggregate/v1`; a missing or conflicting value fails closed.

## Cross-Document Contract

The release notes manifest is the sole compatibility record for this candidate.
The eight canonical documents must repeat the exact candidate identity, version,
implementation baseline, planned tag, compatibility values, approval record,
and final-gate state from that manifest. Legacy, deprecated, superseded, and
excluded paths remain classified there and are never rewritten in place.

The Architecture Review is the approval record for authority and scope. It does
not authorize Stable declaration, freeze reactivation, release publication, or
tag creation before the manual Release/Tag gate.

## Consequences

This ADR creates no runtime compatibility layer, schema migration, workflow
phase, agent, command, release action, or tag action. The release notes manifest
is the compatibility authority for this change; existing Guard and template
documents retain their own responsibilities. Historical v2.1 evidence remains
read-only and can only be superseded by a new append-only v3.0 revision.

## Rollback

Before Repository Ready, remove only this unapproved candidate ADR and the
candidate release-notes artifact. Do not rewrite or remove SPEC-SDD-0001,
archived v2.1 evidence, or pre-existing Direct/recovery changes.
