# Design: SPEC-0015 — Workflow / BPM Engine

> **Versión template:** 1.0
> **SDD Compliance:** v2.1 (Feature Frozen)
> **Enterprise Design Standard:** ACTIVE
> **Platform Baseline:** sdd-v2.1-baseline
> **Estado:** Draft (post-Architecture Review refinement)

---

## 1. Executive Summary

CRM-Master carece de un motor de procesos de negocio. Las automatizaciones
actuales (SPEC-0011) son lineales y no soportan flujos largos con estados,
pausas, decisiones humanas, compensaciones ni paralelismo. Cada proceso
multi-paso (onboarding de cliente, aprobación de presupuesto, resolución de
incidencia) debe implementarse ad-hoc sin un estándar común.

**Workflow Engine** implementa un motor BPM completo con definiciones de
proceso versionadas e inmutables, instancias duraderas, ejecución asíncrona,
nodos de decisión, paralelismo, timers, espera de eventos, tareas humanas,
compensación (Saga), y recuperación ante fallos. La arquitectura sigue el
patrón **Definition → Instance → Execution**, donde el motor orquesta
plataformas existentes (Automation, Communication, Document, Integration)
sin poseer su lógica de negocio.

---

## 2. Technical Approach

El sistema se compone de siete capas:

1. **Workflow Definition** — modelo versionado e inmutable una vez publicado.
   Define el grafo de nodos (start, end, service task, user task, decision,
   parallel split/join, timer, event wait, sub workflow, compensation). Las
   definiciones se almacenan en formato JSON con schema versionado.

2. **Workflow Instance** — instancia duradera de una definición. Cada
   instancia tiene su propio contexto de variables (almacenadas en tabla
   separada `WorkflowVariable` para evitar write contention), correlationId,
   estado (running, suspended, completed, failed, cancelled), y ramas activas
   (tabla `WorkflowActiveBranch`). Persistida en base de datos.

3. **Workflow Execution** — orquestador que recibe un paso completado,
   resuelve los siguientes nodos según el grafo, y programa su ejecución.
   Totalmente asíncrono. Cada paso es idempotente.

4. **Node Executor** — ejecuta nodos concretos. ServiceTask ejecuta acciones
   en plataformas externas (Automation, Communication, etc.) a través del
   contrato `ServiceTaskGateway`. UserTask crea una tarea humana y espera
   resolución. Decision evalúa condiciones. ParallelSplit/Join gestiona
   concurrencia. Timer programa wake-up. EventWait suspende la instancia
   hasta recibir un evento externo. SubWorkflow programa el hijo y suspende
   el padre, reanudándolo al completarse el hijo (mismo patrón que
   EventWait — asíncrono).

5. **Compensation Engine** — implementa el patrón Saga. Por cada paso
   completado, registra un compensation step. Si el workflow falla o se
   cancela después de pasos parciales, ejecuta las compensaciones en orden
   inverso. Las compensaciones de ServiceTasks requieren `idempotencyKey`
   (cross-SPEC requirement) y restauran estado desde el audit trail.

6. **Scheduler + Timer** — programa timers (BullMQ repeatable jobs) y
   eventos de wake-up para instancias suspendidas o en espera de timer.
   Recupera timers pendientes después de reinicios.

7. **Audit Trail** — cada transición de estado, cada paso ejecutado, cada
   compensación, queda registrada en la tabla `workflow_audit` para
   trazabilidad completa.

```
Definition (versioned, immutable)
     │
     ▼
Instance (state, variables[], branches[])
     │
     ├── Execution (node resolution + scheduling)
     │         │
     │    [Node Executor]
     │    ├── ServiceTask → ServiceTaskGateway → External Platform
     │    ├── UserTask → Pending approval
     │    ├── Decision → Conditional branch
     │    ├── ParallelSplit → Fork (→ WorkflowActiveBranch)
     │    ├── ParallelJoin → Sync (wait ActiveBranch[])
     │    ├── Timer → Scheduler (BullMQ)
     │    ├── EventWait → Suspended until event
     │    └── SubWorkflow → Schedule child, SUSPEND parent
     │
     ├── Compensation Engine (Saga, reverse order, idempotent)
     │
     └── Audit Trail (every transition, tenant-scoped)
```

