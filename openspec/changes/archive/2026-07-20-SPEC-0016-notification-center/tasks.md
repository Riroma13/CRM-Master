# Tasks: SPEC-0016 — Notification Center

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,300–1,500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation) → PR 2 (Engine) → PR 3 (Routing/Preferences) → PR 4 (Batching/Delivery) → PR 5 (Tests) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Schema + types + idempotencyKey cross-SPEC | PR 1 | `pnpm --filter database prisma migrate dev --name add_notification_tables` | `pnpm turbo build --filter=api` | schema.prisma + provider.interface.ts revert |
| 2 | Module + service + controller + DTOs | PR 2 | `pnpm --filter api test notification` | N/A — isolated module, no runtime boundary | `notification/` directory removal |
| 3 | RoutingEngine + PreferenceService + guards | PR 3 | `pnpm --filter api test notification` | N/A — engine logic is unit-testable only | `routing/`, `preferences/`, `guards/` dirs removal |
| 4 | BatchingEngine + DeliveryOrchestrator + core wire-up | PR 4 | `pnpm --filter api test notification` | BullMQ worker start | `batching/`, `delivery/` dirs + core.module.ts revert |
| 5 | Doorbell + integration tests | PR 5 | `pnpm test` | Full test suite | Tests only — no production code |

## Phase 1: Foundation (Schema + Types + Cross-SPEC)

- [x] 1.1 Add NotificationDefinition, NotificationInstance, NotificationPreference, NotificationBatch, NotificationDigest, NotificationReceipt, NotificationAudit to `schema.prisma` — all with `tenantId` + `@@index([tenantId])`
- [x] 1.2 Run migration: `pnpm --filter database prisma migrate dev --name add_notification_tables` (migration SQL generated at `prisma/migrations/20260720220000_add_notification_tables/`)
- [x] 1.3 Create `notification.types.ts` — NotificationStatus, ChannelType, Priority, Severity
- [x] 1.4 Create `definition.types.ts` — NotificationDefinition, RoutingRule, NotificationTemplate
- [x] 1.5 Create `preference.types.ts` — NotificationPreference, QuietHours, DigestFrequency
- [x] 1.6 Create `routing.types.ts` — RoutingResult, RoutingContext, RoutingStrategy, BatchPolicy, DeliveryRequest, DeliveryReceipt
- [x] 1.7 Create `index.ts` — re-export all notification types
- [x] 1.8 Add `idempotencyKey?: string` to `SendMessageInput` in `provider.interface.ts` (cross-SPEC)

## Phase 2: Core Engine (Module + Service + Controller)

- [x] 2.1 Create `notification.module.ts` — import PrismaService, register service + controller
- [x] 2.2 Create `notification.service.ts` — create, list, cancel, get notification + preference eval at creation
- [x] 2.3 Create `notification.controller.ts` — CRUD endpoints + preference PATCH + DTOs

## Phase 3: Routing + Preferences + Guards

- [x] 3.1 Create `routing-engine.ts` — preference eval, quiet hours, channel selection, throttling, fallback chain
- [x] 3.2 Create `preference.service.ts` — CRUD, upsert by (tenantId, userId, category)
- [x] 3.3 Create `notification.guard.ts` — tenant-scoped access to notification instances
- [x] 3.4 Create `preference.guard.ts` — preference isolation by tenant

## Phase 4: Batching + Delivery + Wire-up

- [x] 4.1 Create `batching-engine.ts` — group by category/entity, daily/weekly digest, configurable limit (100 default), window-based dedup
- [x] 4.2 Create `delivery-orchestrator.ts` — delegate to CommunicationProvider.send() with idempotencyKey, retry+backoff, receipt, audit
- [x] 4.3 Wire NotificationModule into `core.module.ts`

## Phase 5: Testing

- [x] 5.1 Unit: RoutingEngine — preferences, quiet hours, channel selection, critical bypass
- [x] 5.2 Unit: BatchingEngine — batching, digest window, sub-batch overflow at 100+ limit
- [x] 5.3 Unit: Deduplication — idempotencyKey unique constraint, state check on retry
- [x] 5.4 Integration: API CRUD (create/list/cancel notifications, preferences) via supertest
- [x] 5.5 Integration: Delivery — mock CommunicationProvider delegation
- [x] 5.6 Doorbell: `notification-cross-tenant-isolation.spec.ts`
- [x] 5.7 Doorbell: `notification-preference-isolation.spec.ts`

---

## Related Artifacts

- [design.md](design.md)
- [tasks.md](tasks.md)
- [verify-report.md](verify-report.md)
- [archive-report.md](archive-report.md)
- [architecture-decisions.md](architecture-decisions.md)
- [pr-description.md](pr-description.md)

---

## Navigation

← [design.md](design.md) | [verify-report.md](verify-report.md) →
