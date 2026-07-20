# Archive Report: SPEC-0023 — Billing & Subscription

**Date:** 2026-07-20
**Mode:** openspec
**Status:** **ARCHIVED**

---

## Executive Summary

Billing & Subscription Platform manages the complete commercial lifecycle of
each tenant: plans, subscriptions, usage metering, invoicing, payment gateway
integration (Stripe), plan limit enforcement, and trial-to-paid conversion.
Six layers: Plan Catalog, Subscription Engine (state machine with 8 statuses),
Metering Engine (hourly batch aggregation with cumulative UPSERT), Invoice
Engine (local-first unpaid creation), Payment Gateway (Stripe with circuit
breaker), and plan limit enforcement (hard/soft limits with decorator-based
guards).

**5 new Prisma models | 40+ source files across shared contracts, 6 engine layers, guards, saga, circuit breaker, and wiring**
**234 Jest tests (17 suites) + 22 vitest type tests | 36 tasks completed across 7 stacked PRs**

---

## Specs Synced

No delta specs to sync. The change folder contained design.md, tasks.md,
architecture-review.md, and verify-report.md directly.

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Stripe for payment processing | Industry standard, mature webhooks, idempotent API, recurring billing support |
| In-house metering (usage_meters table) | Real-time queries, overage billing without Stripe dependency. Self-correcting via UPSERT. |
| Local-first invoice (unpaid before Stripe) | Stripe down doesn't block invoice generation. Retry via BullMQ queue. |
| In-house + Stripe subscription state | In-house DB is source of truth. Stripe webhooks update state. Periodic reconciliation. |
| In-house trial management | Avoid Stripe costs for free trials. Stripe only involved at conversion to paid. |
| BullMQ saga for trial conversion | 3-step saga with compensating actions. Tenant not left in limbo on partial failure. |
| Circuit breaker for Stripe | 3 failures in 60s → fail open. Invoice created unpaid local-first, async push to Stripe. |
| Batch hourly metering | Metrics aggregated hourly from AnalyticsDataset. Real-time queries on aggregated data. |
| Cumulative UPSERT metering | `SELECT SUM(value)` over writes. UPSERT replaces full value (no delta) for self-correction. |

---

## Key Metrics

| Metric | Value |
|--------|-------|
| Total source files | ~45 (shared types + module) |
| New Prisma models | 5 (Plan, Subscription, UsageMeter, Invoice, StripeWebhookEvent) |
| BullMQ queues | 3 (billing:metering, billing:invoice, billing:stripe-webhooks) |
| Subscription states | 8 (trialing, pending, active, past_due, grace_period, suspended, cancelled, expired) |
| Pricing strategies | 4 (flat, flat+overage, per-unit, tiered) |
| Metering collectors | 3 (workflows, documents, api_calls) |
| Test suites | 17 Jest + 1 vitest |
| Total tests | 256 (234 Jest + 22 vitest) |
| Stacked PRs | 7 |
| Total tasks | 36 |

---

## Learning Summary

### What worked well
- Cumulative UPSERT metering pattern — self-correcting, no delta tracking complexity
- State machine as pure functions (transferable, testable) separate from SubscriptionEngine
- Local-first invoice creation — decouples invoice generation from Stripe availability
- Circuit breaker with fail-open — prevents cascade failure when Stripe is down
- BullMQ saga with compensations — trial conversion atomicity without distributed transactions

### What could be improved
- Stripe webhook controller was implemented as separate guard + processor files rather than a single controller, but the architecture is equivalent
- MeterRecord interface originally not exported — minor TypeScript fix needed during build

### Edge cases handled
- Mid-period upgrade (immediate prorated) vs downgrade (next period)
- Trial expiration without payment method → expired term
- Grace period → suspended → cancelled lifecycle (30-day freeze, 30-day archive)
- Stripe payment failure with Smart Retries (3x) then 7-day grace period
- Circuit breaker transition: closed → open (3 failures/60s) → half-open (retry after cooldown)

---

## File Inventory

### Source files created

```
packages/
  shared/src/billing/
    billing.types.ts
    index.ts

apps/api/src/modules/billing/
  billing.module.ts
  billing.controller.ts
  plan/
    plan-catalog.service.ts
    plan-limits.service.ts
  subscription/
    subscription-engine.ts
    state-machine.ts
    convert-trial.saga.ts
    lifecycle.service.ts
  metering/
    metering-engine.ts
    metering-cron.service.ts
    metering-cron-registrar.ts
    collectors/
      index.ts
      workflow-collector.ts
      document-collector.ts
      api-collector.ts
  invoice/
    invoice-engine.ts
    pricing-strategy.factory.ts
    invoice-cron.service.ts
    strategies/
      index.ts
      flat.strategy.ts
      flat-with-overage.strategy.ts
      per-unit.strategy.ts
      tiered.strategy.ts
  payment/
    stripe-gateway.ts
    stripe-circuit-breaker.ts
    stripe-webhook.guard.ts
    stripe-webhook.processor.ts
  guards/
    billing.guard.ts
    plan-limit.guard.ts
```

### Files modified

```
packages/database/prisma/schema.prisma
apps/api/src/modules/core/core.module.ts
apps/api/src/modules/billing/billing.module.ts
apps/api/src/modules/billing/metering/metering-engine.ts  (MeterRecord export)
```

---

## Archive Contents

| File | Description |
|------|-------------|
| `design.md` | Technical design with architecture decisions, data flow, state machine, contracts |
| `tasks.md` | Task breakdown across 7 phases |
| `architecture-review.md` | Architecture review results |
| `verify-report.md` | Verification report with test results, tenant isolation proof |
| `archive-report.md` | This file |
| `pr-description.md` | PR description for the final PR |

---

## Future Considerations

- **Annual billing** — requires proration engine extension (deferred to v2)
- **Tax calculation** — Stripe Tax or TaxJar integration for VAT/GST/IVA (deferred)
- **Coupons/discounts** — Discount model and invoice line adjustments (deferred)
- **Multi-currency** — Currency field on Plan + Subscription (deferred)
- **Custom pricing per tenant** — Plan overrides via Json field (deferred)
- **New metering sources** — Implement MeteringCollector interface, register in MeteringEngine
- **Reconciliation** — Periodic job to compare in-house vs Stripe subscription state
