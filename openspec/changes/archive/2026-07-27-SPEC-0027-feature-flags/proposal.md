# Proposal: SPEC-0027 — Feature Flags & Licensing Platform

## Intent

Make existing `Plan.features` entitlement data enforceable at runtime through a
typed, tenant-scoped evaluation path and controller guard. This closes the
documented plan-enforcement gap without adding schema or persistent override
state.

## Scope

### In Scope

- Define and export the 18-member shared `FeatureKey` union.
- Implement `FeatureFlagService.isEnabled()`, `getAllEnabled()`, and cache
  invalidation over `Subscription → Plan.features`.
- Apply active, trialing, and grace-period subscription gating; cache results
  in memory with the 120-second default and `FEATURE_FLAG_CACHE_TTL` override.
- Add `@PlanFeature(featureKey?)` and `PlanFeatureGuard`, including the 403
  denied-feature contract and no-key/no-tenant pass-through behavior.
- Wire the feature-flags submodule into Billing and emit `plan.changed` after
  successful entitlement-changing subscription mutations.
- Preserve cross-tenant isolation through tenant-keyed lookups and cache state.

### Out of Scope

- Migrating `TenantModulesService` navigation callers; Verify records this as
  deferred condition `VER-C01` and no migration is claimed here.
- Prisma schema/migration changes, tenant overrides, management UI, frontend
  hooks, A/B testing, percentage rollouts, or feature metering.

## Capabilities

### New Capabilities

- None. The canonical `feature-flags` capability already exists.

### Modified Capabilities

- `feature-flags`: implement the existing plan-based evaluation, guard, cache
  invalidation, and cross-tenant isolation requirements.

## Approach

Use an in-memory TTL cache keyed by tenant, resolve `Subscription → Plan` via
Billing, and use a NestJS Reflector guard for opt-in enforcement. Mutation paths
emit `plan.changed`; the service invalidates only that tenant's cache.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/shared/src/billing/` | Modified | Typed feature-key contract and export. |
| `apps/api/src/modules/billing/feature-flags/` | New | Service, decorator, guard, module. |
| `apps/api/src/modules/billing/` | Modified | Billing wiring and subscription events. |
| `apps/api/src/modules/billing/__tests__/` | New/Modified | Service, guard, isolation, billing, and contract tests. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Stale entitlement cache | Low | `plan.changed` invalidation plus bounded TTL. |
| Cross-tenant leakage | Low | Tenant-scoped DB lookup/cache keys and doorbell tests. |
| Legacy navigation remains divergent | Confirmed | Preserve and document `VER-C01`; do not claim migration. |

## Rollback Plan

Revert the feature-flags module, shared type/export, Billing wiring, and
subscription event changes. No schema rollback is required; cache state is
volatile and disappears with the service restart.

## Dependencies

- Existing Billing `Subscription` and `Plan.features` data and event emitter.

## Success Criteria

- [ ] Focused feature-flag, guard, isolation, billing, and shared-contract tests pass.
- [ ] API build passes with tenant isolation preserved.
- [ ] All evidenced plan/status/cache/403 behaviors are represented by the canonical spec; `VER-C01` remains explicitly non-blocking and deferred.

## Evidence Basis

Reconstructed from the active tasks, Verify and Archive reports, canonical and
archived specs, implementation/tests, and recovery commits `48c6634`,
`5c9f886`, `75d475b`.
