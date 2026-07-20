# SPEC-0016 — Notification Center

## Summary

Centraliza el ciclo de vida completo de las notificaciones en CRM-Master:
definiciones versionadas e inmutables, instancias con estado (pending →
queued → delivered → read), routing basado en preferencias de usuario y quiet
hours con doble checkpoint, batching y digest diario/semanal, y delivery
delegado a la Communication Platform (SPEC-0012). Elimina la dispersión actual
de lógica de notificaciones, otorga a los usuarios control unificado sobre sus
preferencias, y proporciona trazabilidad completa con receipts de entrega y
lectura.

**7 modelos Prisma | 7 suites de test | 35 tests | 25/25 tareas completadas**

## Features

- **Definition Management**: CRUD de tipos de notificación con schema
  versionado en JSON, canales configurables, routing rules y templates.
  Definiciones inmutables tras publicar con contentSnapshot en instancia.
- **Notification Engine**: Creación, listado y cancelación de instancias con
  estado completo. Routing basado en prioridad + preferencias de usuario.
- **Routing Engine**: Evaluación de preferencias en dos checkpoints (creación
  y delivery), quiet hours, throttling sliding window, bypass CRITICAL.
- **Batching & Digest**: Agrupación de notificaciones en batches y digests
  diario/semanal vía BullMQ repeatable jobs. Límite configurable con
  sub-batches.
- **Delivery Orchestration**: Delegación a SPEC-0012 Communication Platform
  con idempotencyKey, retry+backoff, receipts y audit trail.
- **Preference Management**: CRUD de preferencias por tenant/usuario/categoría
  con upsert, quiet hours, digest frequency, canales preferidos.
- **Multi-tenant Isolation**: Todos los modelos con tenantId +
  @@index([tenantId]). 2 guards API-level. 2 doorbell test suites.
- **Cross-SPEC Integration**: SPEC-0015 Workflow Engine → POST
  /api/v1/notifications via ServiceTaskGateway con correlationId.

## Architecture

- Definition → Instance → Routing → Delivery con delegación a SPEC-0012.
- Routing rule-based con RoutingStrategy interface (OCP).
- Batching con BullMQ repeatable + event window.
- Preferencias en tabla EAV con upsert por (tenantId, userId, category).
- Deduplicación con idempotencyKey + DB unique constraint.
- Receipts con webhook primario + polling fallback.
- Throttling sliding window con bypass CRITICAL.
- Content snapshot en instancia para inmutabilidad.
- Double-checkpoint preference evaluation (creación + delivery).
- 11 architecture decisions documentadas (AD-001 a AD-011).

### Implementation

- Phase 1 — Foundation: Schema (7 modelos Prisma), shared types,
  cross-SPEC idempotencyKey en provider.interface.ts, migration SQL.
- Phase 2 — Core Engine: Module, service, controller con CRUD + DTOs.
- Phase 3 — Routing: RoutingEngine, PreferenceService, tenant guards.
- Phase 4 — Batching & Delivery: BatchingEngine, DeliveryOrchestrator,
  core.module.ts wire-up.
- Phase 5 — Testing: 7 suites (routing, batching, deduplication, API,
  delivery, 2× doorbell isolation).

## Verification

| Metric | Value |
|--------|-------|
| Working Set Accuracy | ~95% |
| Prediction Accuracy | ~95% |
| Critical Discoveries | 0 |
| Major Discoveries | 0 |
| Minor Discoveries | 1 (pre-existing ESLint) |
| Build | ✅ |
| Tests | 35/35 |
| Architecture Verdict | APPROVED WITH CONDITIONS (all 5 resolved) |

## Documentation

- design.md
- tasks.md
- verify-report.md
- archive-report.md
- architecture-decisions.md

## Status

✅ Ready for merge

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

← [archive-report.md](archive-report.md) | [architecture-decisions.md](architecture-decisions.md) →
