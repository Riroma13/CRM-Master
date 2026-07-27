---
status: reconstructed
role: enterprise design standard (18 sections + 7 AR topics)
---
# Design: SPEC-0027 — Feature Flags & Licensing Platform

## 1. Executive Summary
Billing enforces existing `Subscription → Plan.features` through typed, tenant-scoped evaluation, TTL cache, and opt-in Nest guard. No schema, UI, overrides, metering, or rollouts. Verify passes 5 requirements / 14 scenarios; `VER-C01` is deferred/non-blocking.

## 2. Technical Approach
`FeatureFlagService` grants only `active`, `trialing`, and `grace_period` features. Its per-tenant cache defaults to 120 seconds (`FEATURE_FLAG_CACHE_TTL`). `PlanFeatureGuard` passes absent key/tenant or returns the specified 403. Subscription mutations emit tenant-specific `plan.changed`.

## 3. Architecture Decisions
| Decision | Options | Chosen | Rationale |
|---|---|---|---|
| Catalog | enum, strings, union | `FeatureKey` union | Typed; no runtime enum. |
| Cache | DB, Redis, local TTL | tenant `Map` | Bounded, schema-less state. |
| Enforcement | middleware, interceptor, guard | Reflector guard | Opt-in Nest metadata. |

## 4. Data Flow
```text
HTTP + @PlanFeature → Guard → Flags → tenant cache → Subscription → Plan.features
SubscriptionEngine ─plan.changed(tenantId)→ invalidate tenant cache
```
Disabled features throw `403 { error: 'feature_not_available', feature }`.

## 5. Working Set
### 5.1 Primary Files
Create `packages/shared/src/billing/feature-flags.types.ts` and `apps/api/src/modules/billing/feature-flags/{feature-flags.service,feature-flags.module,plan-feature.decorator,plan-feature.guard}.ts`; modify `packages/shared/src/billing/index.ts`, `apps/api/src/modules/billing/billing.module.ts`, and `apps/api/src/modules/billing/subscription/subscription-engine.ts` for contract, guard, wiring, and events.
### 5.2 Secondary Files
Create/modify `apps/api/src/modules/billing/__tests__/{feature-flags.service,feature-flags.doorbell,plan-feature.guard,billing-cross-tenant-isolation,subscription-engine}.spec.ts` and modify `packages/shared/src/billing/__tests__/billing.types.spec.ts` for evidence.
### 5.3 Expected NOT to Change
`packages/database/prisma/schema.prisma`, `apps/*-web/`, `apps/api/src/modules/tenant-modules/` — no schema/UI/`VER-C01` migration.

## 6. Read Order
1. `packages/shared/src/billing/feature-flags.types.ts` — catalog.
2. `apps/api/src/modules/billing/feature-flags/feature-flags.service.ts` — status/cache.
3. `apps/api/src/modules/billing/feature-flags/plan-feature.guard.ts` — 403/pass-through.
4. `apps/api/src/modules/billing/subscription/subscription-engine.ts` — event sources.
5. `apps/api/src/modules/billing/__tests__/feature-flags.doorbell.spec.ts` — isolation.

## 7. Expected Commands
```bash
pnpm --filter api test -- src/modules/billing/__tests__/feature-flags.service.spec.ts
pnpm --filter api test -- src/modules/billing/__tests__/feature-flags.doorbell.spec.ts
pnpm --filter api test -- src/modules/billing/__tests__/plan-feature.guard.spec.ts
pnpm --filter api test -- src/modules/billing/__tests__/billing-cross-tenant-isolation.spec.ts src/modules/billing/__tests__/subscription-engine.spec.ts
pnpm --filter @crm-master/shared test -- src/billing/__tests__/billing.types.spec.ts
pnpm --filter api build
# lint: N/A; migrate: N/A; generate: N/A
```

## 8. Design Confidence
**Confidence:** High — current diff, history, implementation, and Verify agree.

## 9. Exploration Budget
Derived from actual implementation evidence: **searches 3** (events, wiring, isolation); **reads 14** (shared types, service, decorator/guard, engine/module, 5 test files, verify-report, canonical spec, proposal, tasks); **creates 8** (feature-flags.types.ts, feature-flags.module.ts, feature-flags.service.ts, plan-feature.decorator.ts, plan-feature.guard.ts, feature-flags.service.spec.ts, feature-flags.doorbell.spec.ts, plan-feature.guard.spec.ts); **modifies 4** (plan-feature.guard.spec.ts, subscription-engine.spec.ts, plan-feature.decorator.ts, subscription-engine.ts).

## 10. Risks
Stale cache (low/high): TTL/event. Tenant leakage (low/critical): tenant key/query and doorbells.

## 11. Testing Strategy
Unit: status/cache/guard; integration: events/wiring via the combined Billing/engine command; doorbell: tenant specs; contract/build: shared test/API build.

## 12. Doorbell Tests
`feature-flags.doorbell.spec.ts` proves plan/cache separation; `billing-cross-tenant-isolation.spec.ts` proves scoped subscriptions.

## 13. Required ADRs
N/A — no schema or bounded-context change.

## 14. Boundaries
Shared Billing owns `FeatureKey`; Billing flags/guard evaluate/enforce; Billing engine mutates/emits.

## 15. Extensibility
Plan keys extend union/plan data; overrides, UI, and rollouts require a separate approved SPEC.

## Architecture Review Preparation (MANDATORY)
### A. Scalability
| Factor | 10× | 100× | Mitigation |
|---|---|---|---|
| Storage | none | none | no persistence |
| Query latency | more misses | more misses | TTL |
| Write throughput | more events | more events | `Map.delete` |
| Memory | more entries | more entries | expiry; assess shared cache with evidence |
**Decision:** local cache. **Rationale:** bounded state. **Alternative:** Redis. **Future impact:** cross-instance design required.

### B. Open/Closed Principle (OCP)
**Extension:** `FeatureKey`/plan data. **Decision:** membership evaluator. **Rationale:** no branches. **Alternative:** feature code. **Future impact:** contract test per key.

### C. Ownership
**Decision:** Billing owns subscription/plan; flags own cache; guard consumes it. **Rationale:** no duplicate state. **Alternative:** tenant modules. **Future impact:** `VER-C01` deferred.

### D. Data Retention
**Decision:** TTL cache; no archive; expiry/event deletion. **Rationale:** Billing authoritative. **Alternative:** overrides. **Future impact:** overrides need ADR/migration.

### E. Idempotency
**Decision:** `Map.delete` invalidation; TTL fallback. **Rationale:** replay cannot grant. **Alternative:** dedupe. **Future impact:** no persistence.

### F. Shared Contracts
**Decision:** one shared `FeatureKey` for API/tests. **Rationale:** type agreement. **Alternative:** copies. **Future impact:** shared import.

### G. Partitioning Strategy
**Decision:** tenant-keyed query/cache; time/volume use TTL/no table. **Rationale:** isolation evidence. **Alternative:** global cache. **Future impact:** retain doorbells.

## 16. Interfaces / Contracts
```ts
interface IFeatureFlagService {
  isEnabled(tenantId: string, featureKey: FeatureKey): Promise<boolean>;
  getAllEnabled(tenantId: string): Promise<FeatureKey[]>;
  invalidateCache(tenantId: string): void;
}
// @PlanFeature(featureKey?); denial: 403 { error: 'feature_not_available', feature }
```

## 17. Migration Strategy
Code-only deploy; cache rollback is revert/restart. No Prisma migration; `VER-C01` remains deferred/non-blocking.

## 18. Open Questions
`TenantModulesService` is resolved as deferred (`VER-C01`).