---

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Definition format | JSON, XML (BPMN 2.0), YAML | **JSON versionado** | Sin dependencias externas. Schema versionado. Fácil de versionar y comparar. |
| Definition immutability | Publicar = new version, Editable siempre | **Inmutable tras publicar** | Una vez publicada, una definición no puede modificarse. Los cambios crean una nueva versión. |
| Instance persistence | Tabla única, Event sourcing, Graph DB | **Tablas relacionales** | Prisma + PostgreSQL. Consultas simples. Trazabilidad vía audit trail. |
| Node execution | Síncrono, Asíncrono con cola, Híbrido | **Asíncrono con BullMQ** | Misma estrategia que SPEC-0011, 0012, 0013, 0014. Workers estateless. |
| Compensation | Saga coreografía, Saga orquestada | **Saga orquestada** | El engine conoce el grafo completo. Las compensaciones se ejecutan en orden inverso. |
| Parallelism | Fork/Join nativo, DAG execution | **ParallelSplit + ParallelJoin** | Semántica clara. Join espera todas las ramas vía `WorkflowActiveBranch`. |
| Human tasks | Tabla `workflow_user_tasks`, Polling, WebSocket | **Tabla + Evento** | UserTask crea un registro. El usuario lo resuelve via API. El engine reanuda. |
| Timers | BullMQ repeatable, node-cron, Base de datos | **BullMQ + DB** | BullMQ programa el wake-up. DB guarda timers pendientes para recovery. |
| Locking | Optimistic concurrency, Pessimistic, Distributed lock | **Optimistic con `version` field** | Simple, sin Redis externo. El campo `version` en instancia evita conflictos. |
| Crash recovery | Polling de steps pendientes, WAL, Event sourcing | **Polling + timer recovery** | Al iniciar, el engine busca instancias con steps pendientes y las reprograma. |
| SubWorkflow | Síncrono (esperar), Asíncrono con suspensión | **Asíncrono con suspensión** | BullMQ no bloquea. Mismo patrón que EventWait: schedule child → SUSPEND → resume on completion event. |
| Variables storage | JSON column, Tabla separada | **Tabla separada `WorkflowVariable`** | Evita write contention en instancia. Cada variable es una fila independiente. |
| Active branches | JSON array `currentNodes[]`, Tabla separada | **Tabla `WorkflowActiveBranch`** | ParallelJoin necesita consultar ramas activas sin deserializar JSON. |

---

## 4. Data Flow

```
Start workflow:

Client → POST /api/v1/workflow/instances
       │
       ├── Load definition (latest published version)
       ├── Create instance (RUNNING)
       ├── Create execution (STARTED)
       ├── Resolve start node
       └── Schedule first node(s) via BullMQ

Execute node:

BullMQ worker picks up job
       │
       ├── Lock instance (optimistic, version++)
       ├── Execute node
       │     ├── ServiceTask → ServiceTaskGateway.call(platform, action, { idempotencyKey?, ... })
       │     ├── UserTask → create pending task, return
       │     ├── Decision → evaluate expression, select path
       │     ├── ParallelSplit → create N rows in WorkflowActiveBranch
       │     ├── ParallelJoin → wait for all WorkflowActiveBranch completed
       │     ├── Timer → schedule wake-up
       │     ├── EventWait → suspend instance, wait for event
       │     └── SubWorkflow → schedule child instance → SUSPEND parent
       │
       ├── Record execution in audit trail
       ├── Resolve next node(s)
       ├── If COMPLETED → mark instance completed
       ├── If FAILED → trigger compensation
       └── Schedule next node(s)

Resume workflow (after human task / external event / sub-workflow completion):

Client → POST /api/v1/workflow/instances/:id/resume
       │
       ├── Validate transition (correct step, valid data)
       ├── Update instance (RUNNING)
       └── Schedule next node(s)

SubWorkflow completion (async):

Child workflow completes
       │
       ├── Child instance marked COMPLETED
       ├── Parent receives completion event (via EventWait pattern)
       ├── Parent resumes from SubWorkflow node
       └── Schedule next node(s)

Compensation:

On FAILED or CANCELLED:
       │
       ├── Query completed steps (reverse order)
       ├── For each step with compensation:
       │     ├── Load audit trail for original execution
       │     ├── Execute compensation step with idempotencyKey
       │     └── Record in audit trail
       │
       └── Mark instance as COMPENSATED
```

