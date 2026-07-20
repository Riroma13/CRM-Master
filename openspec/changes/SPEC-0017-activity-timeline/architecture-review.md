# Architecture Review — SPEC-0017: Activity Timeline

**Verdict: REJECTED**

## Findings

| # | Severity | Topic | Finding | Effort | Recommendation |
|---|----------|-------|---------|--------|----------------|
| 1 | 🔴 Blocking | Existing module ignored | Existing `activity-timeline` module with Prisma model, service, controller, shared contracts, and 12+ consumers already exists. Design proposes greenfield replacement with different module name, schema, and zero migration strategy. | High | Rewrite as evolution of existing module. Include migration plan, backward compat, deprecation path. |
| 2 | 🟡 High | Breaking `@id` change | Existing model uses `Int @id @default(autoincrement())`. Design proposes `String @id` (UUID). Breaking schema change with no migration strategy. | High | Keep existing `id` as auto-increment, add `eventId` UUID column for dedup. |
| 3 | 🟡 High | Tenant scoping bypass risk | Design doesn't specify how `forTenant()` scoping wraps ActivityEvent queries. | Medium | Explicitly specify tenant scoping. Mark as `sdd-apply-pro`. |
| 4 | 🟡 High | Event type namespace collision | `eventType: string` is an open string with no registry. Existing code has strict Zod enum. | Medium | Adopt event type registry pattern with ownership. |
| 5 | 🟡 High | GIN index write amplification | 100M events/day × GIN index writes. Well-known bottleneck. | Medium | Benchmark GIN throughput or defer to Elasticsearch earlier. |
| 6 | 🟡 High | Sync → async migration for 12+ callers | All modules call `publish()` synchronously. No migration strategy for async transition. | High | Keep sync as BullMQ wrapper, migrate one module at a time. |

## Conditions for re-submission

1. Redesign as evolution of existing `activity-timeline` module (same name, same table, additive schema)
2. Concrete migration plan for 12+ existing consumers
3. Keep auto-increment `id` + add `eventId` UUID
4. Event type registry governance
5. GIN index strategy with deferred full-text alternative
6. Tenant scoping integration with Prisma Client Extension pattern
