# SPEC-0023 — Billing & Subscription

## Summary

Billing & Subscription Platform managing the complete commercial lifecycle:
plans, subscriptions (8-state machine), usage metering (hourly batch,
cumulative UPSERT), invoicing (local-first unpaid), Stripe payment gateway
(circuit breaker, fail-open), plan limit enforcement (hard/soft with
decorator), and trial-to-paid conversion (BullMQ saga with compensations).

**40+ source files | 256 tests (18 suites) | 36 tasks | 7 PRs stacked-to-main**

## Features

- **Plan Catalog**: CRUD for plans (Free, Basic, Pro, Enterprise) with limits,
  features, pricing model, trial days, active/inactive status
- **Subscription Engine**: 8-state machine (trialing → active → past_due →
  grace_period → suspended → cancelled) with upgrade/downgrade support
- **Metering Engine**: Hourly batch aggregation from AnalyticsDataset with
  cumulative UPSERT pattern — self-correcting, not delta-based
- **Invoice Engine**: Local-first invoice creation (unpaid before Stripe),
  4 pricing strategies (flat, flat+overage, per-unit, tiered)
- **Stripe Gateway**: Customer/subscription management, webhook signature
  verification with timestamp freshness (5 min), BullMQ idempotent processing
- **Circuit Breaker**: In-memory, 3 failures in 60s → fail open. Invoice
  created unpaid local-first, async push to Stripe
- **Plan Limit Enforcement**: `@PlanLimit()` decorator guard. Hard limits
  block (429), soft limits warn at 80%/90%/100% + charge overage
- **Trial Conversion Saga**: BullMQ 3-step saga (CreateCustomer →
  AttachPayment → CreateSubscription) with compensating actions
- **Lifecycle Service**: Grace period → freeze (30d) → archive (30d) →
  soft-delete (60d) post-cancellation lifecycle
- **Billing API**: `GET/POST` tenant endpoints + `GET/POST/PUT` admin
  endpoints with BillingGuard tenant isolation

## Architecture

- **5 new Prisma models**: Plan, Subscription, UsageMeter, Invoice,
  StripeWebhookEvent
- **Shared contracts**: Plan, Subscription, UsageMeter, Invoice,
  CheckLimitResult, StripeWebhookEvent, MeteringCollector, PricingStrategy
- **6 engine layers**: Plan Catalog, Subscription, Metering, Invoice, Payment,
  Limit Enforcement
- **3 BullMQ queues**: `billing:metering`, `billing:invoice`,
  `billing:stripe-webhooks`
- **Module**: BillingModule at `apps/api/src/modules/billing/`
- **Admin endpoints**: Plan CRUD, subscription override

### Implementation (7 stacked PRs)

- PR-1 — Schema migration + 5 Prisma models + shared types + seed
- PR-2 — PlanCatalog + SubscriptionEngine + StateMachine + PlanLimits
- PR-3 — MeteringEngine + collectors + cron
- PR-4 — InvoiceEngine + pricing strategies + cron
- PR-5 — StripeGateway + circuit breaker + webhook guard + processor
- PR-6 — ConvertTrial saga + LifecycleService + PlanLimitGuard + BillingModule
- PR-7 — BillingController + BillingGuard + wiring + doorbell tests + verify + archive

## Verification

| Metric | Value |
|--------|-------|
| Working Set Accuracy | ~96% |
| Architecture Review Conditions | All 5 satisfied |
| Verify Iterations | 1 (all 234 Jest tests passing on first run) |
| Critical Discoveries | 0 |
| Major Discoveries | 0 |
| Minor Discoveries | 1 (MeterRecord export) |
| Build | ✅ |
| Tests | 234/234 Jest (17 suites) + 22 vitest type tests |

## Documentation

- design.md
- tasks.md
- architecture-review.md
- verify-report.md
- archive-report.md
- pr-description.md

## Status

✅ Ready for merge — PR-7 (final)

---

## Related Artifacts

- [design.md](../../../../openspec/changes/SPEC-0023-billing-platform/design.md)
- [tasks.md](../../../../openspec/changes/SPEC-0023-billing-platform/tasks.md)
- [architecture-review.md](../../../../openspec/changes/SPEC-0023-billing-platform/architecture-review.md)
- [verify-report.md](../../../../openspec/changes/SPEC-0023-billing-platform/verify-report.md)
- [archive-report.md](archive-report.md)
- [pr-description.md](pr-description.md)

---

## Navigation

← [archive-report.md](archive-report.md)
