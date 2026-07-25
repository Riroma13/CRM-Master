# Design: SPEC-SDD-0002 - SDD v3.0 Stable Release

> **Status:** Draft - Design only. No Stable declaration, release, tag, or freeze transition is executed here.
> **Baseline:** SPEC-SDD-0001 at `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce`.
> **Scope:** Documentation and release governance only; no runtime or new workflow behavior.

## 1. Executive Summary

This change turns the committed SPEC-SDD-0001 stabilization result into the SDD v3.0 Stable documentation contract. It promotes the existing 18-section Enterprise Design Standard and Architecture Review Preparation A-G, publishes one explicit authority set, and records v2.1 compatibility, migration, deprecation, and release rules. Existing v2.1 artifacts remain immutable historical evidence. Freeze restoration is deferred until the final maintainer-controlled Release/Tag gate after Repository Ready; this Design does not perform that gate.

## 2. Technical Approach

Use the SPEC-SDD-0001 commit as the immutable implementation baseline, then classify every relevant document as authoritative, compatible, historical, deprecated, or superseded. Later Apply work changes documentation metadata, references, and release records only; it does not rewrite archived Designs, add phases, alter Guard transitions, add agents or commands, or change product/runtime code.

The Workflow Guard remains the sole transition authority, the Enterprise template remains the artifact-shape authority, and the Master Prompt remains the Design-generation authority. A v3.0 release-notes manifest joins those authorities without replacing them. Adoption is forward-only: new work after the stable cutover uses v3.0, while closed v2.1 work keeps its original identity and semantics.

## 3. Architecture Decisions

| Decision             | Options                                                                                          | Chosen                                                                | Rationale                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Release baseline     | Dirty worktree; current branch; committed SPEC-SDD-0001                                          | `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce`                            | A committed, verified baseline is reproducible and excludes unrelated recovery changes.           |
| Stable authority set | One new registry; scattered current documents; explicit existing documents plus release manifest | Existing Guard/template/policy documents plus one manifest            | Preserves existing ownership and avoids a second workflow or artifact store.                      |
| Release identity     | Re-label v2.1; `v3.0`; `v3.0.0`                                                                  | `v3.0`, release id `sdd-v3.0-stable`, planned tag `sdd-v3.0-baseline` | Major/minor matches the project baseline convention while the release id is unique and auditable. |
| Migration            | Rewrite all v2.1 artifacts; dual active schemas; forward-only adoption                           | Preserve v2.1, adopt v3.0 at cutover                                  | Prevents historical mutation and keeps old review evidence comparable.                            |
| Legacy documents     | Delete; silently retain; classify and banner                                                     | Retain with explicit status and replacement                           | Audit history survives, while readers have one unambiguous current authority.                     |
| Freeze restoration   | At Design; at Verify; at final release gate                                                      | Final maintainer Release/Tag gate only                                | Stable must not be declared before all evidence and release identity are final.                   |

## 4. Data Flow

```text
SPEC-SDD-0001 commit -> authority inventory -> v2.1/v3.0 adoption matrix
                              |                         |
                              v                         v
                     stable document set -> release notes + changelog
                                                      |
                                                      v
                              Verify -> Repository Ready -> manual Release/Tag
```

The happy path reads committed baseline artifacts, classifies documents, and produces the final documentation set. A missing baseline, conflicting authority, changed historical artifact, or unclassified path fails closed. No tenant, product, runtime, or database data enters this flow.

## 5. Working Set

### 5.1 Primary Files

| #   | File                                                             | Action       | Reason                                                                                       |
| --- | ---------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| 1   | `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/design.md` | Create now   | This is the only artifact produced in the current Design phase.                              |
| 2   | `docs/architecture/sdd-v3.0-release-notes.md`                    | Create later | Canonical release manifest, authority set, compatibility, migration, and deprecation record. |
| 3   | `docs/architecture/adr/0021-sdd-v3-stable-release.md`            | Create later | Records the v3.0 release and final freeze policy without changing runtime behavior.          |
| 4   | `docs/architecture/platform-baseline.md`                         | Modify later | Moves the current baseline record from v2.1 to the approved v3.0 release identity.           |
| 5   | `docs/sdd-workflow-guard.md`                                     | Modify later | Updates version/release references only; transition semantics remain unchanged.              |
| 6   | `docs/templates/design-enterprise-template.md`                   | Modify later | Marks the already-implemented 18-section/A-G shape as the v3.0 stable standard.              |
| 7   | `docs/templates/design-master-prompt.md`                         | Modify later | Updates version and adoption references without changing the Design contract.                |
| 8   | `docs/architecture/sdd-infrastructure.md`                        | Modify later | Records the stable release and reactivated freeze policy without adding checks or phases.    |
| 9   | `docs/architecture/CHANGELOG.md`                                 | Modify later | Adds the dated v3.0 Stable entry and links the release notes.                                |

