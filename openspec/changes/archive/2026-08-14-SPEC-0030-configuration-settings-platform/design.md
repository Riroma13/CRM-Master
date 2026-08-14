# Design: SPEC-0030 — Configuration & Settings Platform

> **Status:** Draft — maintainer-authorized bounded correction after Architecture Review BLOCKED.
> **Scope:** a typed, permissioned settings facade for the existing tenant identity profile. `Tenant.config.modules`, user preferences, password changes, and new persisted settings fields are excluded.
> **Decision boundary:** HUMAN / MAINTAINER authorized exactly one correction outside the exhausted automatic Design Refinement budget, limited to AR-007 and AR-008. It does not reopen AR-001–AR-006 or any other Design decision.

## 1. Executive Summary

This refinement narrows v1 to repository-proven tenant identity settings: the existing required `Tenant.name` and optional `Tenant.logo`. The platform adds a typed, permissioned `/api/v1/tenant/settings` facade and an admin page; it does not introduce another settings table or move arbitrary JSON. This makes the current profile contract reviewable without inventing regional, portal, or legal-data defaults that have no repository source.

## 2. Technical Approach

`Tenant` remains the sole durable owner. `TenantSettingsService` is an API-boundary adapter over the exported `TenantProfileService`; it maps `name` and `logo` unchanged, rejects `password` and `config`, and never accepts a tenant identifier. The minimal profile-boundary adjustment expands only `updateProfile` input to `logo?: string | null`; `logo: null` is persisted as `Tenant.logo = null`, while omitted `logo` remains unchanged. The Host-resolved `@TenantId()` selects the tenant and existing `configuracion` read/update permissions protect the new route.

The existing `/api/v1/tenant/profile` endpoint remains behaviorally unchanged for name, logo, config, and password. The new page uses the existing API client and feature-owned navigation. This is an explicit v1 foundation, not a generic key/value settings system.

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
|---|---|---|---|
| v1 catalog/defaults | identity + inferred new defaults; arbitrary config; existing identity only | `name: string` (existing required value), `logo: string \| null` (existing null) | Only these fields have durable schema and profile evidence; no product defaults are invented. |
| Durable owner | `TenantSettings` duplicate row; `Tenant.config`; `Tenant` | Existing `Tenant.name` / `Tenant.logo` | One authoritative value prevents precedence, backfill, and rollback ambiguity. |
| Compatibility | replace profile; profile delegates to settings; settings delegates to profile | New settings facade delegates to exported profile service | Preserves the deployed profile contract and gives settings one read/write path without a circular module dependency. |
| Contract boundary | shared package; local API DTO; arbitrary body | Local API DTO plus page-local response type | Neither consumer declares `@crm-master/shared`; v1 has one internal API consumer, so no package/lockfile churn is justified. |
| Maintainer correction boundary | remove nullable clear; bypass Profile; widen Profile input only | `logo?: string \| null` only at Profile input; preserve `configuracion` and global guards | AR-007 requires an executable clear through the sole owner; AR-008 requires the observed global-guard result. This exception changes no other decision. |

## 4. Data Flow

```text
Admin + Host -> TenantResolveMiddleware -> @TenantId()
Settings page -> GET/PATCH /tenant/settings -> TenantSettingsController
                                             -> TenantSettingsService
                                             -> TenantProfileService -> Tenant.name/logo
```

GET returns the current fields. PATCH validates a partial `{ name?, logo? }`, forwards only supplied fields to the profile service, and returns the resulting identity fields. Under the unchanged global guard chain, an anonymous request to either settings endpoint is denied 403; an authenticated caller lacking the exact `configuracion` read/update permission is also denied 403. Unknown keys, a forged `tenantId`, `config`, or `password` are 400. A repeated normalized PATCH has the same stored result; `logo: null` clears the value and unchanged values produce no settings audit event in v1.

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
|---:|---|---|---|
| 1 | `apps/api/src/modules/tenant-settings/tenant-settings.module.ts` | Create | Import `TenantProfileModule`; provide controller/service only. |
| 2 | `apps/api/src/modules/tenant-settings/tenant-settings.controller.ts` | Create | Host-scoped GET/PATCH with `configuracion` metadata. |
| 3 | `apps/api/src/modules/tenant-settings/tenant-settings.service.ts` | Create | Map the exact v1 contract through `TenantProfileService`. |
| 4 | `apps/api/src/modules/tenant-settings/tenant-settings.dto.ts` | Create | Whitelist and validate `name` and nullable `logo`. |
| 5 | `apps/api/src/modules/tenant/tenant.module.ts` | Modify | Add the feature module to the pure composition imports. |
| 6 | `apps/api/src/modules/tenant-profile/tenant-profile.module.ts` | Modify | Export `TenantProfileService` for the one-way settings dependency. |
| 7 | `apps/api/src/modules/tenant-profile/tenant-profile.service.ts` | Modify | Widen only `updateProfile` input to `logo?: string \| null`; persist supplied null and leave omitted logo unchanged. |
| 8 | `apps/tenant-web/src/app/(admin)/admin/settings/page.tsx` | Create | Edit only the two v1 identity fields through the new API. |
| 9 | `apps/tenant-web/src/config/navigation/admin.ts` | Modify | Add feature-owned Settings metadata; do not edit Sidebar. |