---

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `packages/database/prisma/schema.prisma` | Modify | Add `WorkflowDefinition`, `WorkflowDefinitionVersion`, `WorkflowInstance`, `WorkflowExecution`, `WorkflowUserTask`, `WorkflowTimer`, `WorkflowAudit`, `WorkflowVariable`, `WorkflowActiveBranch` models |
| 2 | `packages/shared/src/workflow/node-types.ts` | Create | Node type definitions (Start, End, ServiceTask, UserTask, Decision, ParallelSplit, ParallelJoin, Timer, EventWait, SubWorkflow, Compensation) |
| 3 | `packages/shared/src/workflow/definition.types.ts` | Create | Workflow definition schema, version, graph types |
| 4 | `packages/shared/src/workflow/instance.types.ts` | Create | Instance state, execution context, variable types |
| 5 | `packages/shared/src/workflow/index.ts` | Create | Re-export |
| 6 | `apps/api/src/modules/workflow/workflow.module.ts` | Create | NestJS module |
| 7 | `apps/api/src/modules/workflow/workflow.service.ts` | Create | Core engine |
| 8 | `apps/api/src/modules/workflow/workflow.controller.ts` | Create | REST API |

### 5.2 Secondary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 9 | `apps/api/src/modules/workflow/definition.service.ts` | Create | CRUD + versionado de definiciones |
| 10 | `packages/shared/src/workflow/node-executor.types.ts` | Create | `NodeExecutor` interface + `NodeExecutorRegistry` type |
| 11 | `packages/shared/src/workflow/service-task-gateway.ts` | Create | `ServiceTaskGateway` contract + context/result types |
| 12 | `apps/api/src/modules/workflow/executor/node-executor.ts` | Create | Ejecución de nodos |
| 13 | `apps/api/src/modules/workflow/compensation/compensation-engine.ts` | Create | Saga orquestada |
| 14 | `apps/api/src/modules/workflow/guards/workflow-definition.guard.ts` | Create | Permisos sobre definiciones |
| 15 | `apps/api/src/modules/workflow/guards/workflow-execution.guard.ts` | Create | Permisos sobre instancias |
| 16 | `apps/api/src/modules/core/core.module.ts` | Modify | Import `WorkflowModule` |

### 5.3 Expected NOT to Change

- `AutomationModule` (SPEC-0011) — el workflow lo orquesta, no lo modifica
- `CommunicationModule` (SPEC-0012) — el workflow lo usa como ServiceTask
- `DocumentModule` (SPEC-0013) — el workflow lo usa como ServiceTask
- `IntegrationModule` (SPEC-0014) — el workflow lo usa como ServiceTask
- Frontend — SPEC separada

---

## 6. Read Order

1. `packages/shared/src/automation/automation-action.ts` — patrón de abstracción
2. `packages/database/prisma/schema.prisma` — naming existente
3. `packages/shared/src/workflow/node-types.ts` — tipos de nodos
4. `packages/shared/src/workflow/definition.types.ts` — schema de definiciones
5. `packages/shared/src/workflow/service-task-gateway.ts` — contrato ServiceTask
6. `packages/shared/src/workflow/node-executor.types.ts` — contrato NodeExecutor
7. `apps/api/src/modules/workflow/workflow.service.ts` — core engine
8. `apps/api/src/modules/workflow/executor/node-executor.ts` — ejecutores
9. `apps/api/src/modules/workflow/compensation/compensation-engine.ts` — saga

---