### 5.2 Secondary Files

| #   | File                                                                                             | Action       | Reason                                                                      |
| --- | ------------------------------------------------------------------------------------------------ | ------------ | --------------------------------------------------------------------------- |
| 1   | `docs/SDD-WORKFLOW.md`                                                                           | Modify later | Adds a historical v2.0/v2.1 banner; the Guard remains normative.            |
| 2   | `docs/templates/design-prompt.md`                                                                | Modify later | Marks the duplicate Design prompt deprecated in favor of the Master Prompt. |
| 3   | `docs/architecture/sdd-v3-roadmap.md`                                                            | Modify later | Marks the pre-release vision superseded by the stable release record.       |
| 4   | `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/validation/validate-release.mjs`           | Create later | Change-local structural, authority, migration, and scope validation.        |
| 5   | `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/validation/test/release-contract.test.mjs` | Create later | RED/GREEN checks for the exact document and version contract.               |

### 5.3 Expected NOT to Change

- `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/**` and its dated archive — committed baseline and historical evidence are immutable.
- `openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/proposal.md`, `specs/**`, `tasks.md`, review artifacts, and implementation artifacts in this turn — Design approval is required first.
- `.opencode/**`, `scripts/validate-sdd-direct.mjs`, `docs/architecture/sdd-direct.md`, and global OpenCode/Gentle-AI configuration — Direct execution infrastructure is outside this release contract.
- Product source, schema, migrations, dependencies, lockfiles, tenant behavior, and runtime tests — no runtime behavior is in scope.
- `docs/history/**`, `docs/roadmaps/future-roadmap.md`, `docs/roadmaps/future-prompts.md`, and prior SPEC artifacts — retained as historical/reference material.

## 6. Read Order

1. `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/verify-report.md` and its archive report - establish the verified baseline and limitations.
2. Commit `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce` - prove the baseline is committed and separate from dirty recovery work.
3. `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/design.md` and `specs/sdd-v3-stabilization/spec.md` - recover the accepted 18-section/A-G and governance contracts.
4. `docs/sdd-workflow-guard.md` - establish unchanged transition ownership.
5. `docs/templates/design-enterprise-template.md` and `docs/templates/design-master-prompt.md` - establish shape and generation authority.
6. `docs/architecture/platform-baseline.md`, `sdd-infrastructure.md`, and `adr/0004-sdd-feature-freeze.md` - establish current version and freeze policy.
7. `docs/architecture/CHANGELOG.md`, `sdd-v3-roadmap.md`, and `docs/SDD-WORKFLOW.md` - classify historical and release references.
8. `docs/templates/design-prompt.md` and the future roadmap documents - identify duplicates and non-authoritative legacy guidance.
9. Current changed-path inventory - exclude unrelated recovery and Direct infrastructure before Apply.

## 7. Expected Commands

```bash
C=openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release
git diff --check -- "$C" docs/architecture docs/templates/design-enterprise-template.md docs/templates/design-master-prompt.md docs/sdd-workflow-guard.md  # whitespace and patch safety
pnpm exec prettier --check "$C/design.md" docs/architecture docs/templates/design-enterprise-template.md docs/templates/design-master-prompt.md docs/sdd-workflow-guard.md  # documentation formatting
node openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/validation/validate-release.mjs  # release contract
node --test openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/validation/test/*.test.mjs # focused tests
node --test openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/validation/test/*.test.mjs # baseline regression evidence
```

No build, migration, Prisma generation, product test, deployment, release, tag, or runtime command is expected. Commit, Push, Merge, Release, and Tag remain manual gates after Repository Ready.

