# Tasks: SPEC-0017 — Activity Timeline Evolution

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

| Field | Value |
|-------|-------|
| Estimated changed lines | ~800–1000 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Schema migration + shared contracts + EventTypeRegistry | PR 1 | `pnpm --filter api test activity-timeline.service.spec` | `pnpm --filter database prisma migrate dev` + `pnpm turbo build --filter=api` | Revert Prisma migration + remove new shared files |
| 2 | BullMQ setup + publish() wrapper + async worker | PR 2 | `pnpm --filter api test activity-timeline` | Start API, call existing `POST /api/v1/timeline` via any consumer module | Revert publish() impl + remove BullMQ worker + BullMQ dependency |
| 3 | Enricher pipeline + 2 default enrichers | PR 3 | `pnpm --filter api test activity-timeline` | Trigger event creation, verify enrichedAt is set | Remove enricher files + unregister from module |
| 4 | Full-text search + GET /api/v1/timeline/search | PR 4 | `pnpm --filter api test activity-timeline` | `curl localhost:3000/api/v1/timeline/search?q=factura&tenantId=x` | Remove new controller endpoint + DTO schema |
| 5 | Doorbell tests + deprecation plan docs | PR 5 | `pnpm --filter api test:e2e` | Doorbell isolation gate spec | N/A — tests only + docs |

## Phase 1: Schema & Foundation

- [ ] 1.1 Add `bullmq` and `@nestjs/bull` deps to `apps/api/package.json` + `pnpm install`
- [ ] 1.2 Add new columns to `ActivityEvent` in `schema.prisma`: `eventId`, `correlationId`, `causationId`, `visibility`, `subjectName`, `actorName`, `searchVector` (tsvector), `enriched`, `enrichedAt`. Keep all existing columns intact.
- [ ] 1.3 Add unique index on `event_id`, GIN index on `search_vector`, composite index on `[tenantId, correlationId]`
- [ ] 1.4 Run migration: `pnpm --filter database prisma migrate dev --name add_activity_timeline_fields`
- [ ] 1.5 [RED] Test: existing publish() still works with old envelope shape and existing schema columns
- [ ] 1.6 Extend `ActivityEventRow` in `dto.ts` with new optional fields (backward-compat)

## Phase 2: Shared Contracts Evolution

- [ ] 2.1 Extend `ActivityEventEnvelopeSchema` in `event-envelope.ts`: add optional `eventId`, `correlationId`, `causationId`, `visibility`, `subjectName`, `actorName`, `occurredAt`. Keep all existing fields unchanged.
- [ ] 2.2 [RED] Test: old envelopes without new fields still pass validation
- [ ] 2.3 [RED] Test: new envelopes with all fields pass validation
- [ ] 2.4 [RED] Test: invalid new field types are rejected (e.g. non-UUID eventId)
- [ ] 2.5 Update `packages/shared/src/activity-timeline/index.ts` to export new contracts
- [ ] 2.6 Create `packages/shared/src/activity-timeline/event-type-registry.ts`: `EventTypeMetadata` interface + `EventTypeRegistry` class with `register()`, `get()`, `getAll()`, `getByModule()`, `isRegistered()`
- [ ] 2.7 [RED] Test EventTypeRegistry: registration + duplicate detection + getByModule filtering
- [ ] 2.8 Create `packages/shared/src/activity-timeline/event-enricher.ts`: `EventEnricher` interface + `EnricherRegistry` class
- [ ] 2.9 [RED] Test EnricherRegistry: register + get + getAll + ordering

## Phase 3: Async Ingestion via BullMQ

- [ ] 3.1 [RED] Test: publish() enqueues to BullMQ instead of writing directly (mock BullMQ queue)
- [ ] 3.2 Modify `publish()` in `activity-timeline.service.ts`: validate Zod → enqueue to BullMQ `activity-timeline:ingestion` → return void. Remove direct prisma.admin.activityEvent.create() call.
- [ ] 3.3 Create `activity-timeline.worker.ts`: BullMQ worker consuming `activity-timeline:ingestion` queue, re-validate, deduplicate via `ON CONFLICT (event_id) DO NOTHING`, persist via `forTenant()`
- [ ] 3.4 [RED] Test worker: valid event is persisted
- [ ] 3.5 [RED] Test worker: invalid event goes to DLQ
- [ ] 3.6 [RED] Test worker: duplicate eventId is silently acked (no-op)
- [ ] 3.7 [RED] Test worker: missing eventId still accepted (backward compat with existing events)
- [ ] 3.8 Register BullMQ queue + worker in `activity-timeline.module.ts`. Add BullModule registration.
- [ ] 3.9 Wire tenant scoping: worker uses `this.prisma.forTenant(parsed.tenantId).activityEvent.create()`