## 7. Expected Commands

```bash
pnpm --filter database prisma migrate dev --name add_workflow_tables
pnpm --filter database generate
pnpm --filter api test workflow
pnpm turbo build --filter=api
```

---

## 8. Design Confidence

**Confidence:** High

El patrón Definition → Instance → Execution con nodos type-driven y ejecución
asíncrona es la arquitectura estándar de motores BPM (Temporal, Camunda,
Zeebe). La novedad es la integración con las plataformas existentes, que se
realiza mediante ServiceTasks que llaman a APIs internas a través del contrato
`ServiceTaskGateway` sin acoplamiento. Las revisiones del Architecture Review
(tenant isolation, async SubWorkflow, write contention) han sido incorporadas.

---

## 9. Exploration Budget

| Resource | Budget | Notes |
|----------|--------|-------|
| Repo searches | 4 | Patrones de plataformas existentes |
| Files to read | 6 | Schema, node types, existing guards |
| Files to create | 12 | Module, service, controller, executor, compensation, guards, types |
| Files to modify | 2 | schema.prisma, core.module.ts |

---

## 10. Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| ParallelJoin nunca completa (rama huérfana) | Media | Alto | Timeout configurable por join. Dead letter instance si expira. |
| Compensación falla después de compensar parcialmente | Baja | Alto | Cada compensación es idempotente con `idempotencyKey`. Se reintenta hasta completar. |
| Timer perdido tras reinicio del worker | Baja | Medio | Timers persistentes en DB. Job de recovery al iniciar. |
| Versión de definición incompatible con instancias en ejecución | Baja | Medio | Las instancias en ejecución usan la definición con la que empezaron. No hay migración forzada. |
| Write contention en instancia con muchas variables/ramas | Media | Medio | `WorkflowVariable` y `WorkflowActiveBranch` en tablas separadas. Cada escritura es independiente. |
| Data leakage entre tenants por falta de tenantId en tablas auxiliares | Alta | Alto | `tenantId` presente en `WorkflowExecution`, `WorkflowTimer`, `WorkflowAudit`. Scoping automático via Prisma extension. |
| SubWorkflow padre queda suspendido si el hijo falla y no propaga evento | Baja | Medio | Timeout de suspensión configurable (`maxInstanceLifetime`). Dead letter si expira. |

---

## 11. Testing Strategy

| Layer | Focus | Approach |
|-------|-------|----------|
| Unit — Graph resolution | Start → next nodes, decision branching, parallel split/join | Jest |
| Unit — Compensation | Reverse order, idempotency, partial failure | Jest |
| Integration — API | CRUD definitions, start/resume/cancel instances | supertest |
| Integration — Timer | Schedule → wake-up → resume | Jest + BullMQ mock |
| Integration — SubWorkflow | Schedule child → suspend parent → resume on completion | Jest + in-memory event bus |
| Doorbell | Tenant A workflows no visibles para Tenant B | E2E |

---

## 12. Doorbell Tests

| Test file | What it proves |
|-----------|----------------|
| `workflow-cross-tenant-isolation.spec.ts` | Tenant A no puede ver ni ejecutar definiciones/instancias de Tenant B |
| `workflow-cross-tenant-execution.spec.ts` | Tenant A no puede acceder a executions/timers/audit de Tenant B |

---

## 13. Required ADRs

| ADR | Reason | Status |
|-----|--------|--------|
| ADR-0011 | Documentar la arquitectura del Workflow Engine, el modelo de definiciones, ejecución, compensación y timers. | Proposed |

---

## 14. Boundaries

| Boundary | Owner | Purpose |
|----------|-------|---------|
| `WorkflowDefinition` | WorkflowModule | Definiciones versionadas e inmutables |
| `WorkflowInstance` | WorkflowModule | Estados de ejecución duraderos |
| `NodeExecutor` | WorkflowModule | Ejecución de nodos type-driven |
| `CompensationEngine` | WorkflowModule | Saga orquestada |
| External platforms | Respective modules | Orquestados via ServiceTask, nunca modificados |
| `ServiceTaskGateway` | WorkflowModule (contrato) / Platforms (implementación) | Interface entre engine y plataformas externas |
| SPEC-0011 boundary | WorkflowModule ↔ AutomationModule | SPEC-0011 puede iniciar workflows via `StartWorkflowAction`. ServiceTask llama a acciones individuales por action ID. `ActionResult.data` es el bridge de datos entre ambas SPECs. |

