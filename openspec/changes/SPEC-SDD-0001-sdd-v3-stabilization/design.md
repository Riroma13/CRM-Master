# Design: SPEC-SDD-0001 — SDD v3.0 Stabilization

> **Status:** Refinement after Architecture Review **REJECTED**. **Scope:** Documentation and artifact governance only; no product/runtime behavior changes.
> **Temporary freeze exception:** `SDD_FEATURE_FREEZE_EXCEPTION = SPEC-SDD-0001`. This is the only exception; SPEC-SDD-0002 restores the freeze and owns Stable/release/tag work.

## 1. Executive Summary

This design reconciles the SDD v3 stabilization evidence and contracts without implementing a new workflow phase, agent, prompt layer, command, metric, or product behavior. Canonical archived SPEC artifacts, not dashboard rows, are the historical source of truth. The canonical audit reproducibly establishes the exact 22-record population and exclusions; no historical aggregate is claimed for the pre-v3.0 baseline. Readiness is **PASS_WITH_LEGACY_BASELINE** under the approved Legacy Baseline Exception, while v3.0+ remains strict and requires explicit canonical source commits and the approved `canonical-v3-aggregate/v1` definition. Readiness is a documentation gate only and remains separate from SPEC-SDD-0002 release activities.

## 2. Technical Approach

Use the existing Workflow Guard as transition authority, the Constitution/ADR index as policy authority, templates as artifact-shape authority, archive reports as immutable historical evidence, and dashboards as dated read-only derivatives. Reconciliation operates on document metadata and content hashes; it does not read or modify product data.

Each improvement is classified exactly once as Adopt, Modify, Document Only, Defer, or Reject. Evidence is accepted only when it names distinct archive paths and the commit that archived each path. A single source, a single archive, or an unverified ratio is insufficient for an implementation claim and is classified conservatively.

## 3. Architecture Decisions

| Decision              | Options                                                                    | Chosen                                                                      | Rationale                                                                       |
| --------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Historical population | Dashboard totals; roadmap totals; canonical archive audit                  | Canonical archived SPEC artifacts; exact membership pending canonical audit | Dashboard and roadmap totals are derived views with conflicting membership.     |
| Authority hierarchy   | Every context document; dashboard; Guard/policy/template/archive hierarchy | Guard/policy/template/archive hierarchy; dashboard is derived               | Prevents policy drift and preserves immutable evidence.                         |
| Document identity     | Path only; content hash only; logical ID plus revision hash                | Stable `document_id` plus `revision_id`                                     | Logical ownership survives edits while every content version remains auditable. |
| Evidence threshold    | Promote from one incident; use policy trigger; defer under-evidenced work  | Apply the documented recurrence rule only to distinct archives/commits      | Avoids unsupported historical claims and respects the roadmap policy.           |

## 4. Data Flow

```text
archive reports + git commits -> evidence ledger -> classified inventory
                                       |                 |
                                       v                 v
                              v2.1 fixtures       readiness checks
                                       \                 /
                                        -> approved design evidence
```

The happy path reads exact archive paths, source commits, and versioned fields, then produces later documentation artifacts after review. A duplicate or conflicting authority fails reconciliation; it is never silently overwritten. Product data, tenant data, runtime modules, releases, and tags are outside the flow.

## 5. Working Set

### 5.1 Primary Files

| #   | File                                                            | Action | Reason                                                         |
| --- | --------------------------------------------------------------- | ------ | -------------------------------------------------------------- |
| 1   | `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/design.md` | Modify | This refinement artifact; the only file changed in this phase. |

### 5.2 Secondary Files

| #   | File                                                                               | Action       | Reason                                                            |
| --- | ---------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------- |
| 1   | `docs/sdd-workflow-guard.md`                                                       | Modify later | Canonical authority and reconciliation references after approval. |
| 2   | `docs/templates/design-enterprise-template.md`                                     | Modify later | Canonical A–G contract only if approved by ADR.                   |
| 3   | `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/fixtures/v2.1-manifest.json`  | Create later | Historical source fixture after approved Apply.                   |
| 4   | `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/fixtures/v2.1-field-map.json` | Create later | Explicit one-to-one mapping contract after approved Apply.        |
| 5   | `openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/fixtures/v3.0-sample.json`    | Create later | Versioned v3.0 target fixture after approved Apply.               |

### 5.3 Expected NOT to Change

- Product source, Prisma schema, migrations, runtime tests, and tenant behavior — documentation-only scope.
- `openspec/changes/SPEC-SDD-0002-*` — Stable, freeze restoration, release, and tag are separate.
- Any proposal, spec, tasks, implementation, commit, push, merge, or tag — prohibited by this phase.

## 6. Read Order

1. `docs/architecture/platform-baseline.md` and `docs/architecture/adr/0004-sdd-feature-freeze.md` — establish freeze and evidence policy.
2. `docs/sdd-workflow-guard.md` and `docs/templates/design-enterprise-template.md` — establish transitions and the canonical A–G shape.
3. `docs/history/engineering-dashboard.md` — identify derived rows to exclude.
4. `openspec/changes/archive/*/archive-report.md` and cited archive commits — verify recurrence and historical fields.
5. `docs/architecture/platform-roadmap.md` — reconcile its derived aggregate without treating it as authoritative.

## 7. Expected Commands

```bash
git diff --check "openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/design.md" # whitespace
pnpm prettier --check "openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/design.md" # formatting
```

No build, migration, generate, product test, or runtime command is expected because no product behavior changes.

## 8. Design Confidence

**Confidence:** Medium

The identity, population, A–G, readiness, fixture schemas, and mapping contracts are explicit. Candidate-specific measurements remain unavailable, so roadmap candidates are conservatively deferred; this is a known limitation, not evidence for promotion.

**Canonical v2.1 source paths:** these 22 reports and their source commits are read-only and must remain byte-for-byte unchanged. Dashboard-only rows such as `client-platform`, `client-self-registration`, and `add-portalurl-to-findone` are excluded, and the archived `SPEC-0013` path is explicitly reconciled by the audit. The fixture manifest uses four grouping labels only to make coverage countable; they are not additional historical classifications: `tenant` = 4 records (`SPEC-0002`, `SPEC-0005`, `SPEC-0006`, `SPEC-0008`), `mission-control` = 2 (`SPEC-0003`, `SPEC-0009`), `platform` = 14 (`SPEC-0010` through `SPEC-0017`, `SPEC-0020` through `SPEC-0024`, `SPEC-0028`), and `audit-analytics` = 2 (`SPEC-0018`, `SPEC-0019`). Thus the fixture claims exactly 22 records, not a broader population.