### 5.2 Secondary Files

| # | File | Action | Reason |
|---:|---|---|---|
| 1 | `apps/api/src/modules/tenant-settings/__tests__/tenant-settings.service.spec.ts` | Create | Mapping, partial update, null logo, repeat PATCH, and excluded-field tests. |
| 2 | `apps/api/src/modules/tenant-settings/__tests__/tenant-settings.controller.spec.ts` | Create | Exact `configuracion` read/update metadata, Host tenant, 400 contract, anonymous 403, and authenticated permission-denial 403 tests. |
| 3 | `apps/api/test/doorbell/tenant-settings-isolation.spec.ts` | Create | Real database proof that a Host-derived Tenant B request cannot read/update Tenant A. |
| 4 | `apps/tenant-web/src/app/(admin)/admin/settings/page.test.tsx` | Create | Load, save, validation, and failed-save behavior. |
| 5 | `apps/tenant-web/src/config/navigation/admin.test.ts` | Modify | Settings navigation is registered without Sidebar changes. |
| 6 | `apps/api/src/modules/tenant-profile/tenant-profile.service.spec.ts` | Create | Prove `updateProfile(tenantId, { logo: null })` calls the existing Tenant update with `logo: null`; omitted logo is not written. |

### 5.3 Expected NOT to Change

- `packages/database/prisma/schema.prisma`, `packages/database/prisma/migrations/**`, and `packages/database/prisma/generators/tenant-scope/generated/**` — v1 creates no model or `tenantId`; therefore no migration, backfill SQL, Prisma generation, or generated-scope artifact applies.
- `packages/shared/**`, `apps/api/package.json`, `apps/tenant-web/package.json`, and `pnpm-lock.yaml` — no new workspace dependency is introduced.
- `apps/api/src/modules/tenant-profile/tenant-profile.controller.ts` — existing profile endpoint behavior stays authoritative and unchanged.
- `apps/api/src/common/guards/better-auth.guard.ts`, `apps/api/src/common/guards/permissions.guard.ts`, and authentication semantics — anonymous settings requests retain the existing global-guard 403 behavior; no guard change is authorized.
- `apps/api/src/modules/tenant-modules/tenant-modules.service.ts`, `apps/api/src/modules/tenant-preferencias/tenant-preferencias.controller.ts`, `apps/tenant-web/src/components/layout/sidebar.tsx`, and `apps/tenant-web/src/config/navigation/registry.ts` — independent owners/presentation boundaries.
- `openspec/changes/SPEC-0028-jobs-background-processing-platform/**` and `openspec/changes/SPEC-0029-observability-platform/**` — excluded protected/parked changes.

**Reconciled Working Set count:** 10 creates, 5 modifies, 0 deletes (15 files); no migration, package, lockfile, or generated-file row is applicable. The two added bounded rows are the profile input/persistence adjustment and its direct regression test.

## 6. Read Order

1. `apps/api/src/modules/tenant-profile/tenant-profile.service.ts` — preserve authoritative name/logo ownership and implement only nullable-logo forwarding.
2. `apps/api/src/modules/tenant-profile/tenant-profile.module.ts` — apply the one-way export boundary.
3. `apps/api/src/common/decorators/tenant-id.decorator.ts` — retain Host-only tenant authority.
4. `apps/api/src/common/auth/permissions.ts` and `apps/api/src/common/decorators/permissions.decorator.ts` — retain and test `configuracion`, never `configuration`.
5. `apps/api/src/common/guards/better-auth.guard.ts` and `apps/api/src/common/guards/permissions.guard.ts` — retain the proven anonymous and permission-denial 403 path without changing guards.
6. `apps/api/src/modules/tenant/tenant.module.ts` — register through pure composition.
7. `apps/tenant-web/src/lib/api.ts` and `apps/tenant-web/src/config/navigation/admin.ts` — follow client and feature-navigation conventions.
8. `apps/api/test/doorbell/tenant-dashboard-isolation.spec.ts` — use the real-database isolation setup.

## 7. Expected Commands

