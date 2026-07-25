# Workload Guard: SPEC-SDD-0002 - SDD v3.0 Stable Release

status: READY
change: SPEC-SDD-0002-sdd-v3-stable-release
phase: Workload Guard
artifact: `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/workload-guard.md`
decision: chained-prs / stacked-to-main / automatic-direct
next: Apply Phase 1
blocked_by: []

## Guard Entry

The Tasks Review is clean for transition purposes:

- `tasks-review.md` is `APPROVED`.
- No `BLOCKER` findings exist.
- Conditions TR-001 through TR-006 are downstream acceptance criteria, not
  Tasks Refinement triggers.
- `tasks-review.md` explicitly authorizes `Tasks Review -> Workload Guard`.
- AR-NB-001 and AR-NB-002 remain `CLOSED`.

Direct mode therefore continues automatically. This artifact records an
advisory delivery decision; it does not add a second approval pause before
Apply.

## Workload Forecast

| Measure                 |    Result | Evidence or assumption                                                                            |
| ----------------------- | --------: | ------------------------------------------------------------------------------------------------- |
| Estimated changed lines | 700-1,000 | Existing Tasks forecast; includes documentation, validators, tests, and change-local reports.     |
| 400-line budget risk    |      High | The forecast exceeds the repository's 400-line review budget.                                     |
| Product/runtime lines   | 0 planned | The Design and Tasks forbid product, runtime, schema, migration, dependency, and deployment work. |
| Repository count        |         1 | All planned paths are inside this repository.                                                     |
| Workload confidence     |    Medium | This is a planning forecast, not an actual implementation diff.                                   |

The estimate is consumed from `tasks.md` and is not recalculated from the
dirty worktree. Existing dirty changes are outside this change unless they
are explicitly listed in the approved Working Set; they remain untouched.

## Complexity Score

The repository score is **5**, which is in the `>= 4` range and recommends
Chained PRs.

| Criterion                     | Applies | Points | Reason                                                                                                                                                                        |
| ----------------------------- | ------: | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| More than 1,500 estimated LOC |      No |      0 | The forecast is 700-1,000 lines.                                                                                                                                              |
| Multiple bounded contexts     |      No |      0 | This is one product-neutral SDD release-governance context and one SPEC; document ownership boundaries are not product modules owning separate data.                          |
| Shared contracts modified     |     Yes |      2 | The Working Set includes the shared Workflow Guard, Enterprise Design Template, and Master Prompt contracts; changes are metadata/reference-only and must preserve semantics. |
| Existing consumers            |     Yes |      2 | Existing Direct/legacy orchestrators, Design authors, and reviewers consume those governance contracts.                                                                       |
| Migration required            |      No |      0 | No Prisma migration, data backfill, or breaking API change is planned; v2.1 preservation is an append-only documentation compatibility rule.                                  |
| Multiple repositories/modules |      No |      0 | One repository is involved and no product module is changed.                                                                                                                  |
| Backward compatibility        |     Yes |      1 | Closed and archived v2.1 evidence, existing transition semantics, and Direct/recovery changes must remain valid.                                                              |
| **Total**                     |         |  **5** | **`>= 4` -> Chained PRs**                                                                                                                                                     |

### Bounded-Context Analysis

- Domain scope is one cohesive, product-neutral SDD release-governance
  context.
- The change has one SPEC and one release identity: `sdd-v3.0-stable`.
- The scope is still coordination-sensitive because shared governance
  contracts have existing consumers. That risk is captured by the shared
  contract and existing consumer score rather than by counting document
  owners as independent product bounded contexts.
- The result is not a size exception under the score rule. The chain keeps
  contract creation, authority metadata, and legacy/readiness reconciliation
  reviewable as separate units.

## PR and Delivery Recommendation

**Recommendation:** Chained PRs.

**Delivery strategy:** `stacked-to-main`, the Direct-mode default when chained
delivery is selected. Direct execution remains automatic through the
non-destructive phases; branch, commit, push, merge, release, and tag actions
are not performed by Direct agents.

### Feature-Branch-Chain Boundary

The chain is bounded by Apply phase seams and remains inside the approved
Working Set:

