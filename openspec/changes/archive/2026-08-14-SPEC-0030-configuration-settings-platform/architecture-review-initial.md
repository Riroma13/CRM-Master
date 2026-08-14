# Architecture Review: SPEC-0030 — Configuration & Settings Platform

> **Normalized result:** BLOCKED
> **Executor:** HIGH / ARCHITECT — `sdd-direct-architecture-review`
> **Model binding:** `openai/gpt-5.6-terra` (`.opencode/sdd-model-map.json:8-12,29-32,51-55`)
> **Persistence:** hybrid; this file is the exact bounded review artifact.
> **Review sequence:** initial Architecture Review; Design Refinement budget remains available but is not consumed by this stop.

## Scope and evidence boundary

Reviewed `design.md` against `docs/SDD-WORKFLOW.md`, the Enterprise Design
template, and the declared Working Set / Read Order. The bounded evidence
included the current Tenant schema and generated scoping boundary, Host-derived
`TenantId`, existing permission map and guard, profile/modules/preferences
owners, tenant composition, AuditService, shared package exports, navigation
registry, and the named tenant isolation doorbell pattern. No Tasks, Apply,
implementation, SPEC-0028, SPEC-0029, or Git operation was performed.

## Gate verdict

**BLOCKED.** The Design is structurally valid, but it does not yet establish a
reviewable product contract or an executable exact Working Set. The canonical
next edge is **Design Refinement**. The single Design Refinement retry remains
available; a second blocked Architecture Review must stop and escalate under
`docs/SDD-WORKFLOW.md:129-143`.

## Findings

| ID | Normalized status | Finding | Evidence | Required action |
|---|---|---|---|---|
| AR-001 | BLOCKED | The initial settings field catalog is unresolved. `design.md` leaves business identity, regional defaults, portal presentation, `legalName`, and `portalWelcomeMessage` as blocking questions. The schema, API, UI, migration, tests, and workload cannot be reviewed as a stable contract without choosing the v1 fields and defaults. | `design.md:12-14,111-115,340-346`; user request supplies only the platform title. | Design Refinement must choose a bounded v1 field catalog from repository evidence or explicitly narrow the change. Do not advance to Tasks with unresolved contract-defining questions. |
| AR-002 | BLOCKED | Ownership is internally inconsistent for existing profile fields. The repository stores `Tenant.name` and `Tenant.logo`, while the proposed model introduces `businessName` and `logoUrl`; the profile facade is said to delegate but no authoritative mapping, read precedence, write transition, or rollback state is defined. | `packages/database/prisma/schema.prisma:12-23`; `apps/api/src/modules/tenant-profile/tenant-profile.service.ts:18-41`; `design.md:20-24,330-338`. | Define one source of truth and an explicit compatibility mapping/backfill for each existing field. Do not create duplicate durable values without precedence and rollback semantics. |
| AR-003 | BLOCKED | The declared Working Set is not executable as written. The migration path contains the placeholder `<timestamp>`, and the declared budget (`11` creates / `7` modifies) does not match the numbered tables (7 primary creates + 5 primary modifications + 5 secondary creates + 1 secondary modification = 12 creates / 6 modifications). | `design.md:44-71,117-124`. | Design Refinement must use concrete repository-relative paths and reconcile file counts with every Working Set row. |
| AR-004 | BLOCKED | The shared-contract decision omits package dependency and generated-output boundaries. Neither `apps/api/package.json` nor `apps/tenant-web/package.json` currently declares `@crm-master/shared`; adding a tenant-scoped Prisma model also changes generated tenant-scope artifacts, which are absent from the Working Set. | `apps/api/package.json:13-39`; `apps/tenant-web/package.json:14-29`; `packages/shared/package.json:1-19`; `packages/database/prisma/generators/tenant-scope/generated/tenant-models.ts`; `design.md:48-60,262-274`. | Add exact package/lockfile and generated-file consequences to the Design, or choose an existing import boundary that does not require them. Generated files must remain in scope if schema Apply is approved. |
| AR-005 | BLOCKED | The compatibility delegation is missing its module dependency boundary. `TenantProfileModule` currently provides only its controller, service, and PrismaService; delegating to `TenantSettingsService` requires an import/export or another explicitly approved composition path, but `tenant-profile.module.ts` is not in the Working Set. | `apps/api/src/modules/tenant-profile/tenant-profile.module.ts:1-10`; `apps/api/src/modules/tenant/tenant.module.ts:16-19`; `design.md:53-60,160-168`. | Add the module wiring and export contract to the Design, or remove the delegation claim and define a bounded alternative. |
| AR-006 | CONDITION | The route authorization resource `configuracion` exists for owner read/update, while other Identity routes use the English `configuration` resource. This is a repository inconsistency that must be tested for the selected tenant-settings controller but is not independently blocking if the existing tenant permission vocabulary is retained. | `apps/api/src/common/auth/permissions.ts:3-26`; `apps/api/src/modules/identity/identity.controller.ts:84-92`; `design.md:12,160-168`. | Preserve and test the existing `configuracion` tenant role contract; do not introduce a second resource name. |

## Architecture Review topics A–G

