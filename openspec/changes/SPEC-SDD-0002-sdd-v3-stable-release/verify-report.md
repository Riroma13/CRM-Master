```yaml
schema: sdd-direct.verify-result/v1
evidence_revision: sha256:82a925d958f2487fdbd745a61ff239e2d454571c6d1c6638dd9f0377d315a4bd
status: VERIFIED
change: SPEC-SDD-0002-sdd-v3-stable-release
phase: Verify
acceptance_criteria: PASS
requirements: 6/6
scenarios: 6/6
tests: PASS
lint: NOT_APPLICABLE
formatting: PASS_WITH_NON_BLOCKING_LIMITATIONS
build: NOT_RUN
critical_findings: 0
warnings: 2
artifacts:
  - openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/verify-report.md
decision: VERIFIED
next: Archive
```

# Verify Report: SPEC-SDD-0002 - SDD v3.0 Stable Release

## Decision

**VERIFIED.** All SPEC-SDD-0002 requirements and scenarios pass with two
documented, non-blocking limitations: canonical-wide formatting remains
unclean outside the bounded Apply set, and the preserved SPEC-SDD-0001
baseline regression remains 35/36 because of an unrelated audit-count drift.
Neither limitation is a SPEC-SDD-0002 implementation failure.

This report does not start Archive, Health Report, Repository Ready, Commit,
Push, Merge, Release, or Tag. Stable declaration, tag publication, and freeze
reactivation remain manual final-gate actions and are not claimed here.

## Completeness

| Check                      | Result                                       | Evidence                                                 |
| -------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| Design sections            | PASS, 18/18 exact                            | Independent structural check and `design.md`             |
| Architecture Review topics | PASS, A-G 7/7 exact                          | Independent structural check                             |
| Architecture Review        | PASS, `APPROVED_WITH_CONDITIONS`, no blocker | `architecture-review.md`                                 |
| AR criteria                | PASS, AR-001 through AR-005                  | Review, Phase 5 evidence, and validators                 |
| DC criteria                | PASS, DC-001 through DC-006                  | Review, Phase 5 evidence, and validators                 |
| Apply implementation tasks | PASS, 10/10 checked                          | `tasks.md`                                               |
| Apply phases               | PASS, 5/5 result artifacts marked PASS       | `evidence/phase-1-result.md` through `phase-5-result.md` |
| Apply Summary              | PASS, present and complete                   | `apply-summary.md` consolidates Apply 1-5                |
| Tenant isolation           | NOT APPLICABLE                               | Documentation and validator scope only                   |

The ten checked tasks are the Apply implementation checkpoints. The later
Direct report checklist remains intentionally open in `tasks.md`; it is not
used to claim that Archive, Health Report, or Repository Ready has run.

The Apply Summary records the historical pre-fix focused result of 24/24.
The current complete rerun is 29/29 because the VER-001 transition tests are
now included.

## Architecture Review And Apply Criteria

| Criterion | Result | Evidence                                                                                                             |
| --------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| AR-001    | PASS   | Exact one-time v2.1 opt-in fields, target revision, supersession, and completed-evidence preservation are validated. |
| AR-002    | PASS   | Candidate-only state rejects Stable, published tag, active freeze, and automatic transition before the manual gate.  |
| AR-003    | PASS   | Baseline and Phase 5 snapshots preserve dirty Direct/recovery work; unclassified paths fail closed.                  |
| AR-004    | PASS   | Eight canonical documents use one exact v3.0 contract with legacy mappings and links.                                |
| AR-005    | PASS   | `architecture-review.md` remains the approval record; no lifecycle or release gate was executed.                     |
| DC-001    | PASS   | Forward-only, one-time, append-only opt-in and supersession rules pass.                                              |
| DC-002    | PASS   | Stable, tag, freeze, release, and automatic transitions remain inactive.                                             |
| DC-003    | PASS   | Declared paths, preserved paths, and fail-closed scope checks pass.                                                  |
| DC-004    | PASS   | Cross-document identity, version, baseline, tag, compatibility, links, and mappings agree.                           |
| DC-005    | PASS   | Review approval and final Release/Tag authorization remain separate.                                                 |
| DC-006    | PASS   | Legacy and strict v3.0+ evidence policies remain distinct and validated.                                             |

AR-NB-001 and AR-NB-002 remain `CLOSED`. The final release SHA and tag object
are deferred, and the accepted legacy-baseline limitation is preserved.

## Requirement Compliance