---

## 15. Extensibilidad

| Future feature | How it fits | Effort |
|----------------|-------------|--------|
| New node type | Implementar `NodeExecutor` + registrar en registry | Days |
| BPMN 2.0 import | Parse BPMN XML → JSON definition format | Weeks |
| Visual designer | UI que consume CRUD definitions | Weeks |
| Sub-workflow inlining | Resolver sub-workflow definition al ejecutar SubWorkflow node | Days |
| SLA timer por nodo | Timer configurable por ServiceTask/UserTask | Days |
| Read replicas para audit | Enrutar queries de audit trail a réplicas de lectura para no impactar escrituras | Weeks |
| Circuit breakers para plataformas externas | Envolver llamadas `ServiceTaskGateway` con circuit breaker pattern (tiempo de espera, fallos consecutivos) | Days |
| Raw SQL partitioning migration script | Script de migración para particionar `workflow_instances` y `workflow_audit` por mes via SQL crudo (PostgreSQL partitioning) | Days |
| ParallelJoin timeout en schema | Campo `timeout` en nodo ParallelJoin para evitar ramas huérfanas, con verificación periódica | Days |

---

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor | 10× (10K inst/día) | 100× (100K inst/día) | Mitigation |
|--------|-------------------|---------------------|------------|
| Instance creation | <10ms | <50ms | Index on `(tenantId, status, createdAt)` |
| Node execution | <50ms per node | <100ms | Async via BullMQ. Workers escalan horizontalmente. |
| Timer scheduling | <10ms per timer | <30ms | BullMQ repeatable. DB recovery. |
| Audit trail | <5ms per write | <10ms | Partición mensual. Archive >90 días. |

**Decision:** El motor escala horizontalmente con workers estateless. La base de datos es el único cuello de botella, mitigado por índices y particionado.

### B. Open/Closed Principle (OCP)

**Point of extension:** `NodeExecutor` registry.

**What must change to add a new node type:** Implementar `NodeExecutor` + registrar DI. Cero cambios en el engine.

### C. Ownership

| Data / Capability | Owner | Consumers |
|-------------------|-------|-----------|
| Workflow definitions | WorkflowModule | Tenants (CRUD), Engine (execution) |
| Workflow instances | WorkflowModule | Engine, Tenants (monitoring) |
| Workflow variables | WorkflowModule (by instance) | Engine |
| Workflow active branches | WorkflowModule (by instance) | Engine, ParallelJoin |
| Compensation | WorkflowModule | Engine |
| External actions | SPEC-0011, 0012, 0013, 0014 | WorkflowModule (via ServiceTaskGateway) |

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
|------|----------|---------|----------|
| Definitions | Indefinido | No aplica | Desactivar |
| Instances completed | `max(90d, completedAt + 90d)` | Archive mensual | Eliminar tras retention |
| Audit trail | 1 año | Archive anual | Eliminar >1 año |
| Compensation audit | Misma retención que la instancia asociada | Archive mensual | Eliminar con instancia |

### E. Idempotency

| Operation | Duplicate risk | Protection |
|-----------|---------------|------------|
| `executeNode()` | Alta (retry del worker) | `executionId` UUID + `ON CONFLICT DO NOTHING` |
| `compensate()` | Alta | `compensationId` UUID + `idempotencyKey` requerido en compensation ServiceTasks (cross-SPEC) |
| `resume()` | Media | Instance `version` field (optimistic locking) |
| ServiceTask via compensation | Alta | `idempotencyKey` obligatorio. Documentado como cross-SPEC requirement: toda plataforma externa que implemente ServiceTasks DEBE soportar idempotencyKey en endpoints de compensación. |