```text
openspec/changes/archive/2026-07-04-SPEC-0002-multi-tenant-isolation-auth/archive-report.md
openspec/changes/archive/2026-07-19-SPEC-0003-dashboard-mission-control/archive-report.md
openspec/changes/archive/2026-07-19-SPEC-0005-tenant-auth/archive-report.md
openspec/changes/archive/2026-07-19-SPEC-0006-tenant-citas/archive-report.md
openspec/changes/archive/2026-07-18-SPEC-0008-tenant-dashboard/archive-report.md
openspec/changes/archive/2026-07-19-SPEC-0009-global-activity-feed/archive-report.md
openspec/changes/archive/2026-07-19-SPEC-0010-universal-search/archive-report.md
openspec/changes/archive/2026-07-20-SPEC-0011-ai-automation-hub/archive-report.md
openspec/changes/archive/2026-07-20-SPEC-0012-communication-platform/archive-report.md
openspec/changes/archive/2026-07-20-SPEC-0013-document-platform/archive-report.md
openspec/changes/archive/2026-07-20-SPEC-0014-integration-platform/archive-report.md
openspec/changes/archive/2026-07-20-SPEC-0015-workflow-engine/archive-report.md
openspec/changes/archive/2026-07-20-SPEC-0016-notification-center/archive-report.md
openspec/changes/archive/2026-07-20-SPEC-0017-activity-timeline/archive-report.md
openspec/changes/archive/2026-07-20-SPEC-0018-audit-platform/archive-report.md
openspec/changes/archive/2026-07-20-SPEC-0019-reporting-analytics/archive-report.md
openspec/changes/archive/2026-07-20-SPEC-0020-ai-knowledge-base/archive-report.md
openspec/changes/archive/2026-07-20-SPEC-0021-public-api/archive-report.md
openspec/changes/archive/2026-07-20-SPEC-0022-plugin-platform/archive-report.md
openspec/changes/archive/2026-07-20-SPEC-0023-billing-platform/archive-report.md
openspec/changes/archive/2026-07-20-SPEC-0024-monitoring/archive-report.md
openspec/changes/archive/2026-07-21-SPEC-0028-jobs-platform/archive-report.md
```

## 9. Exploration Budget

| Resource        |          Budget | Notes                                                              |
| --------------- | --------------: | ------------------------------------------------------------------ |
| Repo searches   |              12 | Authority, candidate, archive, commit, and fixture checks.         |
| Files to read   |              40 | Context/authority files, canonical archive set, and cited sources. |
| Files to create | 0 in this phase | Fixtures require later approved Apply.                             |
| Files to modify |               1 | This design only.                                                  |

## 10. Risks

| Risk                                        | Probability | Impact | Mitigation                                                                       |
| ------------------------------------------- | ----------- | ------ | -------------------------------------------------------------------------------- |
| Historical population conflict persists     | High        | High   | Block on the canonical audit; dashboard and roadmap remain derived only.         |
| One-off evidence is mistaken for recurrence | Medium      | High   | Require distinct archive paths plus source commits for every recurrence row.     |
| Content edit changes logical ownership      | Low         | High   | Separate stable `document_id` from `revision_id` and require supersession links. |
| Release scope leaks into this change        | Low         | High   | Enforce the exact freeze exception and SPEC-SDD-0002 boundary.                   |

## 11. Testing Strategy

| Layer                      | Focus                                                             | Approach                                                                                                        |
| -------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Unit/structural            | Exact headings, one A–G block, enums, unique IDs, fixture schemas | Parse Markdown/JSON and assert exact structure and contracts.                                                   |
| Integration/reconciliation | Duplicate, supersession, rerun behavior                           | Run the same audited inventory twice; assert stable IDs, zero duplicate inserts, and unchanged source evidence. |
| Historical                 | v2.1 mappings, formulas, and separate aggregates                  | Load the named fixtures and require the canonical audit result before comparison passes.                        |
| Safety/regression          | Changed paths and runtime invariance                              | Fail if any product/runtime/release/tag/merge/push artifact appears.                                            |
| Review gate                | Authority conflicts and readiness                                 | Require an approved Architecture Review artifact and zero authority conflicts.                                  |

## 12. Doorbell Tests

This change has no tenant-scoped data and therefore requires no tenant-isolation doorbell test. The documentation safety doorbells are:

| Test file/check                            | What it proves                                                   |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `fixtures/v2.1-manifest.json` validation   | Historical v2.1 evidence is not mixed with v3.0 evidence.        |
| `fixtures/v2.1-field-map.json` validation  | Every source field maps exactly once and no value is recomputed. |
| Reconciliation idempotency check in Verify | The same logical document does not create a second record.       |
| Changed-path safety check                  | Scope remains documentation-only.                                |

## 13. Required ADRs

| ADR                    | Reason                                                       | Status                                                       |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| ADR-0004               | Existing feature-freeze authority and exception boundary     | Existing; remains authoritative.                             |
| Next unused ADR number | Ratify any approved canonical governance change after review | Required only during later approved Apply; not created here. |

## 14. Boundaries

| Boundary             | Owner                                       | Purpose                                                                    |
| -------------------- | ------------------------------------------- | -------------------------------------------------------------------------- |
| Workflow transitions | `docs/sdd-workflow-guard.md` / orchestrator | Owns states, transitions, refinement, and re-review.                       |
| Artifact shape       | `docs/templates/*`                          | Owns required sections and A–G contract.                                   |
| Historical evidence  | Archive owner                               | Owns immutable reports, paths, commits, and source JSON.                   |
| Derived metrics      | Metrics collector/dashboard owner           | Computes dated read-only values; cannot publish policy.                    |
| Readiness            | SPEC-SDD-0001                               | Owns evidence of readiness only; cannot declare Stable or release.         |
| Stable/release       | SPEC-SDD-0002                               | Exclusively owns Stable declaration, freeze restoration, release, and tag. |

## 15. Extensibilidad

| Future feature                      | How it fits                                                                                                     | Effort |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------ |
| Additional canonical archive source | Add a versioned source record and audit rule; do not alter prior records.                                       | Days   |
| New improvement candidate           | Add one evidence-backed inventory row and fixture record; Guard policy remains unchanged.                       | Days   |
| New workflow phase                  | Requires a separate ADR, Guard transition update, template update, and review; not an extension of this change. | Weeks  |

---

## Architecture Review Preparation (MANDATORY)

### A. Scalability

**Question:** How does this design behave at 10x and 100x the audited population?

| Factor           | 10x target             | 100x target             | Mitigation                                                             |
| ---------------- | ---------------------- | ----------------------- | ---------------------------------------------------------------------- |
| Storage          | 10x audited population | 100x audited population | Measure bytes/file count; alert above 2 GB inventory or 80% disk.      |
| Query latency    | p95 <= 2 seconds       | p95 <= 10 seconds       | Record p50/p95 and unresolved links; fail scale check above threshold. |
| Write throughput | >=10 upserts/sec       | >=25 upserts/sec        | Monitor throughput/retries; batch only when below target.              |
| Memory           | <=256 MB peak          | <=1 GB peak             | Stream archives before redesign if threshold is exceeded.              |

