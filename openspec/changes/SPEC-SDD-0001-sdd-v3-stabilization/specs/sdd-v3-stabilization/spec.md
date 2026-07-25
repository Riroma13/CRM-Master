# SDD v3 Stabilization Specification

## Purpose

Define the documentation and artifact-governance contracts approved by the
SPEC-SDD-0001 Design. This specification does not authorize product or runtime
behavior.

## Requirements

### Requirement: Canonical authority and workflow documentation

The documentation MUST use the Workflow Guard as transition authority, the
Constitution/ADR index as policy authority, templates as artifact-shape
authority, immutable archive reports as historical evidence, and dashboards as
dated read-only derivatives. Reconciliation MUST use document metadata and
content hashes only.

#### Scenario: Conflicting derived authority
- GIVEN dashboard and roadmap membership conflicts with archived SPEC artifacts
- WHEN historical authority is resolved
- THEN canonical archived artifacts remain authoritative and the conflict is not silently overwritten

### Requirement: Complete Design contract

The Design contract MUST preserve all 18 sections and the Architecture Review
topics A-G. Each A-G topic MUST contain its approved decision, rationale,
alternatives, future impact, and required contract fields.

#### Scenario: Missing required Design section
- GIVEN an artifact omits an 18-section heading or an A-G contract field
- WHEN structural validation runs
- THEN validation fails

### Requirement: Evidence-backed improvement inventory

Each improvement MUST appear exactly once with one allowed disposition:
Adopt, Modify, Document Only, Defer, or Reject. Adopted evidence MUST identify
distinct archive paths and the source commit for each recurrence; unsupported
candidate measurements remain conservatively deferred or documentation-only.

#### Scenario: Uncovered improvement category
- GIVEN an inventory category has no approved evidence-backed classification
- WHEN the inventory is validated
- THEN validation fails rather than promoting the category

### Requirement: Document reconciliation and idempotency

Document identity MUST use stable `document_id` and `revision_id`. Reconciliation
MUST upsert by the approved logical keys, preserve superseded evidence, and
fail closed on authority collisions. Repeated identical input MUST create no
duplicate records.

#### Scenario: Duplicate records on rerun
- GIVEN the same audited inventory is reconciled twice
- WHEN the second run completes
- THEN IDs remain stable, no duplicate insert occurs, and conflicts are reported

### Requirement: v2.1 to v3.0 fixture and mapping validation

The v2.1 manifest MUST contain exactly 22 source records across the four
declared categories, and the v3.0 fixture MUST contain one valid `DocumentRecord`
for each source record. The field map MUST be one-to-one, resolve every target
path, preserve source values under `audit`, and use explicit defaults/constants.

#### Scenario: Unknown mapping path or missing field
- GIVEN a mapping targets an unknown path or a required target field is absent
- WHEN the validator runs
- THEN it emits the first applicable validation error and `FAIL`

#### Scenario: Invalid coverage or cardinality
- GIVEN a declared category is uncovered, a manifest count mismatches, or the target count is not 22
- WHEN fixture validation runs
- THEN validation emits `FAIL`

### Requirement: Readiness gates

Readiness MUST report R-01 through R-12 with PASS,
`PASS_WITH_LEGACY_BASELINE`, or FAIL, observed value, and owner. R-01 and R-12
MUST report `PASS_WITH_LEGACY_BASELINE` for a qualifying pre-v3.0 canonical
population under the approved Legacy Baseline Exception. For v3.0+ records,
R-01 and R-12 MUST report `PASS` only after canonical membership and
exclusions, explicit source commits, and the approved
`canonical-v3-aggregate/v1` definition are published. Any failed gate MUST
stop the workflow before Tasks; only an approved review verdict passes R-07.

#### Scenario: Approved legacy baseline
- GIVEN all fixture checks pass and the canonical audit establishes the approved pre-v3.0 population, exclusions, and Legacy Baseline Exception
- WHEN readiness is evaluated
- THEN R-01 and R-12 report `PASS_WITH_LEGACY_BASELINE`; v3.0+ readiness remains strict and requires explicit source commits and `canonical-v3-aggregate/v1`

### Requirement: Freeze exception and release separation

The only temporary feature-freeze exception MUST be
`SDD_FEATURE_FREEZE_EXCEPTION = SPEC-SDD-0001`. SPEC-SDD-0001 MUST remain
documentation/governance-only and MUST NOT declare Stable, restore the freeze,
release, create tags, or produce product/runtime behavior. SPEC-SDD-0002
exclusively owns those stable-release and freeze-restoration actions.

#### Scenario: Stable-release action submitted to SPEC-SDD-0001
- GIVEN a Stable declaration, freeze restoration, release, or tag action is requested in SPEC-SDD-0001
- WHEN the scope boundary is enforced
- THEN the action is rejected and remains assigned to SPEC-SDD-0002
