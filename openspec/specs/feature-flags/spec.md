# feature-flags Specification

## Purpose

`Plan.features` is populated in seed data (Free→Basic→Pro→Enterprise) but never enforced at runtime. This capability introduces a feature flag evaluation service, a `@PlanFeature` route guard, and a cache layer so that plan assignment drives feature access. Tenants without a given feature in their plan get blocked at the controller boundary. This enables self-serve upgrades and eliminates manual `TenantModulesService` configuration.

## Requirements

### Requirement: FeatureKey Union Type

A `FeatureKey` union type MUST be defined in `packages/shared/src/billing/` covering all seed plan features plus documented future keys: `workflows`, `documents`, `api-access`, `basic-analytics`, `advanced-analytics`, `email-notifications`, `custom-branding`, `priority-support`, `audit-logs`, `automation-hub`, `plugins`, `billing`, `identity-sso`, `activity-timeline`, `dedicated-infrastructure`, `sla-guarantee`, `custom-integrations`, `onboarding-training`.

#### Scenario: All seed values have corresponding keys

- GIVEN the seed data lists 18 feature strings across 4 plans
- WHEN the `FeatureKey` type is resolved
- THEN every seed feature string MUST be assignable to the `FeatureKey` type
- AND the type MUST be a string literal union (not a runtime enum)

#### Scenario: Unknown feature key rejected at type level

- GIVEN a function accepts `FeatureKey`
- WHEN a string not in the union is passed
- THEN the TypeScript compiler MUST raise a type error

### Requirement: FeatureFlagService.isEnabled

The `FeatureFlagService` MUST expose `isEnabled(tenantId: string, featureKey: FeatureKey): Promise<boolean>`. It MUST read the tenant's active `Subscription`, resolve the associated `Plan.features` array, check subscription status (active/trialing/grace_period passes, expired/cancelled returns false), and return whether the feature is included. Results MUST be cached with TTL between 60 and 300 seconds.

#### Scenario: Active subscription with feature in plan returns true

- GIVEN tenant A has an active subscription to the Pro plan with `advanced-analytics` in `plan.features`
- WHEN `featureFlagService.isEnabled(tenantA.id, 'advanced-analytics')` is called
- THEN the method MUST return `true`
- AND the result MUST be cached

#### Scenario: Unknown feature key returns false

- GIVEN tenant A has any plan
- WHEN `featureFlagService.isEnabled(tenantA.id, 'unknown-feature')` is called
- THEN the method MUST return `false`

#### Scenario: Expired subscription returns false for all features

- GIVEN tenant A's subscription status is `expired`
- WHEN `featureFlagService.isEnabled(tenantA.id, 'workflows')` is called
- THEN the method MUST return `false` regardless of what `plan.features` contains

#### Scenario: No subscription returns false

- GIVEN tenant A has no `Subscription` record
- WHEN `featureFlagService.isEnabled(tenantA.id, 'documents')` is called
- THEN the method MUST return `false`

#### Scenario: Grace period treats features as enabled

- GIVEN tenant A's subscription status is `grace_period` and `workflows` is in `plan.features`
- WHEN `featureFlagService.isEnabled(tenantA.id, 'workflows')` is called
- THEN the method MUST return `true`

### Requirement: @PlanFeature Decorator and Guard

The `@PlanFeature(featureKey?: FeatureKey)` decorator MUST register the feature key via `Reflector`. The `PlanFeatureGuard` MUST extract the tenant from the request, call `FeatureFlagService.isEnabled`, and return HTTP 403 if the feature is not available. When no feature key is specified, the guard MUST skip the check.

#### Scenario: Guard blocks request when feature not in plan

- GIVEN a route decorated with `@PlanFeature('audit-logs')`
- AND the tenant's plan does not include 'audit-logs'
- WHEN an authenticated request arrives
- THEN the guard MUST return HTTP 403
- AND the handler MUST NOT execute

#### Scenario: Guard allows request when feature is in plan

- GIVEN a route decorated with `@PlanFeature('audit-logs')`
- AND the tenant's plan includes 'audit-logs'
- WHEN an authenticated request arrives
- THEN the guard MUST allow the request through
- AND the handler MUST execute normally

#### Scenario: Guard skips check when no feature key

- GIVEN a route decorated with `@PlanFeature()` (no argument)
- WHEN an authenticated request arrives
- THEN the guard MUST allow the request through without calling `isEnabled`
- AND the handler MUST execute normally

#### Scenario: Guard returns 403 for tenant with expired subscription

- GIVEN a route decorated with `@PlanFeature('documents')`
- AND the tenant's subscription is expired
- WHEN an authenticated request arrives
- THEN the guard MUST return HTTP 403

### Requirement: Cache Invalidation on Plan Change

The cache MUST be invalidated when a tenant's subscription or plan is updated. A dedicated event/hook on `Subscription.update` MUST clear the affected tenant's cache entries.

#### Scenario: Cache cleared after subscription change

- GIVEN tenant A's cache contains `isEnabled(tenantA.id, 'workflows') → true`
- WHEN tenant A's subscription changes to a plan without `workflows`
- THEN the next call to `isEnabled(tenantA.id, 'workflows')` MUST re-evaluate from the database
- AND the result MUST be `false`

#### Scenario: Cache miss re-evaluates from DB

- GIVEN no cache entry exists for tenant A and feature 'documents'
- WHEN `featureFlagService.isEnabled(tenantA.id, 'documents')` is called
- THEN the service MUST query the database
- AND cache the result

### Requirement: Cross-Tenant Feature Isolation

Feature evaluations for one tenant MUST NOT affect or leak to another tenant. Cache keys MUST be scoped by `tenantId + featureKey`.

#### Scenario: Tenant A features don't leak to tenant B

- GIVEN tenant A has `workflows` in plan and tenant B does not
- WHEN both tenants' features are evaluated concurrently
- THEN `isEnabled(tenantA.id, 'workflows')` MUST return `true`
- AND `isEnabled(tenantB.id, 'workflows')` MUST return `false`
- AND no cache state from tenant A influences tenant B's result

### Requirement: TenantModulesService Migration

The existing `TenantModulesService` MUST be deprecated. All navigation-gating callers MUST migrate to `FeatureFlagService.isEnabled()`. The old service SHALL remain functional until Phase 2 for rollback safety.

#### Scenario: Migrated navigation uses FeatureFlagService

- GIVEN a navigation item that was previously gated by `TenantModulesService.hasModule('workflows')`
- AFTER migration, when the navigation is rendered
- THEN the visibility check MUST call `featureFlagService.isEnabled(tenantId, 'workflows')`
- AND the old service MUST NOT be invoked for that item