## 8. Design Confidence

**Confidence:** Medium

The authority boundaries, baseline commit, migration rules, final document set, and freeze gate are concrete. The final release commit SHA and tag object cannot be known before the maintainer-controlled gates, and the worktree contains unrelated recovery changes. Those values are intentionally deferred rather than guessed; this does not block Architecture Review of the Design.

## 9. Exploration Budget

| Resource        | Budget | Notes                                                                                     |
| --------------- | -----: | ----------------------------------------------------------------------------------------- |
| Repo searches   |     12 | Version claims, authority references, duplicate prompts, and forbidden paths.             |
| Files to read   |     30 | Baseline artifacts, policy documents, templates, roadmaps, and current Direct boundaries. |
| Files to create |      5 | This Design, two release/policy artifacts, and two change-local validation files.         |
| Files to modify |      9 | Six stable authorities and three explicit legacy banners.                                 |

## 10. Risks

| Risk                                                | Probability | Impact | Mitigation                                                                                                       |
| --------------------------------------------------- | ----------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| A v2.1 document is mistaken for current authority   | High        | High   | Publish the authority manifest and add explicit historical/deprecated/superseded status.                         |
| Archived evidence is rewritten during migration     | Medium      | High   | Require append-only v3 revisions; reject in-place edits to v2.1 paths.                                           |
| Stable is declared before release evidence is final | Medium      | High   | Keep Stable and freeze restoration behind the final Release/Tag gate.                                            |
| Metadata edits change Guard behavior                | Low         | High   | Compare transition semantics and forbid new phases, agents, commands, and metrics.                               |
| Dirty recovery files enter the release set          | High        | High   | Anchor scope to `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce`, use the Working Set, and fail on unclassified paths. |

## 11. Testing Strategy

| Layer                      | Focus                                                                                     | Approach                                                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Unit/structural            | Exact 18 headings, one A-G block, authority/status enums, release id, and baseline commit | Parse Markdown and the release manifest; fail on missing, duplicate, or unknown entries.                          |
| Integration/reconciliation | Every authoritative path exists, v2.1 mappings are forward-only, and reruns are stable    | Validate links, hashes/commits, one release id, immutable historical paths, and no duplicate migration records.   |
| Doorbell                   | No runtime/workflow/destructive scope leakage                                             | Assert changed paths exclude product code, SPEC-SDD-0001, global config, new phases, release execution, and tags. |
| Regression                 | SPEC-SDD-0001 remains valid                                                               | Run its focused validators/tests from the declared baseline scope without changing its artifacts.                 |

## 12. Doorbell Tests

This release touches no tenant-scoped data, so tenant-isolation tests are not applicable. Documentation safety doorbells are:

| Test file                                   | What it proves                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `validation/test/release-contract.test.mjs` | The stable authority set and exact v3.0 contract are complete and unique.                  |
| `validation/test/release-contract.test.mjs` | The 18-section/A-G Enterprise Design shape is preserved without a second template.         |
| `validation/test/release-contract.test.mjs` | v2.1 artifacts remain immutable and deprecated documents have explicit replacements.       |
| `validation/test/release-contract.test.mjs` | No runtime, new workflow behavior, release, tag, or unrelated recovery path is authorized. |

## 13. Required ADRs

| ADR                                                   | Reason                                                                                 | Status                                                               |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `docs/architecture/adr/0004-sdd-feature-freeze.md`    | Existing freeze authority and rationale; preserve as historical accepted policy.       | Existing                                                             |
| `docs/architecture/adr/0021-sdd-v3-stable-release.md` | Record v3.0 Stable identity, compatibility policy, and final freeze reactivation gate. | Proposed; accepted only after approved review and final release gate |

No schema, product, runtime, or new workflow ADR is required.

## 14. Boundaries