| Chain unit                      | Apply phases | Scope                                                                                                                            | Rollback boundary                                                                             |
| ------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| PR 1: Contract foundation       | Apply 1-2    | Baseline capture, RED/GREEN release-contract validation, manifest, and ADR-0021.                                                 | Revert the new change-local contract/validation artifacts only.                               |
| PR 2: Stable authority metadata | Apply 3      | Metadata and references for the eight primary authority documents; preserve Guard transitions and the 18-section/A-G body.       | Revert the metadata-only document revisions without rewriting historical evidence.            |
| PR 3: Adoption and readiness    | Apply 4-5    | Three secondary historical/deprecation updates, reconciliation, focused tests, formatting, scope checks, and readiness evidence. | Revert the secondary metadata and change-local readiness evidence; retain prior v2.1 history. |

Chain rules:

- Each unit is based on the preceding unit and the final unit targets `main`.
- A unit must not contain paths from another unit unless required by its
  declared contract boundary.
- No unit may include SPEC-SDD-0001, recovery work, `.opencode/**`, global
  configuration, product/runtime/schema/dependency paths, or unclassified
  paths.
- No branch or PR is created by this Workload Guard. The table is the delivery
  boundary for later maintainer-controlled Git operations.
- If the actual implementation forecast exceeds 1,000 lines or introduces a
  runtime, schema, migration, breaking-API, or unclassified path, stop before
  crossing the affected boundary and recompute the Guard.

## Conditions Carried Forward

The following conditions remain mandatory acceptance evidence during Apply and
Verify, but they do not block Apply Phase 1:

- TR-001: assert the exact one-time v2.1-to-v3.0 opt-in marker, target revision,
  boundary, supersession link, and preserved evidence.
- TR-002: prove the existing Direct-mode Guard change is preserved and any
  Guard edit is metadata/reference-only.
- TR-003: record the complete allowed and preserved path manifest, including
  all change-local reports, and fail closed on unclassified paths.
- TR-004: validate exactly one release identity and all required cross-document
  fields, links, mappings, and final-gate state.
- TR-005: emit the standard completion summary for every Apply phase and build
  the consolidated Apply Summary from the canonical template.
- TR-006: keep this Workload Guard advisory and do not introduce a second
  approval pause before Apply.

## Assumptions

- The Tasks Review remains the authoritative transition evidence for this
  invocation.
- The 700-1,000 line forecast is unchanged and represents changed content,
  not total file size.
- Documentation and validators are the only implementation surface; no
  runtime behavior or new workflow behavior is authorized.
- Shared-contract and existing-consumer points apply even though planned
  edits preserve transition semantics and are metadata/reference-only.
- The current dirty worktree contains unrelated changes, including recovery
  and Direct infrastructure; none is absorbed into this change.
- Direct mode's automatic post-review chain is selected without a maintainer
  prompt because there is no blocker and the Workload Guard is advisory.

## Manual Destructive Gates

Direct execution stops at Repository Ready. The following gates remain
`NOT EXECUTED` and require an explicit maintainer action outside Direct:

1. Commit
2. Push
3. Merge
4. Release
5. Tag

Stable declaration, publication of `sdd-v3.0-baseline`, and freeze
reactivation remain coupled to the final manual Release/Tag gate. No release,
tag, Stable declaration, freeze restoration, commit, push, or merge is
performed by this Workload Guard.

## Structured Result

```yaml
status: READY
change: SPEC-SDD-0002-sdd-v3-stable-release
phase: Workload Guard
artifacts:
  - openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/workload-guard.md
decision: chained-prs / stacked-to-main / automatic-direct
next: Apply Phase 1
evidence:
  - Tasks Review is APPROVED with no BLOCKER findings.
  - Forecast is 700-1,000 changed lines with high 400-line budget risk.
  - Complexity Score is 5: shared contracts +2, existing consumers +2, backward compatibility +1.
  - Scope is one cohesive bounded context and one SPEC; no runtime or product work is planned.
  - Six Tasks Review conditions are carried as downstream acceptance criteria.
  - Five manual destructive gates remain outside Direct execution.
blocked_by: []
```
