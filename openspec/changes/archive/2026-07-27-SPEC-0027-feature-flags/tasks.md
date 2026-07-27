# Tasks: SPEC-0027 - Feature Flags & Licensing Platform

## Task State

This is the current persisted task artifact for the final candidate evaluated by
`verify-report.md`. All implementation tasks below are complete and are checked
against the implementation and Verify evidence. This artifact does not claim
native review approval or Archive completion.

## Phase 1: Shared Contract

- [x] 1.1 Define the 18-member `FeatureKey` string-literal union in `packages/shared/src/billing/feature-flags.types.ts`.
- [x] 1.2 Re-export `FeatureKey` from `packages/shared/src/billing/index.ts`.
- [x] 1.3 Cover the shared FeatureKey catalog and contract with the passing shared billing type test.

## Phase 2: FeatureFlagService and Cache

- [x] 2.1 Implement tenant-scoped `isEnabled()`, `getAllEnabled()`, and `invalidateCache()` in `FeatureFlagService`.
- [x] 2.2 Implement the in-memory TTL cache with the 120-second default and `FEATURE_FLAG_CACHE_TTL` override.
- [x] 2.3 Enforce subscription status gating for active, trialing, and grace-period subscriptions.
- [x] 2.4 Resolve enabled features from the tenant subscription and associated plan.
- [x] 2.5 Invalidate the tenant cache when `plan.changed` is received.

## Phase 3: PlanFeature Decorator and Guard

- [x] 3.1 Implement `PlanFeature(featureKey?: FeatureKey)`, including the no-argument form.
- [x] 3.2 Implement `PlanFeatureGuard` with Reflector metadata lookup and FeatureFlagService evaluation.
- [x] 3.3 Preserve the no-decorator, missing-tenant, no-key, allow, and denied-feature paths; denied features return the required 403 contract.

## Phase 4: Billing Wiring and Subscription Events

- [x] 4.1 Implement `FeatureFlagModule` and export its service and guard dependencies.
- [x] 4.2 Import the feature flag module into `BillingModule` and register the guard through the existing global guard wiring.
- [x] 4.3 Emit `plan.changed` after each successful entitlement-changing subscription mutation path: create, change, apply-pending, cancel, reactivate, status, and Stripe-ID updates.
- [x] 4.4 Keep event invalidation and cache lookups tenant-scoped.

## Phase 5: Verification Coverage

- [x] 5.1 Cover service cache, subscription status, plan feature resolution, and invalidation behavior (`feature-flags.service.spec.ts`: 16 tests passed).
- [x] 5.2 Cover cross-tenant feature and cache isolation (`feature-flags.doorbell.spec.ts`: 2 tests passed).
- [x] 5.3 Cover decorator and guard behavior, including the no-argument decorator and 403 response (`plan-feature.guard.spec.ts`: 7 tests passed).
- [x] 5.4 Cover billing isolation and subscription event regressions (`billing-cross-tenant-isolation.spec.ts` and `subscription-engine.spec.ts`: 31 tests passed).
- [x] 5.5 Cover the shared billing contract (`billing.types.spec.ts`: 23 tests passed).
- [x] 5.6 Verify the API build and all focused commands recorded in `verify-report.md` (all exit codes 0).

## Verification Condition

`VER-C01` remains a documented, non-blocking condition: the approved Verify
scope defers migration of `TenantModulesService`. No migration is claimed here,
and no implementation task is marked complete on the basis of that deferred
work.