### F. Shared Contracts

| Contract | Location | Consumers |
|----------|----------|-----------|
| `NodeType` | `packages/shared/src/workflow/` | Engine, Definitions |
| `WorkflowDefinition` | `packages/shared/src/workflow/` | Engine, CRUD |
| `WorkflowStatus` | `packages/shared/src/workflow/` | Engine, Controller |
| `NodeExecutor` interface | `packages/shared/src/workflow/node-executor.types.ts` | Engine, Executor implementations |
| `NodeExecutorRegistry` | `packages/shared/src/workflow/node-executor.types.ts` | Engine |
| `ServiceTaskGateway` | `packages/shared/src/workflow/service-task-gateway.ts` | Engine (consumer), Platforms (implementers) |
| `ServiceTaskContext` | `packages/shared/src/workflow/service-task-gateway.ts` | Engine → Platforms |
| `ServiceTaskResult` | `packages/shared/src/workflow/service-task-gateway.ts` | Platforms → Engine |

### G. Partitioning Strategy

`workflow_instances`, `workflow_variables`, `workflow_active_branches` y
`workflow_audit` se particionan por mes. `workflow_definitions` y
`workflow_timers` no requieren partición.

---

## 16. Interfaces / Contracts

```typescript
export type NodeType =
  | 'start' | 'end' | 'service-task' | 'user-task'
  | 'decision' | 'parallel-split' | 'parallel-join'
  | 'timer' | 'event-wait' | 'sub-workflow' | 'compensation';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  config?: Record<string, unknown>;
  next?: string[];         // node IDs for next steps
  defaultNext?: string;    // default branch (decision)
  conditions?: Array<{ expression: string; next: string }>;
  compensation?: string;   // compensation node ID
  timeout?: number;        // SLA in ms
}

export interface WorkflowDefinition {
  id: string;
  tenantId: string;
  name: string;
  version: number;
  nodes: WorkflowNode[];
  startNode: string;
  isPublished: boolean;
}

export type InstanceStatus = 'running' | 'suspended' | 'completed' | 'failed' | 'cancelled' | 'compensated';

export interface WorkflowInstance {
  id: string;
  definitionId: string;
  tenantId: string;
  status: InstanceStatus;
  correlationId?: string;
  version: number;          // optimistic lock
  maxInstanceLifetime: number; // max total lifetime in ms before dead letter
}
```

### ServiceTaskGateway (shared contract)

```typescript
export interface ServiceTaskGateway {
  execute(
    platform: string,
    action: string,
    context: ServiceTaskContext
  ): Promise<ServiceTaskResult>;
}

export interface ServiceTaskContext {
  executionId: string;
  tenantId: string;
  instanceId: string;
  nodeId: string;
  input: Record<string, unknown>;
  idempotencyKey?: string;  // REQUIRED for compensation ServiceTasks
}

export interface ServiceTaskResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  durationMs: number;
}
```

### NodeExecutor (shared contract)

```typescript
import { WorkflowNode } from './definition.types';
import { WorkflowInstance } from './instance.types';

export interface ExecutionContext {
  instance: WorkflowInstance;
  node: WorkflowNode;
  variables: Map<string, unknown>;
  idempotencyKey?: string;
}

export interface ExecutionResult {
  success: boolean;
  output?: Record<string, unknown>;
  nextNodes?: string[];
  error?: string;
}

export interface NodeExecutor<TConfig = Record<string, unknown>> {
  readonly type: NodeType;
  execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult>;
}
```

### NodeExecutorRegistry (custom NestJS decorator)