| Requirement                               | Result                          | Evidence                                                                                                                                                              |
| ----------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-001 Documentation-only release contract | PASS                            | Change-local scope has no unclassified paths; product/runtime, schema, dependency, global configuration, SPEC-SDD-0001, and recovery paths are excluded or preserved. |
| R-002 One stable authority set            | PASS                            | The eight canonical documents contain one exact candidate identity and contract.                                                                                      |
| R-003 Forward-only v2.1 adoption          | PASS                            | One-time marker, source/target identity, target revision, Design boundary, supersession, and completed-evidence preservation pass.                                    |
| R-004 Versioned release evidence          | PASS WITH DOCUMENTED LIMITATION | `PASS_WITH_LEGACY_BASELINE` remains limited to pre-v3.0 evidence; v3.0+ requires an explicit source commit and `canonical-v3-aggregate/v1`.                           |
| R-005 Final-gate-only Stable state        | PASS                            | Candidate state, unpublished tag, pending freeze, deferred verified commit, and unexecuted final gate are exact.                                                      |
| R-006 Scope and preservation safety       | PASS                            | The Phase 5 snapshot, Workflow Guard hash, Direct-mode hash, and SPEC-SDD-0001 preservation check all pass.                                                           |

## Scenario Matrix

| Scenario                                    | Test or evidence                                                  | Result                                      |
| ------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------- |
| Rerun identity and idempotency              | Release contract tests and release validator                      | COMPLIANT                                   |
| Candidate Stable, tag, and freeze rejection | Release contract tests and candidate-state checks                 | COMPLIANT                                   |
| One-time opt-in and immutable v2.1 evidence | Release contract tests and manifest contract                      | COMPLIANT                                   |
| Declared scope and preservation             | Phase 1/Release/Phase 5 validators and independent snapshot check | COMPLIANT                                   |
| Architecture Review approval boundary       | Completeness check, Phase 5 evidence, and validator               | COMPLIANT                                   |
| SPEC-SDD-0001 legacy baseline distinction   | Readiness/audit validators plus attribution check                 | COMPLIANT WITH DOCUMENTED LEGACY LIMITATION |

## VER-001 Resolution

VER-001 is resolved. The transition-aware classifier now treats the completed
Apply Summary and Verify report as the only allowed downstream reports at the
current `Verify` phase. Archive, Health Report, and Repository Ready remain
deferred and fail closed.

Evidence:

- `validate-phase1.mjs`: exit 0; `owned=8`, `preserved=8`, `future=17`,
  `transitioned=2`, `excluded=102`, `deferred=0`, `unclassified=0`.
- `validate-release.mjs`: exit 0; `owned=26`, `preserved=7`,
  `future=0`, `transitioned=2`, `excluded=102`, `deferred=0`,
  `unclassified=0`.
- `validate-phase5.mjs`: exit 0 with the same zero deferred/unclassified
  result and preserved snapshot.
- Full change-local suite: 29 passed, 0 failed.
- Transition tests accept completed Apply Summary/Verify reports, reject
  early downstream reports, require Apply Summary ordering, and preserve the
  Phase 5 snapshot.

## VER-002 Classification

VER-002 remains a **NON-BLOCKING DOCUMENTATION LIMITATION**. The bounded Apply
file set passes Prettier. The canonical-wide targeted check exits 1 only for:

- `tasks-review.md`
- `apply-summary.md`
- `docs/SDD-WORKFLOW.md`
- `docs/architecture/sdd-v3-roadmap.md`

The broader Design-declared check also reports pre-existing or excluded
architecture files under `docs/architecture/adr/`,
`docs/architecture/module-composition.md`,
`docs/architecture/platform-roadmap.md`, and `docs/architecture/sdd-direct.md`.
No canonical-wide formatting command was run with `--write`; the only
`--write` operation formatted this report itself. This limitation does not
hide a SPEC-SDD-0002 contract, scope, or runtime failure.

## Baseline Evidence And Preservation

### SPEC-SDD-0001

The focused baseline command remains non-clean:

```text
node --test openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/validation/test/*.test.mjs
exit: 1
result: 35 passed, 1 failed
```

The sole failure is the canonical-history count assertion. Current observed
counts are 28 archive directories, 26 readable reports, 22 included records,
and 6 excluded entries; the test expects 27, 25, 22, and 5. The current audit
identifies the extra unrelated archive directory
`openspec/changes/archive/2026-07-24-SPEC-SDD-0001-sdd-v3-stabilization/`.

An isolated temporary attribution audit that omits only that directory returns
27/25/22/5, 0 explicit source commits, and
`PASS_WITH_LEGACY_BASELINE`. The repository was not changed by that check.

The accepted semantics remain explicit:

- Pre-v3.0 evidence may use `PASS_WITH_LEGACY_BASELINE`.
- No historical aggregate is claimed for the pre-v3.0 population.
- v3.0+ records require an explicit 40-character lowercase source commit and
  `canonical-v3-aggregate/v1`.

