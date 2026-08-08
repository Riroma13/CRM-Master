# Tasks Review: SPEC-0025 Identity Platform

**Status:** APPROVED_WITH_CONDITIONS
**Scope:** Read-only review of the current Design, Proposal, compatibility Spec, Tasks, final Architecture Review #693, and `openspec/config.yaml`.

## Findings

- **CONDITION** — RED-first gates are ordered before implementation, and R1/R2 explicitly cover Better Auth catalog/declaration compatibility and existing-row/index migration safety. However, R4 groups Host failures without naming the Design’s RED-9 cases (spoofed, malformed, multiple Host, and proxy conflict); preserve those concrete cases in the implementation tests.
- **CONDITION** — R3 references the exact Design route matrix and exclusions, but the task text does not repeat the concrete handler/permission list or each legacy/public exclusion. Apply must implement and verify the matrix literally, including invitation acceptance exclusion.
- **CONDITION** — Several implementation tasks use broad labels (“contracts”, “catalog config”, “scoped repositories”, “dispatcher/DLQ”) without naming all concrete Design paths. Apply should bind these actions to the Design Working Set and must not add unlisted files.
- **NON-BLOCKING** — The six-phase structure is correct: Foundation, Core Engine, Feature Implementation, Integration, Testing, and Apply Summary. Checkpoints are planned rather than executed, as required.
- **NON-BLOCKING** — The forecast is explicit and consistent with `force-chained` plus `stacked-to-main`: 700–1,000 lines, high risk, three work units, and no decision gate before Apply.
- **NON-BLOCKING** — All seven execution gates, immutable `hostTenantId`, fail-closed semantics, BullMQ-only retry ownership, `c1a2f90` preservation, recovery-migration exclusion, and out-of-scope boundaries are represented.

## Decision

The Tasks artifact is implementation-ready with the conditions above. No missing input or unsupported runtime proof prevents progression. Compatibility Spec derivation is internal and does not create a visible SDD phase.

**Next visible phase:** Apply. Conditions are to be enforced during Apply and verified afterward; this review does not launch either phase.
