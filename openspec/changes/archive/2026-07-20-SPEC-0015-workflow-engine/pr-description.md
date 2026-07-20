# SPEC-0015 — Workflow / BPM Engine

## Summary

Implementa un motor BPM completo en CRM-Master con definiciones de proceso
versionadas e inmutables, instancias duraderas, ejecución asíncrona vía BullMQ,
nodos de decisión, paralelismo fork/join, timers, espera de eventos, tareas
humanas, compensación (Saga) y recuperación ante fallos. El motor orquesta las
plataformas existentes (Automation, Communication, Document, Integration) sin
acoplarse a ellas mediante el contrato `ServiceTaskGateway`.

## Features

- Workflow definitions versionadas e inmutables (JSON schema versionado)
- Instancias duraderas con estado, variables y ramas activas
- 11 tipos de nodo: Start, End, ServiceTask, UserTask, Decision, ParallelSplit,
  ParallelJoin, Timer, EventWait, SubWorkflow, Compensation
- Ejecución asíncrona con BullMQ (workers estateless)
- Saga orquestada para compensación con idempotencia
- Timer scheduling con persistencia en DB + BullMQ repeatable jobs
- SubWorkflow asíncrono con suspensión del padre (mismo patrón que EventWait)
- Tenant isolation completa: `tenantId` en todos los modelos + guards API
- Audit trail para trazabilidad completa de cada transición
- API REST: CRUD de definiciones, start/resume/cancel de instancias

## Architecture

- Architecture decisions: AD-001 to AD-013 (JSON definitions, BullMQ async
  execution, Saga orchestrated compensation, Fork/Join parallelism, etc.)
- NodeExecutor registry pattern para extensibilidad (Open/Closed Principle)
- `ServiceTaskGateway` contrato en `packages/shared/` — plataformas externas
  implementan, engine nunca importa directamente
- `WorkflowDefinition` → `WorkflowInstance` → `WorkflowExecution` (patrón
  Definition → Instance → Execution)

### Implementation

- Phase 1 — Foundation: 9 Prisma models + shared contracts (4 types modules)
- Phase 2 — Core Engine: DefinitionService, WorkflowService, 8 node executors,
  CompensationEngine, WorkflowModule con DI
- Phase 3 — API + Guards: REST controller, 2 tenant isolation guards, CoreModule wiring
- Phase 4 — Cross-Cutting Tests: 33 tests across 5 suites including 2 doorbell
  isolation suites

## Verification

| Metric | Value |
|--------|-------|
| Working Set Accuracy | 80% |
| Prediction Accuracy | 80% |
| Critical Discoveries | 0 |
| Major Discoveries | 0 |
| Minor Discoveries | 2 |
| Tests | 33/33 |
| Build | ✅ |
| Tenant Isolation | ✅ (verified by 2 doorbell suites, 11 tests) |
| Architecture Boundaries | ✅ (zero imports from platform modules) |
| Architecture Verdict | APPROVED WITH WARNINGS (pre-existing lint) |

## Documentation

- [design.md](design.md)
- [tasks.md](tasks.md)
- [verify-report.md](verify-report.md)
- [archive-report.md](archive-report.md)
- [architecture-decisions.md](architecture-decisions.md)

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