Baseline structure, fixture validation, reconciliation, readiness, canonical
audit, declared-owned-path doorbell, and syntax checks pass. The current
worktree SPEC-SDD-0001 scope command exits 1 because it sees current
SPEC-SDD-0002 and Direct/recovery paths outside the SPEC-SDD-0001 scope; it is
not used as clean-baseline proof.

### SPEC-SDD-0002 Preservation

| Fact                                               | Result                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------- |
| `HEAD`                                             | `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce`                                 |
| Current changed paths                              | 137                                                                        |
| Allowed downstream paths at Verify                 | Apply Summary and Verify report only                                       |
| Remaining paths after downstream/Phase 5 exclusion | 132                                                                        |
| Pre-Phase 5 snapshot                               | 132 paths; path-set hash matches                                           |
| Workflow Guard hash                                | Matches `c1f0e1396cca4f17658742b6e5408bcb3b6915c39e48007a2f012fa118ca6c8f` |
| Direct-mode section hash                           | Matches `7ff0a463c3771e6526932e7703a2e2c76636b77f80ecf602759e2ec51cd2b8d1` |
| SPEC-SDD-0001 changed paths                        | None                                                                       |

The non-report changed-file fingerprint captured before this Verify report was
written and the post-update fingerprint are both
`219246a664681dfbaf036715760c8592472b07e7351b156e095252f1ed7b4187`, with
136 paths in each snapshot. The independent comparison returned
`non_report_paths_unchanged=true`; only this report changed in this call.

## Candidate-State Check

The release manifest and all eight canonical metadata blocks agree on:

```text
release_id: sdd-v3.0-stable
version: v3.0
implementation_baseline: c028537bae6fe1d8ecafc3974cd9cf0e46a673ce
planned_baseline_tag: sdd-v3.0-baseline
release_state: candidate
stable_declaration: maintainer-only-after-repository-ready
planned_tag_state: NOT_PUBLISHED
freeze_state_after_final_gate: PENDING
final_gate.status: NOT_EXECUTED
final_gate.verified_commit: DEFERRED
final_gate.automatic_transition: FORBIDDEN
```

No Stable, freeze, release, tag, commit, push, merge, automatic transition,
or Archive action was executed or claimed. The Architecture Review remains the
approval record and is not final release authorization.

## Command Evidence

Output hashes are SHA-256 hashes of the exact captured command output. The
empty-output hash is used for syntax and whitespace checks that emit no output.