```typescript
// Decorator definition
export const WORKFLOW_NODE_EXECUTOR = 'WORKFLOW_NODE_EXECUTOR';

export function WorkflowNodeExecutor(type: NodeType): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(WORKFLOW_NODE_EXECUTOR, type, target);
  };
}

// Registry type
export type NodeExecutorRegistry = Map<NodeType, NodeExecutor>;

// Usage in module
@Module({
  providers: [
    ServiceTaskExecutor,
    UserTaskExecutor,
    DecisionExecutor,
    ParallelSplitExecutor,
    ParallelJoinExecutor,
    TimerExecutor,
    EventWaitExecutor,
    SubWorkflowExecutor,
    CompensationExecutor,
    {
      provide: 'NODE_EXECUTOR_REGISTRY',
      useFactory: (...executors: NodeExecutor[]) => {
        const registry: NodeExecutorRegistry = new Map();
        for (const executor of executors) {
          const type = Reflect.getMetadata(WORKFLOW_NODE_EXECUTOR, executor.constructor);
          if (type) registry.set(type, executor);
        }
        return registry;
      },
      inject: [
        ServiceTaskExecutor,
        UserTaskExecutor,
        DecisionExecutor,
        ParallelSplitExecutor,
        ParallelJoinExecutor,
        TimerExecutor,
        EventWaitExecutor,
        SubWorkflowExecutor,
        CompensationExecutor,
      ],
    },
  ],
})
export class WorkflowModule {}
```

### SPEC-0011 / SPEC-0015 Boundary

```typescript
// SPEC-0011 initiates workflows via StartWorkflowAction
export interface StartWorkflowAction {
  execute(params: { definitionId: string; variables: Record<string, unknown> }): Promise<{ instanceId: string }>;
}

// SPEC-0015 ServiceTask calls SPEC-0011 actions by action ID
// ActionResult.data is the bridge between both systems
// Example: ServiceTask with config { platform: "automation", action: "send-email", input: { ... } }
//   → WorkflowModule calls ServiceTaskGateway.execute("automation", "send-email", context)
//   → AutomationModule routes to configured AutomationAction
//   → Returns ActionResult where ActionResult.data becomes ServiceTaskResult.data
```

```prisma
model WorkflowDefinition {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  name        String
  description String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  versions WorkflowDefinitionVersion[]
  instances WorkflowInstance[]

  @@index([tenantId])
  @@map("workflow_definitions")
}

model WorkflowDefinitionVersion {
  id           String   @id @default(uuid())
  definitionId String   @map("definition_id")
  version      Int
  nodes        Json
  startNode    String   @map("start_node")
  isPublished  Boolean  @default(false) @map("is_published")
  createdAt    DateTime @default(now()) @map("created_at")

  definition WorkflowDefinition @relation(fields: [definitionId], references: [id], onDelete: Cascade)

  @@unique([definitionId, version])
  @@map("workflow_definition_versions")
}

model WorkflowInstance {
  id                  String    @id @default(uuid())
  definitionId        String    @map("definition_id")
  definitionVersion   Int       @map("definition_version")
  tenantId            String    @map("tenant_id")
  correlationId       String?   @map("correlation_id")
  status              String    @default("running")
  version             Int       @default(1)
  maxInstanceLifetime Int       @default(604800000) // 7 days in ms
  startedAt           DateTime  @default(now()) @map("started_at")
  completedAt         DateTime? @map("completed_at")
  error               String?

  definition    WorkflowDefinition   @relation(fields: [definitionId], references: [id])
  executions    WorkflowExecution[]
  userTasks     WorkflowUserTask[]
  timers        WorkflowTimer[]
  audits        WorkflowAudit[]
  variables     WorkflowVariable[]
  activeBranches WorkflowActiveBranch[]

  @@index([tenantId, status])
  @@index([tenantId, correlationId])
  @@map("workflow_instances")
}

model WorkflowExecution {
  id          String    @id @default(uuid())
  instanceId  String    @map("instance_id")
  nodeId      String    @map("node_id")
  tenantId    String    @map("tenant_id")
  status      String    @default("pending") // pending | running | completed | failed | skipped
  input       Json?
  output      Json?
  error       String?
  startedAt   DateTime? @map("started_at")
  completedAt DateTime? @map("completed_at")

  instance WorkflowInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)

  @@index([instanceId])
  @@index([tenantId])
  @@map("workflow_executions")
}

model WorkflowUserTask {
  id          String    @id @default(uuid())
  instanceId  String    @map("instance_id")
  nodeId      String    @map("node_id")
  tenantId    String    @map("tenant_id")
  assignee    String?
  status      String    @default("pending") // pending | approved | rejected
  input       Json?
  output      Json?
  createdAt   DateTime  @default(now()) @map("created_at")
  completedAt DateTime? @map("completed_at")

  instance WorkflowInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)

  @@index([instanceId])
  @@index([tenantId, status])
  @@map("workflow_user_tasks")
}

model WorkflowTimer {
  id         String   @id @default(uuid())
  instanceId String   @map("instance_id")
  nodeId     String   @map("node_id")
  tenantId   String   @map("tenant_id")
  fireAt     DateTime @map("fire_at")
  fired      Boolean  @default(false)
  createdAt  DateTime @default(now()) @map("created_at")

  instance WorkflowInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)

  @@index([fireAt, fired])
  @@index([tenantId])
  @@map("workflow_timers")
}

model WorkflowAudit {
  id         String    @id @default(uuid())
  instanceId String    @map("instance_id")
  nodeId     String?   @map("node_id")
  tenantId   String    @map("tenant_id")
  eventType  String    @map("event_type") // started | completed | failed | compensated | suspended | resumed | cancelled
  data       Json?
  createdAt  DateTime  @default(now()) @map("created_at")

  instance WorkflowInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)

  @@index([instanceId])
  @@index([createdAt(sort: Desc)])
  @@index([tenantId])
  @@map("workflow_audit")
}

model WorkflowVariable {
  id         String   @id @default(uuid())
  instanceId String   @map("instance_id")
  key        String
  value      Json
  updatedAt  DateTime @updatedAt @map("updated_at")

  instance WorkflowInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)

  @@unique([instanceId, key])
  @@map("workflow_variables")
}

model WorkflowActiveBranch {
  id         String   @id @default(uuid())
  instanceId String   @map("instance_id")
  nodeId     String   @map("node_id")
  branchId   String   @map("branch_id")
  status     String   @default("active") // active | completed | failed
  createdAt  DateTime @default(now()) @map("created_at")

  instance WorkflowInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)

  @@index([instanceId])
  @@index([instanceId, branchId])
  @@map("workflow_active_branches")
}
```