## Phase 4: Enricher Pipeline

- [ ] 4.1 [RED] Test: enricher pipeline runs after persist and sets enriched=true
- [ ] 4.2 [RED] Test: enricher failure does not block event persistence
- [ ] 4.3 [RED] Test: enrichment is idempotent (skip if enrichedAt already set)
- [ ] 4.4 Create `apps/api/src/modules/activity-timeline/enrichment/entity-name-enricher.ts`: resolves entity display name from entityType + entityId
- [ ] 4.5 Create `apps/api/src/modules/activity-timeline/enrichment/actor-name-enricher.ts`: resolves actor display name
- [ ] 4.6 Wire `EnricherRegistry` provider in module, register both enrichers
- [ ] 4.7 Integrate enrichment step in worker: post-persist, run pipeline, update `enriched` + `enrichedAt` + `subjectName` + `actorName`

## Phase 5: Search API

- [ ] 5.1 Add `SearchQuerySchema` + `CursorPaginatedResult<T>` to `dto.ts`
- [ ] 5.2 Add `getTimelineSearch()` to `activity-timeline.service.ts`: full-text query via raw `ts_query` on `searchVector`, cursor pagination by `[id, createdAt]`, filtered by `forTenant()`
- [ ] 5.3 Add DB trigger or app-level `searchVector` update: concatenate `eventType`, `actor`, `subjectName`, `actorName`, `payload` text fields into `searchVector` tsvector
- [ ] 5.4 [RED] Test: GET /timeline?page=1&limit=50 still returns correct page-based results (backward compat)
- [ ] 5.5 [RED] Test: GET /timeline/search?q=factura returns matching results
- [ ] 5.6 [RED] Test: GET /timeline/search respects cursor pagination
- [ ] 5.7 [RED] Test: GET /timeline/search applies forTenant() scoping
- [ ] 5.8 Add `GET /api/v1/timeline/search` endpoint to `activity-timeline.controller.ts`
- [ ] 5.9 Add Swagger decorators for new search endpoint

## Phase 6: Full-Text Search Infrastructure

- [ ] 6.1 Create raw SQL migration to add DB trigger: `tsvector_update_trigger` on `activity_events.search_vector` for `eventType`, `actor`, `subjectName`, `actorName`, and JSONB-to-text extraction from `payload`
- [ ] 6.2 Backfill `searchVector` for existing events (optional: run `UPDATE activity_events SET search_vector = to_tsvector('spanish', ...)`)
- [ ] 6.3 [RED] Test: full-text search finds events by keyword in payload
- [ ] 6.4 [RED] Test: full-text search with no results returns empty cursor

## Phase 7: Cross-Tenant & Doorbell Tests

- [ ] 7.1 Write `activity-timeline-cross-tenant-isolation.spec.ts`: Tenant A cannot see Tenant B events via `/timeline` or `/timeline/search`
- [ ] 7.2 Write `activity-timeline-visibility-scoping.spec.ts`: role-based filtering on `visibility` column
- [ ] 7.3 Write `activity-timeline-migration-backward-compat.spec.ts`: all 12+ consumer patterns still work with modified publish() + existing Zod schemas accept old envelopes
- [ ] 7.4 Run `pnpm test` — all existing tests pass, all new tests pass
- [ ] 7.5 Run `pnpm lint` — no errors

## Phase 8: Deprecation Plan (Docs + Prep)

- [ ] 8.1 Add `@deprecated` JSDoc to `publish()` method noting migration to async
- [ ] 8.2 Add `publishAsync()` to `ActivityTimelineService`: returns `Promise<{ eventId: string }>`, requires `eventId` in envelope
- [ ] 8.3 Document migration path in `docs/SPEC-0017-MIGRATION.md`: step-by-step for each consumer module
- [ ] 8.4 Register all 20 existing event types from `knownEventTypes` into `EventTypeRegistry` with module ownership metadata