| Topic | Status | Review evidence |
|---|---|---|
| A. Scalability | CONDITION | The one-row-per-tenant shape is reasonable for bounded control-plane data, but the field payload and retention contract are not approved because AR-001/002 remain open. `design.md:182-197`. |
| B. Open/Closed Principle | BLOCKED | Explicit groups are preferable to arbitrary keys, but the extension point cannot be accepted until the v1 groups are selected. `design.md:199-213`. |
| C. Ownership | BLOCKED | Existing `Tenant.name/logo`, `Tenant.config`, `LegacyUser` preferences, and proposed `TenantSettings` boundaries are not mapped to a single authoritative source for profile fields. `design.md:215-230`; AR-002. |
| D. Data Retention | CONDITION | Current-row plus existing AuditService retention is plausible, but migration/rollback semantics for duplicate legacy values are unresolved. `design.md:232-245`. |
| E. Idempotency | CONDITION | Upsert and normalized PATCH are suitable candidates; exact fields and changed-value audit behavior still depend on AR-001/002. `design.md:247-260`. |
| F. Shared Contracts | BLOCKED | The contract shape is explicit, but package dependencies and generated/schema outputs are missing from the exact Working Set. `design.md:262-274`; AR-004. |
| G. Partitioning Strategy | CONDITION | No partitioning is justified for a single small current-state row, pending a stable field/retention contract. `design.md:276-290`. |

## Contracts, security, and tenant isolation

| Area | Status | Evidence |
|---|---|---|
| Host tenant authority | PASS | `TenantId` reads middleware-resolved request state, and the Design rejects body/query tenant authority. `apps/api/src/common/decorators/tenant-id.decorator.ts:11-21`; `design.md:28-40,320-328`. |
| Prisma tenant isolation | CONDITION | A new `tenantId` model would be covered by generated scoping after regeneration; generated outputs and a schema exact path are not currently in the Working Set. `packages/database/src/index.ts:15-31,48-110`; AR-004. |
| Authorization | CONDITION | Existing `configuracion` owner permissions can support the route, but controller metadata and role behavior are only planned, not yet reviewable as Tasks. `apps/api/src/common/auth/permissions.ts:11-26`; `design.md:12,132-134`. |
| Secrets | PASS | Design explicitly excludes provider secrets and `TenantSecret` remains integration-owned. `design.md:164-168,294-328`. |
| Audit | CONDITION | AuditService can receive redacted configuration events, but duplicate legacy/source-of-truth behavior must be resolved first. `apps/api/src/modules/audit/audit.service.ts:103-130`; AR-002. |
| Compatibility | BLOCKED | Profile endpoint and new settings row have no final precedence/backfill/rollback contract. `apps/api/src/modules/tenant-profile/tenant-profile.service.ts:18-41`; AR-002. |

## Working Set and validator evidence

| Check | Exact result | Classification |
|---|---|---|
| `pnpm sdd:validate` | `CRM-SDD governance validation: PASS` | PASS |
| `pnpm sdd:validate:design -- "openspec/changes/SPEC-0030-configuration-settings-platform/design.md"` | `Enterprise Design validation: PASS` — 18 numbered sections, A–G topics, decision/rationale separation, and Working Set numbering structure valid. | PASS — structural only; it does not judge product completeness. |
| `git diff --check -- "openspec/changes/SPEC-0030-configuration-settings-platform/design.md"` | PASS; no whitespace errors. | PASS |
| Working Set count reconciliation | Design declares 11 creates / 7 modifications; actual numbered rows are 12 creates / 6 modifications. | BLOCKED — AR-003 |

No build, lint, application test, migration, generation, e2e test, Tasks, or
Apply command was run. No implementation file was changed.

## Canonical next action

**Design Refinement only** — HIGH / ARCHITECT may consume the one permitted
refinement retry to close AR-001 through AR-005 with an exact field contract,
source-of-truth mapping, concrete Working Set, package/generated boundaries,
and module wiring. If the fresh Architecture Review remains BLOCKED, stop and
escalate to the HUMAN / MAINTAINER rather than attempting a second refinement.

```yaml
status: BLOCKED
change: SPEC-0030-configuration-settings-platform
phase: Architecture Review
executor: sdd-direct-architecture-review
role: HIGH
artifact: openspec/changes/SPEC-0030-configuration-settings-platform/architecture-review.md
findings:
  - AR-001: BLOCKED — v1 field catalog unresolved
  - AR-002: BLOCKED — existing profile ownership/source of truth unresolved
  - AR-003: BLOCKED — placeholder path and Working Set counts inconsistent
  - AR-004: BLOCKED — package dependencies/generated scope omitted
  - AR-005: BLOCKED — profile module dependency omitted
  - AR-006: CONDITION — retain configuracion permission vocabulary
evidence:
  - pnpm sdd:validate: PASS
  - pnpm sdd:validate:design: PASS
  - git diff --check: PASS
next: Design Refinement only; one retry available
blocked_by:
  - product field catalog and defaults
  - authoritative mapping for Tenant.name/logo and TenantSettings
  - exact Working Set and dependency/generated-file reconciliation
```
