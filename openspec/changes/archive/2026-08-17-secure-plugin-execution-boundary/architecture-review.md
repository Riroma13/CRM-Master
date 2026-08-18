# Architecture Review: secure-plugin-execution-boundary

> **Normalized result:** PASS
> **Action:** Architecture Review (fresh review after the single Design Refinement)
> **Role:** HIGH / ARCHITECT
> **Model binding:** `openai/gpt-5.6-terra` (`.opencode/sdd-model-map.json:8-12,29-32,51-55`)
> **Persistence:** hybrid; this is the exact repository artifact and Engram carries only its bounded status/evidence summary.

## Decision

The refined Design satisfies the bounded P0 containment contract. AR-01 is
closed: §5.2 now includes the existing focused registry test and explicitly
requires RED assertions that registration persists `status: 'inactive'` and
`enabled: false`. This is necessary to override the current schema defaults of
`status: "active"` and `enabled: true`. No material finding remains.

## Review History and Findings

| ID | Review | Classification | Finding | Resolution / evidence |
| --- | --- | --- | --- | --- |
| AR-01 | Initial Architecture Review | BLOCKED | The Working Set omitted `apps/api/src/modules/plugin/__tests__/plugin-registry.service.spec.ts`, even though its exact create-payload assertion had to change for inactive registration. | Preserved initial result. The sole Design Refinement added the existing test as §5.2 item 7 and named both required RED assertions (`design.md:59-70`). |
| AR-01 | Fresh Architecture Review | PASS | Closed. The refined Working Set contains the exact test and the inactive/enabled-false contract. | The current assertion omits both values (`plugin-registry.service.spec.ts:84-99`); the schema defaults are active/true (`schema.prisma:1641-1659`); the Design makes their explicit override mandatory (`design.md:69`). |

## Architecture Topic Verdicts

| Topic | Result | Evidence |
| --- | --- | --- |
| A. Scalability | PASS | Metadata-only admission, tenant-first reads, bounded archives, and no runtime pool are specified (`design.md:167-182`). |
| B. Open/Closed Principle | PASS | The manifest capability enum is the controlled extension point; runtime enablement requires a separate Design/ADR (`design.md:184-196`). |
| C. Ownership | PASS | Identity owns session/membership; PluginModule owns scoped metadata and disablement without duplicating identity authority (`design.md:198-212`; `identity-organization.guard.ts:48-86`). |
| D. Data Retention | PASS | New source is discarded, legacy bytes are never loaded, and metadata remains manageable (`design.md:214-228`). |
| E. Idempotency | PASS | Duplicate installation is tenant/name scoped; activate and dispatch deterministically fail without effects (`design.md:230-244`). |
| F. Shared Contracts | PASS | Shared manifest/capability and disabled-error contracts are separated from server-only trusted context (`design.md:246-260,278-313`). |
| G. Partitioning Strategy | PASS | Existing tenant-scoped models/indexes remain; no schema migration or quarantine table is introduced (`design.md:262-276`; `schema.prisma:1641-1702`). |

## Security and Contract Review

| Concern | Result | Evidence |
| --- | --- | --- |
| Host/session/membership tenant authority | PASS | Controllers must use only `request.pluginContext.tenantId`, ignoring caller tenant fields (`design.md:10-16,278-291`). Identity independently verifies session, Host tenant, membership, active organization, and role (`identity-organization.guard.ts:48-86`). |
| Global-first anonymous fail-closed semantics | PASS | Existing global guards precede route guards (`app.module.ts:31-46`); the identity guard returns `401 IDENTITY_SESSION_REQUIRED` when no session exists and `403` for missing Host/membership context (`identity-organization.guard.ts:56-73`). The Design preserves this sequence (`design.md:12,39`). |
| Tenant-scoped management and pre-effect denial | PASS | The Design requires trusted tenant predicates, foreign-ID `404`, and no mutation before denial (`design.md:39,309-312`). Registry reads/deletes currently demonstrate the scoped pattern to preserve (`plugin-registry.service.ts:39-89`). |
| Strict manifest/archive admission; no source persistence | PASS | Admission requires exactly one manifest, bounded safe archive structure, source/executable rejection, validation before effects, and metadata/hash only (`design.md:14,129-131,293-306`). The manager currently stores raw packages, making its listed removal an explicit bounded remediation (`plugin-manager.service.ts:37-57,209-217`). |
| Explicit capabilities | PASS | The Design mandates a strict manifest and explicit allow-list (`design.md:294-306`); the current shared enum is concrete (`plugin-manifest.schema.ts:4-20`). |
| Remove dynamic execution and source/Worker reachability | PASS | The Design deletes the worker and disables bridge/pool before any Worker, source, delivery, or logging effect (`design.md:14-16,131-133,309-313`). Current reachable `new Function`, Worker creation, and dispatch are all within the Working Set (`plugin.worker.ts:16-31`; `worker-pool.service.ts:63-130`; `event-bridge.service.ts:60-114`). |
| Truthful execution-disabled behavior | PASS | Activation returns `409 PLUGIN_EXECUTION_DISABLED`; direct execute and dispatch fail before effects; no sandbox claim is made (`design.md:16,156-162,287-313,319-323`). |
| Real HTTP Tenant A/B doorbell scope | PASS | The Working Set creates the assembled API/database doorbell; its contract covers anonymous fail-closed behavior, forged Tenant B input, pre-effect denials, same-tenant management, inactive installation, disabled activation, and no delivery (`design.md:69,135-140`). Its current absence is expected for a Create entry, not missing Design coverage. |
| Same-tenant safe metadata management | PASS | Authenticated same-tenant list/read/deactivate/uninstall are retained, while activation is disabled (`design.md:131-132,309-312`). |
| No schema/infrastructure/dependency/systemic-auth redesign | PASS | Schema, common guards/middleware, Core composition, infrastructure, and governance are excluded (`design.md:72-77`); migration forbids schema, flag, and source-reprocessing work (`design.md:315-323`). |

## Bounded Evidence and Validation

1. Consumed refined Design §5 Working Set and §6 Read Order before additional inspection (`design.md:41-87`).
2. Preserved the initial AR-01 BLOCKED evidence and reviewed only its refined P0 plugin-remediation Working Set. No Tasks, implementation, or Git lifecycle operation was created or performed.
3. The only bounded deviation was locating the Read-Order identity guard at `apps/api/src/modules/identity/identity-organization.guard.ts` rather than the stale `guards/` subpath. It directly supplied the required Host/session/membership authority fact; no scope expanded.
4. `pnpm sdd:validate:design -- openspec/changes/secure-plugin-execution-boundary/design.md` — PASS.
5. `pnpm sdd:validate` — PASS.

## Next Action

Under `docs/SDD-WORKFLOW.md:93-105,124-143`, the fresh Architecture Review
passes after the single permitted AR-01 refinement. The next legal action is
**Tasks** owned by MID / BUILDER. Apply and all Git lifecycle actions remain
illegal at this checkpoint.