**Decision:** Keep reconciliation as indexed metadata plus content hashes and monitor before storage changes. **Rationale:** no product datastore or evidence for one exists. **Alternative:** add a database/queue now; rejected as runtime infrastructure without recurrence evidence. **Future impact:** a later ADR may add storage after measured thresholds are exceeded. These are planning targets, not observed measurements.

### B. Open/Closed Principle (OCP)

**Point of extension:** candidate inventory and versioned registry fields `document_id`, `revision_id`, and `schema_version`.

**Decision:** Add candidates as data plus evidence, not Guard transitions. **Rationale:** policy stays centralized. **Alternative:** add a phase or agent; rejected without policy evidence and ADR. **Future impact:** adding `Review Cost Prediction` changes inventory and fixture only; adding `Release` changes Guard/policy and is outside this SPEC.

### C. Ownership

| Data / Capability           | Owner                       | Consumers          | Consumer restriction                         |
| --------------------------- | --------------------------- | ------------------ | -------------------------------------------- |
| Guard states/transitions    | Workflow Guard/orchestrator | All SDD phases     | Cannot publish policy or bypass transitions. |
| Template shape/A–G          | Template owner              | Authors/reviewers  | Cannot define alternate required fields.     |
| Context state               | `.ai/context/*` owner       | Agents             | Cannot override policy or history.           |
| Archive reports/source JSON | Archive owner               | Evidence/metrics   | Cannot rewrite historical evidence.          |
| Readiness verdict           | SPEC-SDD-0001 review        | Apply/orchestrator | Cannot declare Stable or tag.                |
| Stable/release artifacts    | SPEC-SDD-0002               | Operators          | Cannot be produced by SPEC-SDD-0001.         |

**Decision:** One owner publishes each authority and consumers are read-only. **Rationale:** explicit ownership prevents conflicting policy. **Alternative:** allow multiple owners to publish the same authority; rejected because it creates conflicting policy. **Future impact:** every new artifact selects one owner before Apply.

### D. Data Retention

| Data                           | Lifetime                             | Archive                           | Deletion                                          |
| ------------------------------ | ------------------------------------ | --------------------------------- | ------------------------------------------------- |
| Archive report and source JSON | Indefinite                           | Immutable path plus source commit | Prohibited except ADR/legal hold.                 |
| v2.1 fixtures                  | Indefinite after supersession        | Versioned fixture path            | Never delete; add a revision.                     |
| v3 document metadata           | Active plus superseded revisions     | Registry/archive report           | Never delete on rerun; mark superseded/duplicate. |
| Derived metrics                | Recomputable; dated reports retained | Dashboard history                 | May regenerate; never rewrite source.             |

**Decision:** Retain accepted and superseded evidence indefinitely. **Rationale:** auditability and reproducible comparison. **Alternative:** retain only active documents; rejected because it destroys supersession history. **Future impact:** deletion exceptions require an ADR and explicit marker.

### E. Idempotency

| Operation               | Duplicate risk | Protection                                                            | Fallback                                                   |
| ----------------------- | -------------- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| Import logical document | Yes            | Unique `document_id`; upsert                                          | Quarantine conflicting identity.                           |
| Import content revision | Yes            | Unique `(document_id, revision_id)`                                   | Mark repeated content duplicate; no insert.                |
| Mark replacement        | Yes            | Unique supersession edge                                              | Preserve records and report conflict.                      |
| Reconcile inventory     | Yes            | Upsert key `(change_id, artifact_type, logical_name, schema_version)` | Retry unchanged input; fail closed on authority collision. |

**Decision:** Reruns are upserts keyed by stable logical and revision identities. **Rationale:** retries cannot create duplicate authorities or lose evidence. **Alternative:** delete/rebuild; rejected because it loses audit history. **Future impact:** every importer carries an idempotency key.

### F. Shared Contracts

| Contract                    | Location                                     | Consumers            | Producers                  |
| --------------------------- | -------------------------------------------- | -------------------- | -------------------------- |
| Dispositions/verdicts       | Section 16 and later Guard/template registry | All phase reports    | Reviewer/Guard             |
| Document identity/revisions | Section 16 and later registry                | Dashboard/reviewer   | Archive/reconciliation     |
| Historical field map        | `fixtures/v2.1-field-map.json`               | Comparability checks | Archive/Verify             |
| Readiness result            | Section 17 and later Verify report           | Orchestrator         | Verify/Architecture Review |

**Decision:** Use one versioned governance contract; do not alter `packages/shared/`. **Rationale:** this is SDD metadata, not product behavior. **Alternative:** create product shared contracts in `packages/shared/`; rejected because this change governs SDD metadata only. **Future impact:** producers and consumers validate `schema_version` before exchange.

### G. Partitioning Strategy

| Dimension | Risk                                        | Strategy                                                            |
| --------- | ------------------------------------------- | ------------------------------------------------------------------- |
| Tenant    | Accidental product scope                    | Keep inventory tenant-neutral; reject tenant-scoped runtime writes. |
| Time      | Archive growth and changing derived metrics | Partition reports by archive date and retain source commit.         |
| Volume    | 100x inventory may exceed memory            | Stream/batch by archive path and monitor A thresholds.              |

**Decision:** Partition logically by authority and version first; defer physical partitioning until measured thresholds. **Rationale:** separates v2.1/v3.0 without destructive migration. **Alternative:** tenant partition or runtime storage; rejected because no tenant data or volume evidence exists. **Future impact:** `schema_version` and `source_version` permit later time/volume partitioning.

## 16. Interfaces / Contracts

### Candidate classification