| Boundary                  | Owner                                                                       | Purpose                                                                 |
| ------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Transition semantics      | `docs/sdd-workflow-guard.md`                                                | Sole owner of phase transitions; unchanged by this release.             |
| Design artifact shape     | `docs/templates/design-enterprise-template.md`                              | Sole 18-section/A-G shape authority.                                    |
| Design generation         | `docs/templates/design-master-prompt.md`                                    | Canonical instructions for producing the Design shape.                  |
| Current platform baseline | `docs/architecture/platform-baseline.md`                                    | Publishes the current stable version and baseline identity.             |
| Release compatibility     | `docs/architecture/sdd-v3.0-release-notes.md`                               | Publishes authority, migration, deprecation, and compatibility records. |
| Freeze/release policy     | `docs/architecture/adr/0021-sdd-v3-stable-release.md` plus maintainer gates | Restores freeze only at final Release/Tag closure.                      |
| Historical evidence       | SPEC archives and `docs/history/**`                                         | Immutable, read-only source material.                                   |
| Product/runtime behavior  | Product modules and infrastructure                                          | Explicitly outside this change.                                         |

## 15. Extensibilidad

| Future feature                        | How it fits                                                                                             | Effort |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------ |
| v3.0 patch release                    | Add an erratum and release note while preserving the 18/A-G contract and v3 compatibility.              | Days   |
| New authoritative governance document | Add one manifest entry, owner, status, and ADR rationale; do not duplicate Guard or template authority. | Days   |
| New workflow phase or behavior        | Requires a separate evidence-backed ADR and major-version review; it is not a v3.0 extension.           | Weeks  |
| SDD v4 migration                      | Publish a new versioned contract and append-only migration mapping; never rewrite v2.1/v3.0 history.    | Weeks  |

---

## Architecture Review Preparation (MANDATORY)

### A. Scalability

**Question:** How does the release contract scale with 10x and 100x the document population?

| Factor           | 10x                                      | 100x                                  | Mitigation                                                                                            |
| ---------------- | ---------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Storage          | Linear Markdown growth                   | Linear archive/release growth         | Keep source files append-only; avoid a runtime registry.                                              |
| Query latency    | Human/reviewer lookup remains path-based | Inventory lookup may become expensive | Use stable paths, ids, and version fields; split release manifests only by major version if measured. |
| Write throughput | Normal document commits                  | Batched documentation updates         | One release id and bounded Working Set; no database or queue.                                         |
| Memory           | Fits current document tooling            | Large archive scans may grow          | Stream validation by path and version before considering tooling changes.                             |

**Decision:** Keep the release contract file-based and indexed by explicit manifest entries. **Rationale:** the change is documentation-only and has no measured need for runtime storage. **Alternative:** database-backed governance registry; rejected as new infrastructure. **Future impact:** measured archive growth may justify a separate tool, never an implicit v3 behavior change.

### B. Open/Closed Principle (OCP)

**Point of extension:** Add a versioned document entry to `sdd-v3.0-release-notes.md` and the changelog.

**What must change to add one more:** The new document, its owner, status, compatibility role, and an ADR if it changes policy.

**Decision:** Extend the manifest as data; do not modify Guard logic for document additions. **Rationale:** new authorities remain explicit and reviewable. **Alternative:** add a new agent or phase; rejected because it changes workflow behavior. **Future impact:** v3 patch releases can add corrections without changing the contract.

### C. Ownership

| Data / Capability                         | Owner                       | Consumers                       |
| ----------------------------------------- | --------------------------- | ------------------------------- |
| Guard transitions                         | Workflow Guard owner        | Direct and legacy orchestrators |
| 18-section/A-G shape                      | Template owner              | Design authors and reviewers    |
| Baseline/version status                   | Platform architecture owner | Maintainers and all SDD phases  |
| Historical archives                       | Archive owner               | Auditors and metrics readers    |
| Migration/deprecation manifest            | SPEC-SDD-0002 release owner | Maintainers, reviewers, agents  |
| Stable declaration and freeze restoration | Maintainer                  | Release operators               |

**Decision:** One owner publishes each authority; consumers are read-only. **Rationale:** prevents conflicting policy. **Alternative:** allow every phase to publish status; rejected because it recreates authority drift. **Future impact:** each future governance artifact must name its owner before Apply.

### D. Data Retention

| Data                          | Lifetime                          | Archive                                       | Deletion                                      |
| ----------------------------- | --------------------------------- | --------------------------------------------- | --------------------------------------------- |
| v2.1 designs and reports      | Indefinite                        | Existing OpenSpec/archive paths               | Prohibited except ADR/legal hold              |
| v3.0 stable documents         | Current plus superseded revisions | Release notes, changelog, and baseline commit | Never delete; append corrections              |
| Migration/deprecation records | Indefinite                        | Release manifest and ADR                      | Prohibited; supersede with a new revision     |
| Derived dashboards/roadmaps   | Historical                        | Existing dated path                           | May regenerate only if source history remains |

