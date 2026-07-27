```yaml
schema: sdd-direct.verify-result/v1
status: VERIFIED
change: SPEC-0027-feature-flags
phase: Verify
skill_resolution: paths-injected
branch: merge/spec-0027-feature-flags
baseline: main@4c95d85
head: 75d475b plus uncommitted Direct Fix
acceptance_criteria: VERIFIED_WITH_CONDITION
requirements:
  pass: 5
  blocked: 0
  condition: 1
scenarios:
  pass: 14
  blocked: 0
  condition: 1
tests: PASS
test_command:
  - pnpm --filter api test -- src/modules/billing/__tests__/feature-flags.service.spec.ts
  - pnpm --filter api test -- src/modules/billing/__tests__/feature-flags.doorbell.spec.ts
  - pnpm --filter api test -- src/modules/billing/__tests__/plan-feature.guard.spec.ts
  - pnpm --filter api test -- src/modules/billing/__tests__/billing-cross-tenant-isolation.spec.ts src/modules/billing/__tests__/subscription-engine.spec.ts
  - pnpm --filter @crm-master/shared test -- src/billing/__tests__/billing.types.spec.ts
test_exit_code: [0, 0, 0, 0, 0]
test_output_hash:
  - sha256:1c687575501edcd2c2e215e22ef4bfebd142269dde97f96bc61933891c004001
  - sha256:14e58c99bb70237674ce93ae3ae0b0c029c8682f9c8f84dea158a48b172355af
  - sha256:2c4258c68cf1b990a04a5b6f9b53c26ae86ddf0cf87a30895e8cc414aaf7ea0b
  - sha256:bd05e9c45118386b59aec1b21d2995af1bdf2df6f9e85ca9b5e50aaef2ef80aa
  - sha256:6fb05e257f571d5b5ccce66919323b92c837f6c4714bea627606b2cf9f3e52d7
build: PASS
build_command: pnpm --filter api build
build_exit_code: 0
build_output_hash: sha256:cd85d8c8b7a56d2153d902c791e942b27c7fbca3353a36d1986ae2b6b7111d91
decision: VERIFIED
next: Archive
```

# Verify Report: SPEC-0027 — Feature Flags & Licensing Platform

**Date:** 2026-07-27  
**Scope:** `75d475b` plus the current uncommitted Direct Fix on
`merge/spec-0027-feature-flags`, evaluated against `main@4c95d85`.  
**Verdict:** **VERIFIED** — no blockers. One explicitly deferred migration
condition remains non-blocking.

## Acceptance-Criteria Evidence

The contract has **6 requirements** and **15 explicit scenarios**. Runtime
evidence passes for **5 requirements / 14 scenarios**; the remaining
TenantModulesService migration requirement is retained as a documented
**CONDITION**, per Verify scope.

| Requirement | Scenarios | Result | Evidence |
| --- | ---: | --- | --- |
| FeatureKey union type | 2/2 | PASS | `FeatureKey` is an 18-member string-literal union, re-exported from `@shared/billing`; shared type tests pass and the API build resolves the contract. |
| FeatureFlagService.isEnabled | 5/5 | PASS | Tenant-scoped subscription-to-plan lookup, valid-status gating, 120-second TTL cache, cache miss/hit, and invalidation are covered by 16 passing service tests. |
| `@PlanFeature` and `PlanFeatureGuard` | 4/4 | PASS | `PlanFeature(featureKey?: FeatureKey)` supports `@PlanFeature()`; guard skips entitlement evaluation with no key, allows enabled features, and returns 403 for denied/expired features. 7 guard tests pass. |
| Cache invalidation on subscription/plan change | 2/2 | PASS | `FeatureFlagService` listens to `plan.changed`; `SubscriptionEngine` emits after successful create, change, apply-pending, cancel, reactivate, status, and Stripe-ID mutation paths. 31 billing/subscription tests pass. |
| Cross-tenant feature isolation | 1/1 | PASS | Lookup and cache are keyed by tenant ID. The two doorbell tests prove separate plan resolution and cache state. |
| TenantModulesService migration | 0/1 | CONDITION | The service remains in the tenant-modules feature and no navigation caller was migrated. This is a maintainer-declared deferred condition and does not block Verify. |

## Required Integration Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Billing integration | PASS | `FeatureFlagModule` is imported by `BillingModule`; `PlanFeatureGuard` is registered with `APP_GUARD`. |
| `plan.changed` invalidation | PASS | Event listener invalidates only the payload tenant cache; all entitlement-changing subscription mutation paths emit the event after success. |
| Tenant isolation | PASS | `findUnique({ where: { tenantId }, include: { plan: true } })`, tenant-keyed cache, and passing doorbell/cross-tenant tests. |
| SPEC-0025 / SPEC-0028 dependency | PASS | No matching source reference, changed path, import, or package dependency was found in the Feature Flags implementation. |
| Schema/migration scope | PASS | No Prisma schema, migration, seed, lockfile, or package manifest changed. |

## Command Evidence

| Command | Exit | Result | Output hash |
| --- | ---: | --- | --- |
| `pnpm --filter api test -- src/modules/billing/__tests__/feature-flags.service.spec.ts` | 0 | 1 suite, 16 tests passed | `sha256:1c687575501edcd2c2e215e22ef4bfebd142269dde97f96bc61933891c004001` |
| `pnpm --filter api test -- src/modules/billing/__tests__/feature-flags.doorbell.spec.ts` | 0 | 1 suite, 2 tests passed | `sha256:14e58c99bb70237674ce93ae3ae0b0c029c8682f9c8f84dea158a48b172355af` |
| `pnpm --filter api test -- src/modules/billing/__tests__/plan-feature.guard.spec.ts` | 0 | 1 suite, 7 tests passed | `sha256:2c4258c68cf1b990a04a5b6f9b53c26ae86ddf0cf87a30895e8cc414aaf7ea0b` |
| `pnpm --filter api test -- src/modules/billing/__tests__/billing-cross-tenant-isolation.spec.ts src/modules/billing/__tests__/subscription-engine.spec.ts` | 0 | 2 suites, 31 tests passed | `sha256:bd05e9c45118386b59aec1b21d2995af1bdf2df6f9e85ca9b5e50aaef2ef80aa` |
| `pnpm --filter @crm-master/shared test -- src/billing/__tests__/billing.types.spec.ts` | 0 | 1 file, 23 tests passed | `sha256:6fb05e257f571d5b5ccce66919323b92c837f6c4714bea627606b2cf9f3e52d7` |
| `pnpm --filter api build` | 0 | Nest build passed | `sha256:cd85d8c8b7a56d2153d902c791e942b27c7fbca3353a36d1986ae2b6b7111d91` |

## Condition

**VER-C01 — TenantModulesService migration remains deferred.** The active
contract still contains the migration requirement and scenario, while the
approved Verify scope preserves it as a documented condition. It is not a
Verify blocker and no migration was performed.

## Next Phase

**Archive.** Do not modify product/runtime implementation during this phase.