| Candidate                                  | Disposition       | Exact evidence and decision basis                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency Prediction Accuracy             | **Defer**         | No candidate-specific denominator in the canonical archive set; the documented review trigger is unmet.                                                                                                                                                                                                                                                                    |
| Hot File Forecast                          | **Defer**         | No repeated candidate-specific forecast measurement across distinct archive paths/commits.                                                                                                                                                                                                                                                                                 |
| Read Order Quality Score                   | **Defer**         | No candidate-specific fixture or repeated score across the authoritative population.                                                                                                                                                                                                                                                                                       |
| Review Time Prediction                     | **Defer**         | No candidate-specific duration field across the canonical archive set.                                                                                                                                                                                                                                                                                                     |
| Test Selection Accuracy                    | **Defer**         | Test counts exist, but no selection denominator and no repeated candidate metric.                                                                                                                                                                                                                                                                                          |
| False Positive Verify Rate                 | **Defer**         | Severity totals have no false-positive denominator or repeated candidate measurement.                                                                                                                                                                                                                                                                                      |
| Design Drift Detection                     | **Defer**         | No drift baseline or repeated cross-version measurement.                                                                                                                                                                                                                                                                                                                   |
| Guard-led authority/refinement             | **Adopt**         | Two exact commits changed existing Guard rules; this design adopts the existing hierarchy, not a new phase.                                                                                                                                                                                                                                                                |
| Working Set exports/deferred tests         | **Modify**        | `SPEC-0015` at `b1d543bf2e8cf9d1c907c3459159c5ef0e15d4c7`, `SPEC-0016` at `41cfdefd71e3d034dad22f73c66d1a05ec702bb8`, and `SPEC-0017` at `f47e55ab82ee7c9562febf492657201fb7c430e9` record omitted re-export/deferred-test classes; documentation only, with no recurrence ratio asserted.                                                                                 |
| Shared contract/lifecycle concerns         | **Modify**        | `SPEC-0016` at `41cfdefd71e3d034dad22f73c66d1a05ec702bb8`, `SPEC-0017` at `f47e55ab82ee7c9562febf492657201fb7c430e9`, `SPEC-0018` at `cfe4d882a7771f411040aa0df7fd2be30378c997`, and `SPEC-0019` at `68ed43107f750ddaa24a315d24070ff605df75ec` record contract, idempotency, retention, or reconciliation concerns; documentation only, with no recurrence ratio asserted. |
| Observational metrics                      | **Document Only** | Existing derived metrics are documented, but no candidate recurrence calculation supports a new metric family.                                                                                                                                                                                                                                                             |
| Constitution/index consolidation           | **Document Only** | Existing freeze and infrastructure authorities are recorded as a hierarchy without claiming implementation recurrence.                                                                                                                                                                                                                                                     |
| Hotfix skipping/new layers/product changes | **Reject**        | Roadmap and infrastructure policy prohibit runtime expansion and hotfix workflow bypasses.                                                                                                                                                                                                                                                                                 |
| v3.0 Stable release/tag                    | **Defer**         | SPEC-SDD-0002 exclusively owns it; readiness population is not established by the canonical audit.                                                                                                                                                                                                                                                                         |

No candidate appears in more than one disposition row. Every improvement is classified exactly once.

### Workflow Guard recurrence traceability

| Observed issue                                                                | Source evidence                                                                           | Rule change                                                                                           | Expected prevention                                                                   |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Architecture Review terminology and transition authority were not centralized | Commit `40d1d7354def85e52a94ec8a1186a22e4cb41eaf`; canonical `docs/sdd-workflow-guard.md` | Establish Workflow Guard as single transition authority and forbid duplicated rules                   | Requested phases are checked against the transition table; invalid skips are blocked. |
| Workload analysis could run before required Tasks Review                      | Commit `ab72fe647d46211f483f5f09eee934a075b12351`; canonical Guard Rules 5–6              | Require `Tasks -> Tasks Review -> Workload Guard -> Apply` and prohibit workload analysis after Tasks | Apply cannot launch before clean Tasks Review and user confirmation.                  |

These adopted improvements have exact commit evidence and a canonical rule path. Any candidate lacking an equivalent observed-issue/evidence/rule/prevention chain is **Defer**, never Adopt.

### Fixture schemas

The v2.1 source fixture is a JSON object with `schema_version: "2.1"`, `source_version: "v2.1"`, a countable `manifest`, and `records`. The manifest contains `record_count: 22` and the four category arrays named in Section 8; the sum of category counts MUST equal `record_count`, and every listed `spec_id` MUST occur once in `records`. Each source record has exactly: `spec_id` (string), `archive_path` (string), `source_commit` (40 lowercase hexadecimal characters), `archived_at` (ISO-8601 UTC string), `working_set_accuracy` (number or `"N/A"`), `prediction_accuracy` (number or `"N/A"`), and `design_confidence` (`"High" | "Medium" | "Low" | "N/A"`).

The v3.0 target fixture is a JSON object with `schema_version: "3.0"`, `source_version: "v3.0"`, and `records`. It contains one target record for each of the 22 source records. Every record has exactly the required fields in `DocumentRecord`; optional supersession fields are present explicitly as `null` when no link exists.

```ts
type ImprovementDisposition = 'Adopt' | 'Modify' | 'Document Only' | 'Defer' | 'Reject';
type ArchitectureVerdict = 'APPROVED' | 'APPROVED WITH CONDITIONS' | 'REJECTED';
type DocumentStatus = 'active' | 'superseded' | 'duplicate';

interface DocumentRecord {
  document_id: string;
  revision_id: string;
  canonical_path: string;
  source_commit: string;
  schema_version: '3.0';
  source_version: 'v3.0';
  status: DocumentStatus;
  audit: {
    archived_at: string;
    working_set_accuracy: number | 'N/A';
    prediction_accuracy: number | 'N/A';
    design_confidence: 'High' | 'Medium' | 'Low' | 'N/A';
  };
  supersedes_document_id?: string | null; // optional; default null
  supersedes_revision_id?: string | null; // optional; default null
}
```

Required fields are `document_id`, `revision_id`, `canonical_path`, `source_commit`, `schema_version`, `source_version`, `status`, and all four `audit.*` fields. The two `supersedes_*` fields are optional and default to `null`; fixtures still serialize both fields so omission and explicit null cannot diverge. `audit.*` is traceability metadata, not a v3 aggregate.

### v2.1-field-map.json schema and complete example

The field-map object has exactly `schema_version`, `source_version`, `target_schema_version`, and `mappings`. Each mapping has exactly `source_field`, `target_field`, `transform`, `required`, `absent_value`, and `value_type`. Every target path is resolved against `DocumentRecord`; source-only historical values therefore map into the explicit `audit` object and are never silently dropped.

```json
{
  "schema_version": "2.1-field-map",
  "source_version": "v2.1",
  "target_schema_version": "3.0",
  "mappings": [
    {
      "source_field": "spec_id",
      "target_field": "document_id",
      "transform": "logical_id(sdd-document-id/v1, spec_id, design)",
      "required": true,
      "absent_value": null,
      "value_type": "string"
    },
    {
      "source_field": "archive_path",
      "target_field": "canonical_path",
      "transform": "copy",
      "required": true,
      "absent_value": null,
      "value_type": "string"
    },
    {
      "source_field": "source_commit",
      "target_field": "source_commit",
      "transform": "copy",
      "required": true,
      "absent_value": null,
      "value_type": "40-lowercase-hex"
    },
    {
      "source_field": "archived_at",
      "target_field": "audit.archived_at",
      "transform": "copy",
      "required": true,
      "absent_value": null,
      "value_type": "ISO-8601-UTC"
    },
    {
      "source_field": "working_set_accuracy",
      "target_field": "audit.working_set_accuracy",
      "transform": "copy",
      "required": true,
      "absent_value": "N/A",
      "value_type": "number-or-N/A"
    },
    {
      "source_field": "prediction_accuracy",
      "target_field": "audit.prediction_accuracy",
      "transform": "copy",
      "required": true,
      "absent_value": "N/A",
      "value_type": "number-or-N/A"
    },
    {
      "source_field": "design_confidence",
      "target_field": "audit.design_confidence",
      "transform": "copy",
      "required": true,
      "absent_value": "N/A",
      "value_type": "High|Medium|Low|N/A"
    }
  ]
}
```

