# Tasks: SPEC-0009 — Global Activity Feed (ActivityTimeline)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 400–600 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation) → PR 2 (Core module) → PR 3 (Integration) → PR 4 (Doorbell) |
| Delivery strategy | single-pr (user) overridden by openspec config `force-chained` |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Schema + shared envelope + ADR-0005 | PR 1 (base main) | `pnpm --filter database prisma migrate dev` + `pnpm --filter @crm-master/shared build` | `docker compose up -d` (postgres) | Revert migration + envelope export; no domain code touched |
| 2 | ActivityTimeline module (service, controller, dto, event-types) | PR 2 (base PR 1) | `pnpm --filter api test -- activity-timeline` | `docker compose up -d` + jest | Revert module folder; CoreModule import only change |
| 3 | Wire publish() calls in 12+ domain services | PR 3 (base PR 2) | `pnpm --filter api test` | `docker compose up -d` + jest | Each domain service revertible independently; publish() is additive |
| 4 | Doorbell + registry regression | PR 4 (base PR 3) | `pnpm --filter api test:e2e -- timeline` | `docker compose up -d` + jest-e2e | Revert doorbell specs only; production code untouched |

## Phase 1: Foundation (PR 1)

- [x] 1.1 Write ADR-0005 — ActivityTimeline bounded context, append-only log, partitioning, event-type naming (`docs/architecture/adr/0005-activity-timeline.md`)
- [ ] 1.2 RED — `packages/shared/test/activity-timeline/event-envelope.spec.ts` rejects malformed envelopes (Zod)
- [x] 1.3 Create `packages/shared/src/activity-timeline/event-envelope.ts` — `EventEnvelope` Zod schema + `ActivityResult` type (GREEN)
- [x] 1.4 Export envelope from `packages/shared/src/index.ts`; `pnpm --filter @crm-master/shared build` passes
- [x] 1.5 Add `ActivityEvent` Prisma model to `packages/database/prisma/schema.prisma` (3 composite indexes per design)
- [ ] 1.6 Generate migration: `pnpm --filter database prisma migrate dev --name add_activity_events`
- [x] 1.7 Verify `pnpm --filter database prisma validate` + `pnpm turbo build --filter=@crm-master/shared`

## Phase 2: Core Module (PR 2) — TDD

- [x] 2.1 RED — `apps/api/src/modules/activity-timeline/activity-timeline.service.spec.ts` publish() inserts row with mapped snake_case columns
- [x] 2.2 RED — same spec: query() applies tenantId from Prisma extension scope, pagination default 50 max 100
- [x] 2.3 RED — same spec: publish() never throws (try/catch + warn log)
- [x] 2.4 Create `apps/api/src/modules/activity-timeline/dto.ts` — `PublishEventDto`, `TimelineQueryDto` (class-validator)
- [x] 2.5 Create `apps/api/src/modules/activity-timeline/event-types.ts` — Zod registry of known types (`cliente.creado`, … `usuario.registrado`)
- [ ] 2.6 RED — `event-types.spec.ts` validates each registered type with valid + rejects unknown eventType
- [x] 2.7 Create `activity-timeline.service.ts` — `publish()` + `query()` (GREEN for 2.1–2.3)
- [ ] 2.8 RED — `activity-timeline.controller.spec.ts` GET `/api/v1/timeline` returns 200 + applies each filter (supertest)
- [x] 2.9 Create `activity-timeline.controller.ts` — `GET /api/v1/timeline` with `@Query() TimelineQueryDto` (GREEN)
- [x] 2.10 Create `activity-timeline.module.ts` — providers + controller, exports `ActivityTimelineService`
- [x] 2.11 Import `ActivityTimelineModule` into `apps/api/src/modules/core/core.module.ts` (composition-only)
- [x] 2.12 `pnpm --filter api test -- activity-timeline` green; `pnpm --filter api lint` (pre-existing config issue, not related to this change)

## Phase 3: Integration — publish() in domain services (PR 3)

For each service: RED test asserts a row appears in `activity_events` after the operation; then add `publish()` call (GREEN). Group commits per module.

- [x] 3.1 `clients.service.ts` — publish `cliente.creado` + `cliente.actualizado` (RED then GREEN)
- [x] 3.2 `eventos.service.ts` — publish `evento.creado`
- [x] 3.3 `sistemas.service.ts` — publish `sistema.añadido` + `sistema.modificado`
- [x] 3.4 `documentos.service.ts` — publish `documento.generado` + `documento.firmado`
- [x] 3.5 `presupuestos.service.ts` — publish `presupuesto.enviado` + `presupuesto.aceptado`
- [x] 3.6 `incidencias.service.ts` — publish `incidencia.creada` + `incidencia.resuelta`
- [x] 3.7 `pagos.service.ts` — publish `pago.recibido`
- [x] 3.8 `automations.service.ts` — publish `automatizacion.ejecutada`
- [ ] 3.9 `email.service.ts` — publish `email.enviado` *(file does not exist; notifications.service.ts covers email sending instead)*
- [x] 3.10 `auth.service.ts` — publish `login.realizado` + `password.cambiado`
- [x] 3.11 `citas.service.ts` — publish `reserva.creada`
- [ ] 3.12 `encuestas.service.ts` — publish `encuesta.respondida` *(encuestas module does not exist in codebase)*
- [x] 3.13 `client-auth.service.ts` — publish `usuario.registrado`
- [x] 3.14 `pnpm --filter api test -- activity-timeline` green; `pnpm turbo build --filter=api` green

## Phase 4: Doorbell + Regression (PR 4)

- [ ] 4.1 RED — `apps/api/test/doorbell/timeline-cross-tenant-isolation.spec.ts` Tenant A cannot see Tenant B events
- [ ] 4.2 RED — `apps/api/test/doorbell/timeline-cross-client-isolation.spec.ts` Cliente A events invisible when filtering by Cliente B (same tenant)
- [ ] 4.3 Implement any missing scoping in `query()` to GREEN both doorbell specs
- [ ] 4.4 RED+GREEN — registry regression test: every entry in `event-types.ts` is exercised by ≥1 integration test (CI gate)
- [ ] 4.5 `pnpm --filter api test:e2e -- timeline` green; existing doorbell suite `pnpm --filter api test:e2e` still green
- [ ] 4.6 Update `.ai/context/SESSION.md` + `DECISIONS.md` with ADR-0005 reference and next step