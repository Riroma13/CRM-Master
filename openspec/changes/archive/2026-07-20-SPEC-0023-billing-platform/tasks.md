# Tasks: SPEC-0023 — Billing & Subscription

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 2800-4000 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 → PR 6 → PR 7 |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Schema + types + seed | PR 1 | `pnpm --filter api test billing/types` | `pnpm --filter database prisma migrate dev` | Drop billing tables + revert types |
| 2 | Plan catalog + limits | PR 2 | `pnpm --filter api test billing/plan` | N/A — no runtime boundary yet | Revert plan-catalog + plan-limits |
| 3 | Subscription engine + SM | PR 3 | `pnpm --filter api test billing/subscription` | N/A — unit-testable state machine | Revert subscription-engine |
| 4 | Metering engine | PR 4 | `pnpm --filter api test billing/metering` | N/A — queries existing AnalyticsDataset | Revert metering-engine |
| 5 | Invoice + pricing | PR 5 | `pnpm --filter api test billing/invoice` | N/A — unit-testable calculation | Revert invoice-engine + pricing-strategy |
| 6 | Stripe + webhooks + saga [PRO] | PR 6 | `pnpm --filter api test billing/stripe` | N/A — mock Stripe in unit tests | Revert stripe-gateway + webhooks + saga |
| 7 | API + wiring + full tests | PR 7 | `pnpm --filter api test billing` | `pnpm turbo build --filter=api` | Revert controller + billing.module.ts |

## Phase 1: Schema + Shared Contracts

- [ ] 1.1 Add 5 Prisma models: Plan, Subscription, UsageMeter, Invoice, StripeWebhookEvent
- [ ] 1.2 Migration: `pnpm --filter database prisma migrate dev --name add_billing_tables`
- [ ] 1.3 Create `packages/shared/src/billing/billing.types.ts` + `index.ts`
- [ ] 1.4 Seed default plans (Free, Basic, Pro, Enterprise)

## Phase 2: Plan Catalog + PlanLimitsService

- [ ] 2.1 Create `plan-catalog.service.ts` — CRUD, listActive, findBySlug
- [ ] 2.2 Create `plan-limits.service.ts` — checkLimit() with hard/soft logic
- [ ] 2.3 RED: hard limit exceeded returns `{ allowed: false }` with 429
- [ ] 2.4 Tests: `plan-catalog.service.spec.ts`, `plan-limits.service.spec.ts`

## Phase 3: Subscription Engine + State Machine

- [ ] 3.1 Create `subscription-engine.ts` — create, cancel, upgrade, downgrade
- [ ] 3.2 Implement 9-state SM with 14 transitions
- [ ] 3.3 Upgrade: immediate proration (always_invoice); Downgrade: pendingPlanId at period end
- [ ] 3.4 RED: valid transitions succeed. RED: invalid transitions rejected
- [ ] 3.5 Tests: `subscription-engine.spec.ts`

## Phase 4: Metering Engine

- [ ] 4.1 Create `metering-engine.ts` — cumulative UPSERT by (tenantId, metric, periodStart)
- [ ] 4.2 collect(): query AnalyticsDataset, accumulate, UPSERT
- [ ] 4.3 finalizePeriod(): lock, sum, set isFinalized
- [ ] 4.4 7yr retention: partition usage_meters by year
- [ ] 4.5 RED: self-correction after lag. Tests: `metering-engine.spec.ts`

## Phase 5: Invoice Engine + PricingStrategy

- [ ] 5.1 Create `pricing-strategy.ts` — registry with flat/per-unit/tiered strategies
- [ ] 5.2 Create `invoice-engine.ts` — local-first unpaid, calculate base+overage
- [ ] 5.3 RED: correct overage calculation. RED: invoice persists before Stripe push
- [ ] 5.4 Tests: `invoice-engine.spec.ts`, `pricing-strategy.spec.ts`

## Phase 6: Stripe Gateway + Webhooks + Saga **[sdd-apply-pro]**

- [ ] 6.1 Create `stripe-circuit-breaker.ts` — 3 failures/60s → fail open
- [ ] 6.2 Create `stripe-gateway.ts` — createCustomer, createSubscription, pushInvoice
- [ ] 6.3 RED: CB opens after 3 failures. RED: local-first when Stripe down
- [ ] 6.4 Create `stripe-webhook.guard.ts` — constructEvent + timestamp <5min
- [ ] 6.5 Create `stripe-webhook.controller.ts` — enqueue to BullMQ `billing:stripe-webhooks`
- [ ] 6.6 BullMQ consumer: eventId PK idempotency, process invoice.paid/payment_failed
- [ ] 6.7 Create `convert-trial.saga.ts` — 4 steps + compensating txs
- [ ] 6.8 RED: saga compensates at each failure point. RED: duplicate webhook skipped
- [ ] 6.9 Tests: `stripe-gateway.spec.ts`, `stripe-webhook.spec.ts`, `convert-trial.saga.spec.ts`

## Phase 7: API + Module Wiring + Full Tests

- [ ] 7.1 Create `billing.controller.ts` — subscription CRUD, upgrade/downgrade, invoice list, usage
- [ ] 7.2 Create `billing.guard.ts` — tenant isolation scoping
- [ ] 7.3 Create `billing.module.ts` — wire all providers + controllers
- [ ] 7.4 Modify `core.module.ts` — import BillingModule
- [ ] 7.5 Integration tests: supertest for API + webhook endpoint
- [ ] 7.6 Doorbell: `billing-cross-tenant-isolation.spec.ts`
- [ ] 7.7 Doorbell: `billing-plan-limit-enforcement.spec.ts`