The mapping is one-to-one by source field. `revision_id` is computed only from canonical target content, never from a v2.1 metric; `schema_version`, `source_version`, and `status` use target constants; and optional supersession fields use the declared default `null`. The target paths are exactly `document_id`, `canonical_path`, `source_commit`, `audit.archived_at`, `audit.working_set_accuracy`, `audit.prediction_accuracy`, and `audit.design_confidence`.

| Source field | Target field | Required | Default | Valid example | Invalid example | Expected validation error |
| --- | --- | --- | --- | --- | --- | --- |
| `spec_id` | `document_id` | yes | none | `SPEC-0013` -> `spec-0013:design` | empty string | `source_field spec_id must produce non-empty document_id` |
| `archive_path` | `canonical_path` | yes | none | `openspec/changes/archive/.../archive-report.md` | `/tmp/report.md` | `canonical_path must resolve under openspec/changes/archive` |
| `source_commit` | `source_commit` | yes | none | `40d1...eaf` (40 lowercase hex) | `abc123` | `source_commit must be 40 lowercase hexadecimal characters` |
| `archived_at` | `audit.archived_at` | yes | none | `2026-07-20T00:00:00Z` | `20/07/2026` | `audit.archived_at must be ISO-8601 UTC` |
| `working_set_accuracy` | `audit.working_set_accuracy` | yes | `N/A` | `0.9` or `N/A` | `"unknown"` | `audit.working_set_accuracy must be number or N/A` |
| `prediction_accuracy` | `audit.prediction_accuracy` | yes | `N/A` | `0.95` or `N/A` | `-1` | `audit.prediction_accuracy must be number in [0,1] or N/A` |
| `design_confidence` | `audit.design_confidence` | yes | `N/A` | `Medium` | `Certain` | `audit.design_confidence must be High, Medium, Low, or N/A` |

### Complete fixture examples

`openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/fixtures/v2.1-manifest.json` is executable only when it contains the following manifest counts and all 22 source records listed in Section 8:

```json
{
  "schema_version": "2.1",
  "source_version": "v2.1",
  "manifest": {
    "record_count": 22,
    "categories": {
      "tenant": { "record_count": 4, "spec_ids": ["SPEC-0002", "SPEC-0005", "SPEC-0006", "SPEC-0008"] },
      "mission-control": { "record_count": 2, "spec_ids": ["SPEC-0003", "SPEC-0009"] },
      "platform": { "record_count": 14, "spec_ids": ["SPEC-0010", "SPEC-0011", "SPEC-0012", "SPEC-0013", "SPEC-0014", "SPEC-0015", "SPEC-0016", "SPEC-0017", "SPEC-0020", "SPEC-0021", "SPEC-0022", "SPEC-0023", "SPEC-0024", "SPEC-0028"] },
      "audit-analytics": { "record_count": 2, "spec_ids": ["SPEC-0018", "SPEC-0019"] }
    }
  },
  "records": [
    {"spec_id":"SPEC-0002","archive_path":"openspec/changes/archive/2026-07-04-SPEC-0002-multi-tenant-isolation-auth/archive-report.md","source_commit":"0000000000000000000000000000000000000000","archived_at":"2026-07-04T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},
    {"spec_id":"SPEC-0003","archive_path":"openspec/changes/archive/2026-07-19-SPEC-0003-dashboard-mission-control/archive-report.md","source_commit":"0000000000000000000000000000000000000000","archived_at":"2026-07-19T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},
    {"spec_id":"SPEC-0005","archive_path":"openspec/changes/archive/2026-07-19-SPEC-0005-tenant-auth/archive-report.md","source_commit":"0000000000000000000000000000000000000000","archived_at":"2026-07-19T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},
    {"spec_id":"SPEC-0006","archive_path":"openspec/changes/archive/2026-07-19-SPEC-0006-tenant-citas/archive-report.md","source_commit":"0000000000000000000000000000000000000000","archived_at":"2026-07-19T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},
    {"spec_id":"SPEC-0008","archive_path":"openspec/changes/archive/2026-07-18-SPEC-0008-tenant-dashboard/archive-report.md","source_commit":"0000000000000000000000000000000000000000","archived_at":"2026-07-18T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},
    {"spec_id":"SPEC-0009","archive_path":"openspec/changes/archive/2026-07-19-SPEC-0009-global-activity-feed/archive-report.md","source_commit":"0000000000000000000000000000000000000000","archived_at":"2026-07-19T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},
    {"spec_id":"SPEC-0010","archive_path":"openspec/changes/archive/2026-07-19-SPEC-0010-universal-search/archive-report.md","source_commit":"0000000000000000000000000000000000000000","archived_at":"2026-07-19T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},
    {"spec_id":"SPEC-0011","archive_path":"openspec/changes/archive/2026-07-20-SPEC-0011-ai-automation-hub/archive-report.md","source_commit":"0000000000000000000000000000000000000000","archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},
    {"spec_id":"SPEC-0012","archive_path":"openspec/changes/archive/2026-07-20-SPEC-0012-communication-platform/archive-report.md","source_commit":"0000000000000000000000000000000000000000","archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},
    {"spec_id":"SPEC-0013","archive_path":"openspec/changes/archive/2026-07-20-SPEC-0013-document-platform/archive-report.md","source_commit":"40d1d7354def85e52a94ec8a1186a22e4cb41eaf","archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},
    {"spec_id":"SPEC-0014","archive_path":"openspec/changes/archive/2026-07-20-SPEC-0014-integration-platform/archive-report.md","source_commit":"0000000000000000000000000000000000000000","archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},
    {"spec_id":"SPEC-0015","archive_path":"openspec/changes/archive/2026-07-20-SPEC-0015-workflow-engine/archive-report.md","source_commit":"0000000000000000000000000000000000000000","archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},
    {"spec_id":"SPEC-0016","archive_path":"openspec/changes/archive/2026-07-20-SPEC-0016-notification-center/archive-report.md","source_commit":"0000000000000000000000000000000000000000","archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},
    {"spec_id":"SPEC-0017","archive_path":"openspec/changes/archive/2026-07-20-SPEC-0017-activity-timeline/archive-report.md","source_commit":"0000000000000000000000000000000000000000","archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},
    {"spec_id":"SPEC-0018","archive_path":"openspec/changes/archive/2026-07-20-SPEC-0018-audit-platform/archive-report.md","source_commit":"0000000000000000000000000000000000000000","archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},
    {"spec_id":"SPEC-0019","archive_path":"openspec/changes/archive/2026-07-20-SPEC-0019-reporting-analytics/archive-report.md","source_commit":"0000000000000000000000000000000000000000","archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},
    {"spec_id":"SPEC-0020","archive_path":"openspec/changes/archive/2026-07-20-SPEC-0020-ai-knowledge-base/archive-report.md","source_commit":"0000000000000000000000000000000000000000","archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},
    {"spec_id":"SPEC-0021","archive_path":"openspec/changes/archive/2026-07-20-SPEC-0021-public-api/archive-report.md","source_commit":"0000000000000000000000000000000000000000","archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},
    {"spec_id":"SPEC-0022","archive_path":"openspec/changes/archive/2026-07-20-SPEC-0022-plugin-platform/archive-report.md","source_commit":"0000000000000000000000000000000000000000","archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},
    {"spec_id":"SPEC-0023","archive_path":"openspec/changes/archive/2026-07-20-SPEC-0023-billing-platform/archive-report.md","source_commit":"0000000000000000000000000000000000000000","archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},
    {"spec_id":"SPEC-0024","archive_path":"openspec/changes/archive/2026-07-20-SPEC-0024-monitoring/archive-report.md","source_commit":"0000000000000000000000000000000000000000","archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},
    {"spec_id":"SPEC-0028","archive_path":"openspec/changes/archive/2026-07-21-SPEC-0028-jobs-platform/archive-report.md","source_commit":"0000000000000000000000000000000000000000","archived_at":"2026-07-21T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"}
  ]
}
```

`openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/fixtures/v3.0-sample.json` contains 22 records, one per v2.1 record, with the mapped path, commit, timestamp, and audit values from each source record:

```json
{
  "schema_version": "3.0",
  "source_version": "v3.0",
  "records": [
    {
      "document_id": "spec-0002:design",
      "revision_id": "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      "canonical_path": "openspec/changes/archive/2026-07-04-SPEC-0002-multi-tenant-isolation-auth/archive-report.md",
      "source_commit": "0000000000000000000000000000000000000000",
      "schema_version": "3.0",
      "source_version": "v3.0",
      "status": "active",
      "audit": {
        "archived_at": "2026-07-04T00:00:00Z",
        "working_set_accuracy": "N/A",
        "prediction_accuracy": "N/A",
        "design_confidence": "N/A"
      },
      "supersedes_document_id": null,
      "supersedes_revision_id": null
    },
    {"document_id":"spec-0003:design","revision_id":"sha256:0000000000000000000000000000000000000000000000000000000000000000","canonical_path":"openspec/changes/archive/2026-07-19-SPEC-0003-dashboard-mission-control/archive-report.md","source_commit":"0000000000000000000000000000000000000000","schema_version":"3.0","source_version":"v3.0","status":"active","audit":{"archived_at":"2026-07-19T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},"supersedes_document_id":null,"supersedes_revision_id":null},
    {"document_id":"spec-0005:design","revision_id":"sha256:0000000000000000000000000000000000000000000000000000000000000000","canonical_path":"openspec/changes/archive/2026-07-19-SPEC-0005-tenant-auth/archive-report.md","source_commit":"0000000000000000000000000000000000000000","schema_version":"3.0","source_version":"v3.0","status":"active","audit":{"archived_at":"2026-07-19T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},"supersedes_document_id":null,"supersedes_revision_id":null},
    {"document_id":"spec-0006:design","revision_id":"sha256:0000000000000000000000000000000000000000000000000000000000000000","canonical_path":"openspec/changes/archive/2026-07-19-SPEC-0006-tenant-citas/archive-report.md","source_commit":"0000000000000000000000000000000000000000","schema_version":"3.0","source_version":"v3.0","status":"active","audit":{"archived_at":"2026-07-19T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},"supersedes_document_id":null,"supersedes_revision_id":null},
    {"document_id":"spec-0008:design","revision_id":"sha256:0000000000000000000000000000000000000000000000000000000000000000","canonical_path":"openspec/changes/archive/2026-07-18-SPEC-0008-tenant-dashboard/archive-report.md","source_commit":"0000000000000000000000000000000000000000","schema_version":"3.0","source_version":"v3.0","status":"active","audit":{"archived_at":"2026-07-18T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},"supersedes_document_id":null,"supersedes_revision_id":null},
    {"document_id":"spec-0009:design","revision_id":"sha256:0000000000000000000000000000000000000000000000000000000000000000","canonical_path":"openspec/changes/archive/2026-07-19-SPEC-0009-global-activity-feed/archive-report.md","source_commit":"0000000000000000000000000000000000000000","schema_version":"3.0","source_version":"v3.0","status":"active","audit":{"archived_at":"2026-07-19T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},"supersedes_document_id":null,"supersedes_revision_id":null},
    {"document_id":"spec-0010:design","revision_id":"sha256:0000000000000000000000000000000000000000000000000000000000000000","canonical_path":"openspec/changes/archive/2026-07-19-SPEC-0010-universal-search/archive-report.md","source_commit":"0000000000000000000000000000000000000000","schema_version":"3.0","source_version":"v3.0","status":"active","audit":{"archived_at":"2026-07-19T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},"supersedes_document_id":null,"supersedes_revision_id":null},
    {"document_id":"spec-0011:design","revision_id":"sha256:0000000000000000000000000000000000000000000000000000000000000000","canonical_path":"openspec/changes/archive/2026-07-20-SPEC-0011-ai-automation-hub/archive-report.md","source_commit":"0000000000000000000000000000000000000000","schema_version":"3.0","source_version":"v3.0","status":"active","audit":{"archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},"supersedes_document_id":null,"supersedes_revision_id":null},
    {"document_id":"spec-0012:design","revision_id":"sha256:0000000000000000000000000000000000000000000000000000000000000000","canonical_path":"openspec/changes/archive/2026-07-20-SPEC-0012-communication-platform/archive-report.md","source_commit":"0000000000000000000000000000000000000000","schema_version":"3.0","source_version":"v3.0","status":"active","audit":{"archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},"supersedes_document_id":null,"supersedes_revision_id":null},
    {"document_id":"spec-0013:design","revision_id":"sha256:0000000000000000000000000000000000000000000000000000000000000000","canonical_path":"openspec/changes/archive/2026-07-20-SPEC-0013-document-platform/archive-report.md","source_commit":"40d1d7354def85e52a94ec8a1186a22e4cb41eaf","schema_version":"3.0","source_version":"v3.0","status":"active","audit":{"archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},"supersedes_document_id":null,"supersedes_revision_id":null},
    {"document_id":"spec-0014:design","revision_id":"sha256:0000000000000000000000000000000000000000000000000000000000000000","canonical_path":"openspec/changes/archive/2026-07-20-SPEC-0014-integration-platform/archive-report.md","source_commit":"0000000000000000000000000000000000000000","schema_version":"3.0","source_version":"v3.0","status":"active","audit":{"archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},"supersedes_document_id":null,"supersedes_revision_id":null},
    {"document_id":"spec-0015:design","revision_id":"sha256:0000000000000000000000000000000000000000000000000000000000000000","canonical_path":"openspec/changes/archive/2026-07-20-SPEC-0015-workflow-engine/archive-report.md","source_commit":"0000000000000000000000000000000000000000","schema_version":"3.0","source_version":"v3.0","status":"active","audit":{"archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},"supersedes_document_id":null,"supersedes_revision_id":null},
    {"document_id":"spec-0016:design","revision_id":"sha256:0000000000000000000000000000000000000000000000000000000000000000","canonical_path":"openspec/changes/archive/2026-07-20-SPEC-0016-notification-center/archive-report.md","source_commit":"0000000000000000000000000000000000000000","schema_version":"3.0","source_version":"v3.0","status":"active","audit":{"archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},"supersedes_document_id":null,"supersedes_revision_id":null},
    {"document_id":"spec-0017:design","revision_id":"sha256:0000000000000000000000000000000000000000000000000000000000000000","canonical_path":"openspec/changes/archive/2026-07-20-SPEC-0017-activity-timeline/archive-report.md","source_commit":"0000000000000000000000000000000000000000","schema_version":"3.0","source_version":"v3.0","status":"active","audit":{"archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},"supersedes_document_id":null,"supersedes_revision_id":null},
    {"document_id":"spec-0018:design","revision_id":"sha256:0000000000000000000000000000000000000000000000000000000000000000","canonical_path":"openspec/changes/archive/2026-07-20-SPEC-0018-audit-platform/archive-report.md","source_commit":"0000000000000000000000000000000000000000","schema_version":"3.0","source_version":"v3.0","status":"active","audit":{"archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},"supersedes_document_id":null,"supersedes_revision_id":null},
    {"document_id":"spec-0019:design","revision_id":"sha256:0000000000000000000000000000000000000000000000000000000000000000","canonical_path":"openspec/changes/archive/2026-07-20-SPEC-0019-reporting-analytics/archive-report.md","source_commit":"0000000000000000000000000000000000000000","schema_version":"3.0","source_version":"v3.0","status":"active","audit":{"archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},"supersedes_document_id":null,"supersedes_revision_id":null},
    {"document_id":"spec-0020:design","revision_id":"sha256:0000000000000000000000000000000000000000000000000000000000000000","canonical_path":"openspec/changes/archive/2026-07-20-SPEC-0020-ai-knowledge-base/archive-report.md","source_commit":"0000000000000000000000000000000000000000","schema_version":"3.0","source_version":"v3.0","status":"active","audit":{"archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},"supersedes_document_id":null,"supersedes_revision_id":null},
    {"document_id":"spec-0021:design","revision_id":"sha256:0000000000000000000000000000000000000000000000000000000000000000","canonical_path":"openspec/changes/archive/2026-07-20-SPEC-0021-public-api/archive-report.md","source_commit":"0000000000000000000000000000000000000000","schema_version":"3.0","source_version":"v3.0","status":"active","audit":{"archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},"supersedes_document_id":null,"supersedes_revision_id":null},
    {"document_id":"spec-0022:design","revision_id":"sha256:0000000000000000000000000000000000000000000000000000000000000000","canonical_path":"openspec/changes/archive/2026-07-20-SPEC-0022-plugin-platform/archive-report.md","source_commit":"0000000000000000000000000000000000000000","schema_version":"3.0","source_version":"v3.0","status":"active","audit":{"archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},"supersedes_document_id":null,"supersedes_revision_id":null},
    {"document_id":"spec-0023:design","revision_id":"sha256:0000000000000000000000000000000000000000000000000000000000000000","canonical_path":"openspec/changes/archive/2026-07-20-SPEC-0023-billing-platform/archive-report.md","source_commit":"0000000000000000000000000000000000000000","schema_version":"3.0","source_version":"v3.0","status":"active","audit":{"archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},"supersedes_document_id":null,"supersedes_revision_id":null},
    {"document_id":"spec-0024:design","revision_id":"sha256:0000000000000000000000000000000000000000000000000000000000000000","canonical_path":"openspec/changes/archive/2026-07-20-SPEC-0024-monitoring/archive-report.md","source_commit":"0000000000000000000000000000000000000000","schema_version":"3.0","source_version":"v3.0","status":"active","audit":{"archived_at":"2026-07-20T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},"supersedes_document_id":null,"supersedes_revision_id":null},
    {"document_id":"spec-0028:design","revision_id":"sha256:0000000000000000000000000000000000000000000000000000000000000000","canonical_path":"openspec/changes/archive/2026-07-21-SPEC-0028-jobs-platform/archive-report.md","source_commit":"0000000000000000000000000000000000000000","schema_version":"3.0","source_version":"v3.0","status":"active","audit":{"archived_at":"2026-07-21T00:00:00Z","working_set_accuracy":"N/A","prediction_accuracy":"N/A","design_confidence":"N/A"},"supersedes_document_id":null,"supersedes_revision_id":null}
  ]
}
```