---

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 1 | Add workflow tables + migration | Bajo | `prisma migrate down` |
| 2 | Create shared contracts + types (incl. ServiceTaskGateway, NodeExecutor interface) | Bajo | Revertir commit |
| 3 | Implement DefinitionService + versionado | Bajo | Revertir commit |
| 4 | Implement WorkflowService + NodeExecutor + SubWorkflow async pattern | Medio | Desactivar workers. Instancias en ejecución se mantienen. |
| 5 | Implement CompensationEngine con idempotencyKey | Medio | Compensaciones no ejecutadas hasta nueva versión. |
| 6 | Wire CoreModule + guards | Bajo | Quitar del imports |

---

## 18. Open Questions

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| 1 | ¿Soporte para BPMN 2.0 XML como formato de definición? | Open | Recomendación: JSON como formato nativo. BPMN 2.0 como import opcional en v2. |
| 2 | ¿Timeout por nodo configurable desde la definición? | Open | Recomendación: sí, campo `timeout` opcional en WorkflowNode. Default 5 minutos. |
| 3 | ¿Sub-workflow síncrono (esperar a que termine) o asíncrono (fire-and-forget)? | **Resolved** | Asíncrono con suspensión del padre. Mismo patrón que EventWait: schedule child → SUSPEND parent → resume on completion event. Compatible con BullMQ. |
| 4 | ¿Versiónes de definición: migrar instancias en ejecución? | **Resolved** | No. Cada instancia conserva la versión con la que empezó. |
| 5 | ¿maxInstanceLifetime default y política de dead letter? | **Resolved** | Default 7 días. Instancias que exceden maxInstanceLifetime pasan a dead letter automáticamente. |

---

> **Fin del documento.**
> **Enterprise Design Standard SDD v2.1.** Pendiente de Tasks.