**Decision:** Preserve all release and migration evidence indefinitely. **Rationale:** compatibility and auditability require historical context. **Alternative:** rewrite old headers in place; rejected because it destroys provenance. **Future impact:** legal deletion requires an explicit ADR and marker.

### E. Idempotency

| Operation               | Duplicate risk | Protection                                          | Fallback                                                          |
| ----------------------- | -------------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| Register stable release | Yes            | Unique `release_id: sdd-v3.0-stable`                | Fail closed on conflicting baseline/tag.                          |
| Adopt a document        | Yes            | Stable path plus source revision and target version | Append a new revision; do not overwrite history.                  |
| Add changelog entry     | Yes            | One entry keyed by release id                       | Report duplicate and keep the first authoritative entry.          |
| Restore freeze          | Yes            | Single final-gate decision tied to the release tag  | Leave freeze exception unchanged if final evidence is incomplete. |

**Decision:** All reruns are no-op or fail-closed operations keyed by stable release/document identities. **Rationale:** retries must not create competing Stable states. **Alternative:** delete and regenerate; rejected because it loses audit history. **Future impact:** patch releases use distinct ids and append-only corrections.

### F. Shared Contracts

| Contract                | Location                                              | Consumers                      | Producers                   |
| ----------------------- | ----------------------------------------------------- | ------------------------------ | --------------------------- |
| Stable release manifest | `docs/architecture/sdd-v3.0-release-notes.md`         | Maintainers, reviewers, agents | SPEC-SDD-0002/release owner |
| Design shape            | `docs/templates/design-enterprise-template.md`        | Design and Architecture Review | Template owner              |
| Design generation rules | `docs/templates/design-master-prompt.md`              | Design executors               | Template owner              |
| Transition rules        | `docs/sdd-workflow-guard.md`                          | All orchestrators              | Workflow Guard owner        |
| Version/freeze policy   | `docs/architecture/adr/0021-sdd-v3-stable-release.md` | Maintainers                    | Release owner               |

**Decision:** Use one versioned document manifest and the existing Guard/template contracts; do not add product shared types. **Rationale:** this is governance metadata, not an API. **Alternative:** duplicate contracts in each prompt; rejected because duplication caused authority drift. **Future impact:** consumers validate `version`, `release_id`, and document status before adoption.

### G. Partitioning Strategy

| Dimension | Risk                         | Strategy                                                          |
| --------- | ---------------------------- | ----------------------------------------------------------------- |
| Tenant    | Accidental product scope     | Keep the release inventory tenant-neutral.                        |
| Time      | Mixed v2.1 and v3.0 meanings | Partition by version and release date; retain source commit.      |
| Volume    | Large archive scans          | Validate by release/version batches; defer physical partitioning. |

**Decision:** Partition logically by SDD version and release identity, not by tenant or runtime storage. **Rationale:** preserves comparability without a destructive migration. **Alternative:** rewrite all old documents into v3.0; rejected because it changes history. **Future impact:** explicit version fields allow later tooling to scale without changing document meaning.

## 16. Interfaces / Contracts

### Stable release manifest

```yaml
release_id: sdd-v3.0-stable
version: v3.0
implementation_baseline: c028537bae6fe1d8ecafc3974cd9cf0e46a673ce
planned_baseline_tag: sdd-v3.0-baseline
stable_declaration: maintainer-only after Repository Ready
freeze_state_after_final_gate: ACTIVE
canonical_documents:
  - docs/sdd-workflow-guard.md
  - docs/templates/design-enterprise-template.md
  - docs/templates/design-master-prompt.md
  - docs/architecture/platform-baseline.md
  - docs/architecture/sdd-infrastructure.md
  - docs/architecture/adr/0021-sdd-v3-stable-release.md
  - docs/architecture/sdd-v3.0-release-notes.md
  - docs/architecture/CHANGELOG.md
```

The manifest is documentation-only. The planned tag is a release identity, not an action in this Design.

### Document status and compatibility