The zero hashes/commit in the target sample are schema-valid placeholders and must be replaced by Verify with the actual full commit and canonical-content hash; the sample field set must not change. A fixture with fewer than 22 target records is invalid, even if its individual records are valid.

### Expected output and formulas

For each source record, expected target output is one `DocumentRecord`: `document_id = logical_id("sdd-document-id/v1", spec_id, "design")`, `canonical_path = archive_path`, `source_commit = source_commit`, `audit` copied field-by-field, target constants as above, and null supersession fields. `revision_id = "sha256:" + lowercase hex SHA-256(canonical target content)` using `sdd-revision-c14n/v1`; transport metadata is excluded. Source-only metrics remain under `audit.*` and are not aggregated into v3 records.

The executable validator MUST emit the first applicable error and `FAIL` for: unknown field-map target path; missing required target field; uncovered declared source category or a manifest count mismatch; inconsistent source/target/default/type; invalid source examples; duplicate `spec_id`; unresolved archive path; invalid commit; or target count other than 22. It emits `PASS` for mutually consistent `DocumentRecord`, field map, and fixtures only after all records and categories validate. Readiness emits `PASS_WITH_LEGACY_BASELINE` for the qualifying pre-v3.0 population under the approved Legacy Baseline Exception; a pending or incomplete audit remains failing, and v3.0+ readiness requires explicit canonical source commits and `canonical-v3-aggregate/v1`, even if every fixture check passes.