```bash
pnpm --filter api test -- --runInBand tenant-settings
pnpm --filter api test -- --runInBand tenant-profile.service
pnpm --filter api test:e2e -- tenant-settings-isolation.spec.ts
pnpm --filter api build && pnpm --filter api lint
pnpm --filter tenant-web test -- settings
pnpm --filter tenant-web lint
pnpm sdd:validate
```

No migration, Prisma generation, package installation, or lockfile update is expected.

## 8. Design Confidence

**Confidence:** High

The catalog, source of truth, dependencies, and excluded schema/package paths are grounded in the existing Tenant/profile contract. The only post-review change is maintainer-authorized and bounded to an executable nullable-logo input/persistence path and the observed global-guard 403 result.

## 9. Exploration Budget

| Resource | Budget | Notes |
|---|---:|---|
| Repo searches | 2 | Only to locate the named profile test convention or a direct contradiction. |
| Files to read | 15 | Eight bounded Read Order entries plus affected files and tests. |
| Files to create | 10 | Five production/UI files and five test files. |
| Files to modify | 5 | Composition, profile export/input, navigation, and navigation test. |

## 10. Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| New route accidentally accepts profile-only fields | Med | High | Strict DTO whitelist and controller tests. |
| Cross-tenant update | Low | Critical | `@TenantId()` only; no body/query tenant ID; real doorbell test. |
| Permission vocabulary drift | Med | High | Test existing `configuracion`; do not add `configuration`. |
| Anonymous-status drift | Med | High | Endpoint integration tests assert global-guard 403 for anonymous GET and PATCH; do not change guards. |
| Nullable clear regresses | Low | High | Direct profile-service regression test asserts supplied null is written and omission is preserved. |
| Users expect broader settings | Med | Med | UI labels v1 identity scope; future fields require a new approved Design. |

## 11. Testing Strategy

| Layer | Focus | Approach |
|---|---|---|
| Unit | mapping, partial PATCH, null logo, idempotency | Jest settings-service tests plus profile-service regression: `{ logo: null }` writes `logo: null`; omitted logo is absent from Prisma update data. |
| Integration | endpoint DTO, exact permission metadata, and global status | Endpoint tests assert GET uses `configuracion:read`, PATCH uses `configuracion:update`, anonymous GET/PATCH are 403, and authenticated permission denial is 403. |
| Doorbell | Host A/B read and update isolation | Real database suite patterned after dashboard isolation. |
| Regression | legacy profile name/logo/config/password behavior | Existing profile path unchanged; settings tests prove excluded fields. |
| E2E | form load/save failure state | Vitest page test; Playwright is not added for this bounded facade. |

## 12. Doorbell Tests

| Test file | What it proves |
|---|---|
| `apps/api/test/doorbell/tenant-settings-isolation.spec.ts` | Tenant B cannot read or modify Tenant A through the settings route; a body `tenantId` is rejected. |

## 13. Required ADRs

| ADR | Reason | Status |
|---|---|---|
| None | No Prisma schema, data-retention policy, or new bounded-context persistence decision. | Not required |

## 14. Boundaries

| Boundary | Owner | Purpose |
|---|---|---|
| Durable identity values | `Tenant` / `TenantProfileService` | Sole storage and mutation owner for `name` and `logo`. |
| Settings facade | `TenantSettingsModule` | Typed permissioned API/UI adapter; imports profile, never reverse; uses exact `configuracion` permissions. |
| Tenant authority | middleware + `@TenantId()` | Host-derived context only. |
| Authentication/authorization | Existing global guards | Preserve anonymous and authenticated permission denials as 403; no guard or authentication change. |
| Entitlements/preferences | Existing modules | Remain outside v1. |

## 15. Extensibility

| Future feature | How it fits | Effort |
|---|---|---|
| Regional defaults | New approved Design selects fields/defaults and a persistence owner. | Days |
| Portal presentation | New approved Design defines owner, rollout, and retention. | Days |
| Shared API contract | Add `@crm-master/shared` dependencies and lockfile only when a second consumer is approved. | Days |

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor | 10× | 100× | Mitigation |
|---|---|---|---|
| Storage/query/write/memory | Existing Tenant point read | Existing Tenant point read | No new data or query class; measure before caching. |

**Decision:** Reuse the indexed Tenant primary-key read.
**Rationale:** v1 adds no persisted state.
**Alternative:** New settings row.
**Future impact:** A future row needs capacity evidence.

### B. Open/Closed Principle (OCP)

**Point of extension:** a future approved settings contract/module.
**What must change to add one more:** its approved owner, DTO, storage decision, and UI section.
**Decision:** Do not make v1 arbitrary.
**Rationale:** Explicit future contracts avoid implicit ownership.
**Alternative:** Generic JSON endpoint.
**Future impact:** Existing facade remains stable.

