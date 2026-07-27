# Delta for feature-flags

## MODIFIED Requirements

### Requirement: FeatureKey Union Type

`FeatureKey` MUST be an exported string-literal union containing 18 feature strings.
(Previously: export omitted.)

#### Scenario: Catalog is assignable
- GIVEN the seed catalog contains 18 feature strings
- WHEN `FeatureKey` resolves from `@shared/billing`
- THEN every seed value MUST be assignable and not be an enum

#### Scenario: Unknown key is rejected
- GIVEN a function accepts `FeatureKey`
- WHEN an unlisted string is passed
- THEN TypeScript MUST reject it

### Requirement: FeatureFlagService Plan and Status Resolution

`FeatureFlagService` MUST expose `isEnabled`, `getAllEnabled`, and tenant-scoped invalidation. It MUST resolve `Subscription → Plan.features`; active, trialing, and `grace_period` grant listed features; other or missing subscriptions deny. The cache MUST default to 120 seconds and support `FEATURE_FLAG_CACHE_TTL`.
(Previously: API and TTL unspecified.)

#### Scenario: Listed feature is enabled
- GIVEN tenant A has an active subscription whose plan includes `advanced-analytics`
- WHEN `isEnabled(tenantA, 'advanced-analytics')` runs
- THEN it MUST return `true` and cache them

#### Scenario: Unknown runtime key is denied
- GIVEN a tenant has a plan
- WHEN an unknown value is evaluated
- THEN it MUST return `false`

#### Scenario: Invalid or missing subscription denies
- GIVEN tenant A has no subscription or invalid status
- WHEN either method is called
- THEN access MUST be denied or the array MUST be empty

#### Scenario: Grace period grants listed features
- GIVEN tenant A has `grace_period` with `workflows` in its plan
- WHEN `isEnabled(tenantA, 'workflows')` runs
- THEN it MUST return `true`

#### Scenario: Cache hit avoids re-query
- GIVEN a tenant has no valid cache entry
- WHEN it is called twice without invalidation
- THEN only the first call MUST query the DB

### Requirement: @PlanFeature Decorator and Guard

`@PlanFeature(featureKey?)` MUST register optional metadata. `PlanFeatureGuard` MUST read it, resolve the tenant from the request or user, pass without key or tenant, and return HTTP 403 with `{ error: 'feature_not_available', feature }` when denied.
(Previously: pass-through and denial were underspecified.)

#### Scenario: Unavailable or expired feature is blocked
- GIVEN a route requires `audit-logs` and its tenant lacks it or has invalid status
- WHEN an authenticated request arrives
- THEN it MUST return 403 and the handler MUST NOT execute

#### Scenario: Enabled feature is allowed
- GIVEN a route requires `audit-logs` and the plan includes it
- WHEN an authenticated request arrives
- THEN it MUST allow the handler

#### Scenario: No key passes through
- GIVEN a route has no feature key
- WHEN the guard evaluates it
- THEN it MUST return `true` without `isEnabled`

#### Scenario: No tenant passes through
- GIVEN a decorated request has no tenant identity
- WHEN the guard evaluates it
- THEN it MUST return `true` without `isEnabled`

### Requirement: Cache Invalidation on Plan Change

The affected tenant's cache MUST be invalidated on `plan.changed`. Successful create, plan change, pending-plan application, cancellation, reactivation, status, and Stripe-ID subscription mutations MUST emit that event.
(Previously: generic update only.)

#### Scenario: Mutation refreshes cached entitlement
- GIVEN tenant A has a cached enabled result
- WHEN a successful entitlement mutation emits `plan.changed` for A
- THEN the next evaluation MUST query the database

#### Scenario: Invalidation remains tenant-scoped
- GIVEN tenants A and B have cached results
- WHEN A emits `plan.changed`
- THEN only A's cache MUST be invalidated

### Requirement: Cross-Tenant Feature Isolation

Feature lookup and cache state MUST be scoped by `tenantId`; one tenant's subscription or plan features MUST NOT affect another.
(Previously: scoping was not explicit.)

#### Scenario: Tenant features do not leak
- GIVEN A's plan includes `workflows` and B's does not
- WHEN both tenants are evaluated
- THEN A MUST return `true`, B MUST return `false`, with independent cache state

## Deferred Verification Condition

`VER-C01`: `TenantModulesService` navigation migration remains deferred and non-blocking. No migration is claimed; it is not an Archive blocker.