| Self-check | Required contract | Field-map target paths | Fixture coverage | Expected readiness |
| --- | --- | --- | --- | --- |
| DocumentRecord required fields | 8 scalar/object requirements plus four required `audit.*` values; optional supersession links default `null` | All seven mapped paths exist; constants/defaults are explicit | 22/22 target records contain required fields or defaults | PASS_WITH_LEGACY_BASELINE for qualifying pre-v3.0 records; PASS for v3.0+ after canonical audit and review approval |
| `tenant` | Source records for SPEC-0002/0005/0006/0008 | Same | 4/4 | PASS fixture check |
| `mission-control` | Source records for SPEC-0003/0009 | Same | 2/2 | PASS fixture check |
| `platform` | Source records for SPEC-0010..0017, 0020..0024, 0028 | Same | 14/14 | PASS fixture check |
| `audit-analytics` | Source records for SPEC-0018/0019 | Same | 2/2 | PASS fixture check |
| Overall readiness | DocumentRecord + map + fixtures mutually consistent | No unknown paths; no missing required targets | 22 source + 22 target records | `PASS_WITH_LEGACY_BASELINE` for qualifying pre-v3.0 records; `PASS` for v3.0+ only after all gates pass |

## 17. Migration Strategy

| Step | Description                                                                    | Risk                | Rollback                                                                                                         |
| ---- | ------------------------------------------------------------------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1    | This refinement changes only the design artifact.                              | Low                 | Restore the prior design revision; no runtime rollback exists.                                                   |
| 2    | Later approved Apply creates versioned fixtures and documentation only.        | Medium              | Remove the unapproved documentation revision through the normal audited correction; never alter source archives. |
| 3    | Verify runs R-01 through R-07 and records observed values.                     | Medium              | Stop before Tasks on any failure; preserve evidence and report the failed check.                                 |
| 4    | SPEC-SDD-0002 separately restores freeze, declares Stable, releases, and tags. | High if scope leaks | SPEC-SDD-0001 must not perform or roll back those actions.                                                       |

No schema migration, feature flag, backward-compatibility layer, product deployment, release commit, or tag is part of this change.

Readiness requires all checks below; Stable declaration, freeze restoration, release communication, and tag creation remain exclusively in SPEC-SDD-0002.

| Check ID | Pass/fail check                     | Threshold / expected output                                                                                                                                 | Fixture or evidence path                   | Owner                 |
| -------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------- |
| R-01     | Canonical population audit          | `PASS_WITH_LEGACY_BASELINE` for qualifying pre-v3.0 artifacts under the approved exception; `PASS` for v3.0+ only after archived-SPEC membership, excluded rows, explicit source commits, and `canonical-v3-aggregate/v1` are published | Section 8 source list; canonical audit; governance resolution | Historical-data owner |
| R-02     | Candidate classification            | Every inventory row appears exactly once and uses an allowed enum                                                                                           | Section 16                                 | Design owner          |
| R-03     | A–G completeness                    | Each topic has decision, rationale, alternatives, future impact, and required fields                                                                        | Architecture Review block                  | Architecture reviewer |
| R-04     | Identity/reconciliation idempotency | Two identical runs yield same IDs, zero duplicate inserts, valid supersession links                                                                         | `fixtures/v3.0-sample.json`                | Reconciliation owner  |
| R-05     | v2.1 comparability                  | Only after R-01; all sources resolve, mappings are one-to-one, values unchanged, aggregates separate                                                        | Both v2.1 fixtures and Section 16          | Historical-data owner |
| R-06     | No runtime changes                  | Changed paths contain only this design and no product/runtime/release/tag/merge/push artifact                                                               | `git diff --name-only`; `git diff --check` | Apply/Verify owner    |
| R-07     | Architecture Review approval        | Only verdict `APPROVED` passes; conditional/rejected verdicts fail                                                                                          | Architecture Review report                 | Architecture reviewer |
| R-08     | Field-map target paths              | Every target path resolves in `DocumentRecord`; unknown path is `FAIL`                                                                                       | Section 16 field map and interface         | Reconciliation owner  |
| R-09     | Required/default/type consistency   | Missing required target, inconsistent default, or inconsistent type is `FAIL`; valid mapped values are `PASS`                                               | Field-map examples and validator           | Reconciliation owner  |
| R-10     | Declared category coverage          | Every Section 8 category has its declared records; uncovered category is `FAIL`                                                                             | v2.1 manifest `manifest.categories`       | Historical-data owner |
| R-11     | Fixture cardinality                 | Manifest is 22 source records and target is 22 records; count mismatch is `FAIL`                                                                           | Both fixture files                          | Reconciliation owner  |
| R-12     | Historical audit dependency         | `PASS_WITH_LEGACY_BASELINE` for qualifying pre-v3.0 artifacts under the approved exception; `PASS` for v3.0+ only with the approved `canonical-v3-aggregate/v1` definition and its reproducible formula | Canonical audit publication and governance resolution | Historical-data owner |

Readiness output must list R-01 through R-12 with `PASS`, `PASS_WITH_LEGACY_BASELINE`, or `FAIL`, observed value, and owner. Any failure stops the workflow before Tasks. SPEC-SDD-0001 may record readiness; it may not declare Stable. No Tasks are generated by this design.

## 18. Open Questions

| #   | Question                                                      | Status   | Resolution                                                                                                    |
| --- | ------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Which population is authoritative?                            | Resolved | Canonical archived SPEC artifacts are authoritative; the audit establishes 22 included records and 5 documented exclusions, while no pre-v3.0 aggregate is claimed. |
| 2   | Are candidate-specific measurements sufficient for promotion? | Resolved | No; candidates without repeated, denominator-backed evidence remain Defer or Document Only.                   |
| 3   | Who owns Stable and tag actions?                              | Resolved | SPEC-SDD-0002 exclusively.                                                                                    |
| 4   | Are runtime/product changes in scope?                         | Resolved | No. This design and later documentation Apply are the full scope.                                             |
| 5   | When are fixtures materialized?                               | Resolved | Only during later approved Apply; this refinement creates no fixture files.                                   |

> Stop after Design refinement. Do not proceed to proposal, spec, tasks, implementation, or release until R-01 through R-12 pass and Architecture Review approves this artifact.
