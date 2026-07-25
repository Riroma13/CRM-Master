# Canonical Audit Governance Resolution

Change: `SPEC-SDD-0001-sdd-v3-stabilization`
Decision: **Legacy Baseline Exception approved**
Scope: canonical historical audit only; no runtime, release, Stable, freeze, tag, Verify, or Archive action has been executed.

## Resolution

Archived SPEC reports are classified by an explicit version marker in the
canonical `archive-report.md`, not by archive date, fixture version, or a
derived dashboard value:

- A report is **SDD v3.0+** only when it explicitly declares `schema_version:
  3.0`, `source_version: v3.0`, or `SDD v3.0`.
- A report without one of those markers is **pre-v3.0** for this audit. The
  current canonical population has no v3.0 marker; this does not assert an
  unrecorded historical version.
- An included report has an existing archive directory, a readable canonical
  `archive-report.md`, a path under `openspec/changes/archive/`, and a SPEC
  identity in the approved population. Non-SPEC rows, unapproved identities,
  missing reports, and documented partial duplicates are excluded with a
  reason.

## Legacy Baseline Exception

A pre-v3.0 included artifact may satisfy the historical audit as
`PASS_WITH_LEGACY_BASELINE` only when the archive directory exists, the
canonical report is readable, canonical identity/path rules hold, and the
inclusion/exclusion rules are documented in this resolution and the audit.

Missing `source_commit` is a known historical limitation for pre-v3.0
archives. The exception does not fabricate a commit, promote a fixture
placeholder, or create a historical aggregate result.

## SDD v3.0+ Requirements

Every included SDD v3.0+ archive report MUST contain an explicit
`**Source commit:**` value with 40 lowercase hexadecimal characters. A missing
or zero placeholder source commit fails the audit.

Every v3.0+ readiness audit MUST publish the approved aggregate definition
`canonical-v3-aggregate/v1` before it can return `PASS`. The definition MUST
specify:

- Inputs: included canonical v3.0+ `archive-report.md` records and explicit
  source commits.
- Inclusion: readable reports with approved SPEC identity and canonical path.
- Exclusion: non-SPEC rows, unapproved identities, missing/unreadable reports,
  and documented partial duplicates, each with a reason.
- Formula: `qualifying_included / included_v3_records`; readiness requires the
  numerator to equal the denominator.
- Approval: the definition is approved in this governance artifact and is
  referenced by every v3.0+ archive report in the calculation.

No value is calculated for the current pre-v3.0 population. Dashboard totals,
fixture values, and prose counts are not aggregate results.

## Recomputed Population Facts

- 27 archive directories
- 25 readable `archive-report.md` files
- 22 included canonical SPEC artifacts
- 5 excluded entries
- 0/22 canonical source commits

## Gate Semantics

- **R-01:** pre-v3.0 may be `PASS_WITH_LEGACY_BASELINE`; v3.0+ is `PASS`
  only with explicit source commits and the approved aggregate definition.
- **R-12:** pre-v3.0 may be `PASS_WITH_LEGACY_BASELINE`; v3.0+ is `PASS`
  only with the same approved definition and reproducible formula.

R-01/R-12 `PASS_WITH_LEGACY_BASELINE` unblocks **Verify** for this change. No
Verify or Archive action has been executed. **Archive remains blocked until
Verify completes and all archive prerequisites pass.** SPEC-SDD-0002 release,
Stable, freeze, and tag work remains out of scope.