### C. Ownership

| Data / Capability | Owner | Consumers |
|---|---|---|
| `Tenant.name`, `Tenant.logo` | Tenant/Profile | settings facade, tenant-web; `logo: null` clears only the existing optional value |
| `Tenant.config.modules` | TenantModules | navigation/enforcement |
| Preferences | TenantPreferencias/LegacyUser | notifications |

**Decision:** Profile fields stay on Tenant; the Profile mutation boundary accepts nullable logo only.
**Rationale:** This preserves one durable source and makes the approved optional-logo clear executable without a settings bypass.
**Alternative:** Duplicate `TenantSettings`.
**Future impact:** New data must name an owner first.

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
|---|---|---|---|
| Existing Tenant identity | Tenant lifetime | Existing policy | Existing tenant cleanup |

**Decision:** No new retained data.
**Rationale:** The facade stores nothing.
**Alternative:** Settings history.
**Future impact:** History requires an ADR.

### E. Idempotency

| Operation | Duplicate risk | Protection | Fallback |
|---|---|---|---|
| Equivalent PATCH, including `logo: null` | Retry | Same partial update/result | Return current identity fields |

**Decision:** Equivalent PATCH is state-idempotent, including a logo clear.
**Rationale:** `logo !== undefined` writes supplied null and browser retries are normal.
**Alternative:** Command POST.
**Future impact:** Audited writes need explicit event policy.

### F. Shared Contracts

| Contract | Location | Consumers | Producers |
|---|---|---|---|
| Settings DTO/response and nullable Profile input | tenant-settings API/profile/page | API, Profile, page | API/Profile |

**Decision:** Do not add shared-package dependency in v1; Profile alone widens its local logo input.
**Rationale:** One internal consumer and absent current dependencies; the bounded input keeps the facade's declared null contract executable.
**Alternative:** Add workspace dependencies/lockfile.
**Future impact:** Promote when a second consumer is approved.

### G. Partitioning Strategy

| Dimension | Risk | Strategy |
|---|---|---|
| Tenant/time/volume | Low | Existing Tenant primary-key lookup; no new table. |

**Decision:** No partitioning.
**Rationale:** No new persisted dataset.
**Alternative:** Per-tenant settings storage.
**Future impact:** Reassess with a future persistence Design.

## 16. Interfaces / Contracts

```typescript
export interface TenantIdentitySettings {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  isActive: boolean;
}

export interface UpdateTenantIdentitySettings {
  name?: string; // non-empty after trimming
  logo?: string | null; // null clears the existing optional value
}

// Existing owner boundary: the only approved profile change.
type UpdateTenantProfileInput = {
  name?: string;
  logo?: string | null;
  config?: any;
};
// `logo !== undefined` writes `null` to Tenant.logo; omitted logo is unchanged.
```

```text
GET   /api/v1/tenant/settings  -> 200 TenantIdentitySettings
PATCH /api/v1/tenant/settings  -> 200 TenantIdentitySettings
400 unknown/invalid field; 403 anonymous request; 403 authenticated caller missing exact configuracion permission
```

`Tenant.name` and `Tenant.logo` are authoritative before, during, and after rollout. Backfill is explicitly a no-op: the facade reads those existing values. Read precedence is Tenant; writes transition directly to Tenant through `TenantProfileService`; rollback removes only the new route/page and leaves values untouched. `config` and `password` remain available only through their existing profile behavior.

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
|---:|---|---|---|
| 1 | Deploy the additive API facade, nullable Profile input, and module export; no schema or data migration. | Low | Remove settings route/module; the existing nullable Tenant.logo value remains authoritative. |
| 2 | Deploy page/navigation after API availability. | Low | Remove page/navigation; existing profile route remains. |

There is no placeholder migration path: no migration is required. No package, lockfile, Prisma-client, or tenant-scope generated output changes occur. The profile module exports its existing service; Settings imports Profile, and Profile never imports Settings.

## 18. Open Questions

| # | Question | Status | Resolution |
|---:|---|---|---|
| 1 | Is `configuracion` retained despite the English identity vocabulary? | Resolved | Yes; test exact GET `configuracion:read` and PATCH `configuracion:update`; do not add `configuration`. |
| 2 | Are regional, portal, legal, or generic config fields v1? | Resolved | No; they require their own approved Design with evidence-backed defaults and ownership. |
| 3 | What status applies without a session on settings endpoints? | Resolved | 403 for GET and PATCH under unchanged global guards; no authentication semantic change. |

---

> **Design handoff:** This maintainer-scoped AR-007/AR-008 correction is complete. A single fresh Architecture Review by `sdd-direct-architecture-review` is the only next action; do not create Tasks or run Apply.