| Path or set                                                    | v3.0 status           | Rule                                                                           |
| -------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------ |
| The eight manifest documents above                             | Authoritative         | Current source for their named responsibility.                                 |
| `docs/SDD-WORKFLOW.md`                                         | Historical/compatible | Retain for v2.0/v2.1 context; never use it to resolve transitions.             |
| `docs/templates/design-prompt.md`                              | Deprecated            | Read only for historical v2.1 work; use the Master Prompt for new Design work. |
| `docs/architecture/sdd-v3-roadmap.md`                          | Superseded            | Retain its evidence; the stable release notes replace its future-state claims. |
| `docs/roadmaps/**`, `docs/history/**`, and archived SPEC paths | Historical/reference  | Do not rewrite or treat as current authority.                                  |
| Product/runtime and Direct execution paths                     | Not in release        | No change, migration, or version claim is authorized here.                     |

### v2.1 to v3.0 adoption contract

| Artifact state                       | Version treatment                                   | Adoption rule                                                               |
| ------------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------- |
| Closed or archived v2.1 change       | Remains v2.1                                        | Preserve its review, metrics, paths, and source commit indefinitely.        |
| Active v2.1 change before cutover    | Remains v2.1 or opts in at its next Design boundary | Maintainer chooses once; never rewrite completed evidence.                  |
| New change after `sdd-v3.0-baseline` | v3.0 required                                       | Use the canonical template and A-G preparation from its first Design.       |
| Reopened v2.1 change after cutover   | New v3.0 revision                                   | Link the old revision as superseded; do not edit the old artifact in place. |

## 17. Migration Strategy

| Step | Description                                                                                                                                                                                   | Risk   | Rollback                                                                        |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------- |
| 1    | Freeze the SPEC-SDD-0001 baseline at `c028537bae6fe1d8ecafc3974cd9cf0e46a673ce` and verify the declared Working Set.                                                                          | Medium | Stop; no source artifacts are changed.                                          |
| 2    | After Design approval and Architecture Review, create the release notes, ADR, and change-local validators.                                                                                    | Low    | Remove only unapproved new artifacts before Repository Ready.                   |
| 3    | Update stable-document metadata and historical banners without changing Guard transitions or the 18/A-G body.                                                                                 | High   | Restore the prior document revision; retain the audit record.                   |
| 4    | Apply the forward-only adoption matrix; leave all v2.1 archives and closed changes unchanged.                                                                                                 | High   | Revert the adoption pointer, never rewrite archived artifacts.                  |
| 5    | Verify structure, authority links, migration idempotency, scope, and SPEC-SDD-0001 regression evidence.                                                                                       | Medium | Remain non-Stable and report the failed check.                                  |
| 6    | Reach Repository Ready with Stable declaration and freeze restoration still pending.                                                                                                          | High   | Do not publish release state if any prerequisite is missing.                    |
| 7    | At the final maintainer Release/Tag gate, publish the release notes, declare `sdd-v3.0-stable`, create `sdd-v3.0-baseline`, and reactivate the freeze atomically against the verified commit. | High   | Use a new corrective patch/release; never delete or retarget published history. |

No schema migration, feature flag, backward-compatibility runtime layer, deployment, or automatic workflow transition is required.

## 18. Open Questions

| #   | Question                                                                                    | Status                                     | Resolution                                                                     |
| --- | ------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------ |
| 1   | Does the maintainer approve this authority set and the no-runtime/no-new-workflow boundary? | Open - blocking before Architecture Review | Required approval for the next Direct transition.                              |
| 2   | What is the final release commit SHA?                                                       | Deferred                                   | Resolved only at the manual Commit/Push/Merge gates; never guessed in Design.  |
| 3   | What tag identifies the stable baseline?                                                    | Resolved                                   | `sdd-v3.0-baseline`, created only at the final manual Tag gate.                |
| 4   | When does v2.1 adoption end?                                                                | Resolved                                   | At the verified stable tag; existing v2.1 artifacts remain historical forever. |
| 5   | Is Direct execution infrastructure part of this release contract?                           | Resolved                                   | No. It remains additive, unchanged, and outside the stable document set.       |

> **Stop after Design.** Do not generate proposal/spec compatibility artifacts or start Architecture Review until the maintainer approves this Design.
