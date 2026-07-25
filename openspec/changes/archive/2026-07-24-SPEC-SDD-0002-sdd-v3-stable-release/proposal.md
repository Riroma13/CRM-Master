# Proposal: SPEC-SDD-0002 - SDD v3.0 Stable Release

> **Artifact status:** Derived compatibility artifact.
> **Authority:** `design.md` in this change directory is authoritative. This
> proposal is generated from the approved Design and cannot revise it, replace
> it, or block the Tasks phase.
> **Review basis:** `architecture-review.md` records
> `APPROVED_WITH_CONDITIONS` with no `BLOCKER`; its conditions are mandatory
> downstream acceptance criteria.

## Intent

Convert the verified SPEC-SDD-0001 stabilization baseline into the SDD v3.0
Stable documentation contract without changing product behavior, runtime
behavior, workflow transitions, or Direct execution infrastructure. The
release contract must identify one current authority set while preserving v2.1
artifacts as immutable historical evidence.

## Baseline and Release Identity

- Implementation baseline: `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce`.
- Version: `v3.0`.
- Release identity: `sdd-v3.0-stable`.
- Planned baseline tag: `sdd-v3.0-baseline`.
- Stable declaration, tag creation, and freeze restoration occur only at the
  final maintainer-controlled Release/Tag gate after Repository Ready.

## Scope

Later Apply work creates the release notes manifest, release ADR, and
change-local validator/tests; updates metadata and references in the declared
stable documents; and classifies legacy documents as historical, deprecated,
or superseded. It uses append-only, forward-only adoption and rejects
unclassified paths or conflicting release identities.

The active v2.1 opt-in record must contain the source identity, target v3.0
identity/revision, effective Design boundary, one-time marker, supersession
link, and preservation rule for completed evidence. Closed or archived v2.1
work remains v2.1. Reopened work receives a new v3.0 revision and never rewrites
the v2.1 artifact.

The accepted pre-v3.0 population retains `PASS_WITH_LEGACY_BASELINE`. Every
v3.0+ record requires an explicit source commit and
`canonical-v3-aggregate/v1`.

## Explicit Exclusions

No schema, product, API, frontend, migration, dependency, tenant behavior,
runtime test, new workflow phase, new agent, release action, freeze action, or
tag action is part of this proposal. SPEC-SDD-0001, its archive, unrelated
recovery work, the existing Direct-mode section, and global configuration are
preserved.

## Success Boundary

Verify must prove the exact cross-document v3.0 contract, immutable historical
paths, forward-only migration, idempotent reruns, scope preservation, and
pre-final candidate state. Repository Ready records that final manual gates
remain pending; it does not declare Stable or reactivate the freeze.
