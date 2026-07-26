# Tasks: SPEC-0027 — Feature Flags & Licensing Platform

## Review Workload Forecast

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

| Field | Value |
|-------|-------|
| Estimated changed lines | ~400-550 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR (size-exception) |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

**Complexity Score: 2** — Shared contracts modified (+2). Single BC (BillingModule), no migration, no existing consumers, single SPEC. Score ≤ 3 → size-exception recommended. Config default `force-chained` conflicts — user must confirm size-exception.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | All 11 files: types, service, guard, module, wiring, tests | Single PR | `pnpm --filter api test -- --testPathPattern="feature-flags"` | N/A — schema-less, no runtime boundary to exercise without deployment | `git revert <commit>` — all files are new, no existing code broken |

## Phase 1: Shared Contracts

- [x] 1.1 Create `packages/shared/src/billing/feature-flags.types.ts` — `FeatureKey` union (18 documented keys)
- [x] 1.2 Export `FeatureKey` from `packages/shared/src/billing/index.ts`
- [x] 1.3 Build shared: `pnpm --filter shared lint` passed (shared package, no build script)

## Phase 2: FeatureFlagService + Cache

- [x] 2.1 Create `apps/api/src/modules/billing/feature-flags/feature-flags.service.ts` — `isEnabled()`, `getAllEnabled()`, `invalidateCache()`
- [x] 2.2 In-memory TTL cache (Map + expiresAt, 120s default, env `FEATURE_FLAG_CACHE_TTL`)
- [x] 2.3 Subscription status gating: active/trialing/grace_period → allow; expired/cancelled/past_due/suspended → deny
- [x] 2.4 Cache miss → query Subscription → Plan.features; cache hit → return cached
- [x] 2.5 Event listener: `plan.changed` → `invalidateCache(tenantId)`

## Phase 3: PlanFeature Decorator + Guard

- [x] 3.1 Create `apps/api/src/modules/billing/feature-flags/plan-feature.decorator.ts` — `@PlanFeature(key)` metadata
- [x] 3.2 Create `apps/api/src/modules/billing/feature-flags/plan-feature.guard.ts` — Reflector reads key, calls service, 403 on denied
- [x] 3.3 Guard skip paths: no decorator → true; no tenantId → true; feature missing → 403

## Phase 4: Module Wiring + SubscriptionEngine

- [x] 4.1 Create `apps/api/src/modules/billing/feature-flags/feature-flags.module.ts` — providers, exports
- [x] 4.2 Import `FeatureFlagModule` in `apps/api/src/modules/billing/billing.module.ts`
- [x] 4.3 Modify `apps/api/src/modules/billing/subscription/subscription-engine.ts` — emit `plan.changed` event in `changePlan()` and `applyPendingPlan()`
- [x] 4.4 Wire invalidation listener in `FeatureFlagService` for `plan.changed`

## Phase 5: Testing

- [x] 5.1 `feature-flags.service.spec.ts` — cache hit/miss, status gating, feature resolution, invalidation
- [x] 5.2 `plan-feature.guard.spec.ts` — 403, allow, skip decorator, skip missing tenantId
- [x] 5.3 `feature-flags.doorbell.spec.ts` — cross-tenant cache isolation (Tenant A vs Tenant B)
- [x] 5.4 Focused feature-flag suite: `pnpm --filter api test -- --testPathPattern="feature-flags"` — 26 tests pass; repository-wide suite retains documented pre-existing failures
