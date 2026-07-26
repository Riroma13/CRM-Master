# SPEC-0027: Feature Flags & Licensing Platform

## Summary
Implement feature flag enforcement reading Plan.features with TTL cache.

## Changes
- `packages/shared/`: FeatureKey union type (18 documented keys)
- `apps/api/`: FeatureFlagService, @PlanFeature decorator + guard
- `apps/api/`: Cache invalidation on plan.changed event

## Breaking Changes
None — Phase 1 is schema-less and additive.

## Testing
- 26 new tests (service 18, guard 6, doorbell 2)
- 258 billing tests, all passing
- Cross-tenant isolation verified

## Notes
Phase 1 complete. Phase 2 (FeatureFlag model + overrides) deferred.