| Command                                                                                       | Exit | Result                                                        | Output hash                                                               |
| --------------------------------------------------------------------------------------------- | ---: | ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `node openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/validation/validate-phase1.mjs`    |    0 | PASS; Verify transition and scope                             | `sha256:6afd93322fcca40843f09bcaf01b74ee20d3cd0dee78ae24e2a053c200fa0cd0` |
| `node openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/validation/validate-release.mjs`   |    0 | PASS; contract and scope                                      | `sha256:156af37307360e63611573a38776c40fc92469efadacfb996afd685bd5207a5c` |
| `node openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/validation/validate-phase5.mjs`    |    0 | PASS; AR/DC, preservation, candidate state                    | `sha256:373e37579e757cc638077fb5c598a2ee314daa5b10c5e56965bdd0263f1a71ff` |
| `node --test openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/validation/test/*.test.mjs` |    0 | PASS; 29/29                                                   | `sha256:c33259db42bf7801218c81a55954f1521e6f2b355831b9a26c75476d58c48e0f` |
| All six change-local validators/tests with `node --check`                                     |    0 | PASS                                                          | `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Bounded Apply-file `pnpm exec prettier --check`                                               |    0 | PASS                                                          | `sha256:17aa973d3f004560237d9a95171210b0671deff23d61628eecf7322ff5938f20` |
| Canonical-wide targeted `pnpm exec prettier --check`                                          |    1 | NON-BLOCKING VER-002; four files                              | `sha256:0ce15adb081a39dbfefb5079467f16526737192f6fdf08e33dcc6f8c23e977ce` |
| Design-declared broad `pnpm exec prettier --check`                                            |    1 | NON-BLOCKING; excluded/pre-existing files                     | `sha256:242c8694dc97e589168305ee2302f70d6dc8ce00942034704b34cbe716c4fdd9` |
| `git diff --check` on the declared tracked paths                                              |    0 | PASS; no whitespace errors                                    | `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Independent Design/Review/Tasks/Apply completeness check                                      |    0 | PASS; 18/18, A-G 7/7, 10/10, 5/5                              | `sha256:b086535dca1ec019494460bd01d607ae6b2f40e017455639ccb98b68e95ccdb4` |
| Independent candidate-state and eight-block check                                             |    0 | PASS                                                          | `sha256:63ec56219c791c9cc0a520787d7115e0cb0b9bd316b8372d30b936a4c7de88ee` |
| Independent Phase 5 snapshot and preservation check                                           |    0 | PASS; hashes and 132-path snapshot match                      | `sha256:d701990af4112121ade4b9323e2828a8c1f4f288e1fb737f3a46cd62f73c38e7` |
| Non-report changed-file fingerprint comparison                                                |    0 | PASS; pre/post fingerprints and counts match                  | `sha256:8e9e1f2046b637faa5a796f676f31eb2d16a166f16bc5a5eed17f6de0826bb10` |
| `node --test openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/validation/test/*.test.mjs`  |    1 | 35/36; documented external baseline limitation                | `sha256:75cde684757eb235a25af12fb6091a7d858580f856c6c700fe06bff2708c1972` |
| SPEC-SDD-0001 structure validator                                                             |    0 | PASS                                                          | `sha256:9ebddc7a41770e9f9867041e9d7128fceb85ddf091dc6b392e0eeccbdcc65342` |
| SPEC-SDD-0001 fixture validator                                                               |    0 | PASS; 22/22                                                   | `sha256:91b878304d7807a7f36512e6cbd13ae06aa27ed228b80a19cb894501eed93fca` |
| SPEC-SDD-0001 reconciliation `--twice`                                                        |    0 | PASS; inserted=22, duplicates=22                              | `sha256:f9858e385bd33b3ae58201b2582486c58740aff2415751dc9fead5cb60a2ceb3` |
| SPEC-SDD-0001 readiness validator                                                             |    0 | PASS; legacy accepted, v3 strict                              | `sha256:e7c74a274a7676d6a3308ae4583d0b811c4ca8aea29f4fb1a79452259b73b56e` |
| SPEC-SDD-0001 canonical audit                                                                 |    0 | PASS_WITH_LEGACY_BASELINE; 28/26/22/6                         | `sha256:2e18844dfee3bb46d930966f01e9053080bf5694a09631bd844d472439920cf9` |
| SPEC-SDD-0001 declared-owned-path doorbell                                                    |    0 | PASS; 30 owned, 0 failures                                    | `sha256:a951901fedc00ff9a3cb94b41bb4e5f3dd05c16d01003338ca9a91032f1dd881` |
| SPEC-SDD-0001 `validate-changed-paths.mjs --current-worktree`                                 |    1 | Expected non-clean current-worktree scope; not baseline proof | `sha256:d383a22a30e8c8eda53f061bcadb0b0765605a565456f19acbf903b0952877e2` |
| SPEC-SDD-0001 `validate-changed-paths.mjs` syntax check                                       |    0 | PASS                                                          | `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Temporary baseline attribution audit without unrelated archive                                |    0 | PASS_WITH_LEGACY_BASELINE; 27/25/22/5                         | `sha256:dbee562214caac75f3b397cf897bdfd7cfb928d0f7f1916971047986012549e8` |

Build is `NOT_RUN` because the approved Design declares a documentation and
Node.js-validator change with no product build, migration, Prisma generation,
deployment, or runtime command in scope. Product/runtime behavior was not
executed or changed.

## Findings

### CRITICAL

None.

### NON-BLOCKING

- **VER-002:** canonical-wide Prettier limitations documented above; bounded
  Apply formatting passes.
- **SPEC-SDD-0001 baseline:** 35/36 focused tests due the unrelated
  canonical-history count drift; legacy semantics and attribution are explicit.

No VER-001 blocker remains. No product/runtime, tenant, schema, dependency,
global configuration, SPEC-SDD-0001, or unrelated recovery change was made by
this Verify call.

## Direct Structured Result

```yaml
status: VERIFIED
change: SPEC-SDD-0002-sdd-v3-stable-release
phase: Verify
artifacts:
  - openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/verify-report.md
decision: VERIFIED
next: Archive
evidence:
  - VER-001 resolved; transition-aware validators and 29/29 change-local tests pass.
  - AR-001..005 and DC-001..006 pass with five Apply phases and Apply Summary complete.
  - Candidate-only Stable/freeze/release/tag state is intact; manual gates remain pending.
  - VER-002 and the SPEC-SDD-0001 35/36 baseline limitation are documented as non-blocking and unrelated to a SPEC-SDD-0002 failure.
  - Scope, preservation, no-runtime-change, and no-SPEC-SDD-0001-change checks pass.
next_action: Do not start Archive in this call; it is the next separate Direct phase.
```
