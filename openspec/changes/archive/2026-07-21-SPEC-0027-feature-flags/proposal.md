# Proposal: SPEC-0027 — Feature Flags & Licensing Platform

## Intent

`Plan.features` is populated in seed data (Free → Basic → Pro → Enterprise) but **never checked at runtime** — no guard, decorator, or service reads `plan.features` to gate functionality. Navigation gating uses a separate manual `TenantModulesService` (`tenant.config.modules`) instead of the plan definition. This means tenants on a Free plan can access Pro features. The gap creates revenue risk, manual overhead, and no self-serve upgrade path.

## Business Value

- Protect revenue by enforcing plan boundaries at runtime
- Eliminate manual module configuration — let plan assignment drive feature access
- Enable future commercial add-ons (features beyond the base plan)

## Scope

### Phase 1 — Plan-Features Enforcement (schema-less, immediate)
- `FeatureFlagService` — reads `Subscription → Plan → features: String[]`, checks subscription status (not expired/cancelled)
- `isEnabled(tenantId, featureKey): boolean` — TTL-cached (60–300s)
- `@PlanFeature('feature-key')` decorator + guard (analogous to existing `@PlanLimit()`)
- Define `FeatureKey` union type in `packages/shared` covering all seed values + future keys
- Replace `TenantModulesService` with `FeatureFlagService` for navigation gating

### Phase 2 — FeatureFlag Model (schema migration, management UI)
- New `FeatureFlag` model: id, key, name, description, defaultValue, category, type (boolean|percent)
- New `TenantFeatureOverride` model: tenantId, featureFlagId, value, enabled, expiresAt?
- Evaluation order: TenantFeatureOverride → Plan.features → defaultValue
- Admin UI in Mission Control for per-tenant overrides + audit trail

### Out of Scope
- A/B testing, experiments, user-targeted rollouts, percentage rollouts
- `useFeature(featureKey)` frontend hook (deferred to Phase 2+)
- Feature-level metering or usage tracking (that's the `PlanLimit` system's domain)

## Capabilities

### New Capabilities
- `feature-flags`: Feature flag evaluation and gating for plan-based feature access control. Covers `FeatureFlagService`, `@PlanFeature` guard, cache layer, and the FeatureKey type.

### Modified Capabilities
- None — this is a new capability. The existing `plan-limits` capability (SPEC-0023) is unchanged; feature flags are complementary (entitlement vs. usage).

## Approach

### Architecture
```
@PlanFeature('audit-logs')
  → PlanFeatureGuard
    → FeatureFlagService.isEnabled(tenantId, 'audit-logs')
      → Cache check (in-memory TTL)
        → Subscription → Plan → features[]
          → Cache set
```

### Key Decisions
- **FeatureKey as union type** (`'workflows' | 'documents' | ...`), not a runtime enum — tree-shakeable, serializable, no enum import overhead
- **Cache-first with TTL** following `token.service.ts`/`kpi-engine.ts` patterns; invalidate on subscription/plan update
- **Subscription-aware**: `status` must be active/trialing/grace_period; expired/cancelled → empty features
- **Decorator pattern mirrors** `@PlanLimit()` — same `Reflector` + guard infrastructure in `apps/api/src/modules/billing/guards/`

### FeatureKey Coverage
All existing seed values registered + future keys: `workflows`, `documents`, `api-access`, `basic-analytics`, `advanced-analytics`, `email-notifications`, `custom-branding`, `priority-support`, `audit-logs`, `automation-hub`, `plugins`, `billing`, `identity-sso`, `activity-timeline`, `dedicated-infrastructure`, `sla-guarantee`, `custom-integrations`, `onboarding-training`

### Migration
- `TenantModulesService` deprecated in Phase 1, removed in Phase 2
- Navigation items migrate from `tenant.config.modules` to `FeatureFlagService.isEnabled()`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/modules/billing/` | New | `FeatureFlagService`, `PlanFeatureGuard`, cache layer |
| `packages/shared/src/billing/` | Modified | Add `FeatureKey` type, add `features` to billing exports |
| `apps/api/src/modules/tenant-modules/` | Deprecated | Replace callers with `FeatureFlagService` |
| `packages/database/prisma/schema.prisma` | Modified | Add `FeatureFlag`, `TenantFeatureOverride` models (Phase 2) |
| `apps/admin-web/` | New | Override management UI (Phase 2) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Legacy `TenantModulesService` callers missed | Med | Migration checklist in tasks; keep both active until Phase 2 |
| Cache stale on plan change | Low | Hook into `Subscription.update` + `Plan.update` to invalidate keys |
| FeatureKey enum drift from seed | Low | Auto-generate type from seed file or add CI check |

## Rollback Plan

- Phase 1: Remove `@PlanFeature` decorators from routes, disable guard globally via config flag
- Phase 2: Drop `FeatureFlag`/`TenantFeatureOverride` tables, restore `TenantModulesService` as default
- Cache: Flush all entries on rollback; no persistent state change in Phase 1

## Dependencies

- `SPEC-0023` (Billing & Subscription) — Plan and Subscription models are consumed, not modified
- Prisma migration for Phase 2 models

## Success Criteria

- [ ] Every existing `Plan.features` value in seed data has a corresponding `FeatureKey` in shared types
- [ ] `FeatureFlagService.isEnabled()` returns correct results for all 4 seed plans (Free/Basic/Pro/Enterprise)
- [ ] `@PlanFeature('audit-logs')` guard blocks requests for tenants without that feature
- [ ] Subscription expiry or cancellation → all features return disabled
- [ ] Cache invalidates within TTL after plan change
- [ ] All existing `TenantModulesService` callers migrated to `FeatureFlagService` (Phase 1)
- [ ] Zero cross-tenant data leak in cache keys (scoped by `tenantId`)
