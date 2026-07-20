# Design: SPEC-0011 — AI Automation Hub

> **Versión template:** 1.0
> **SDD Compliance:** v2.1 (Feature Frozen)
> **Enterprise Design Standard:** ACTIVE
> **Estado:** Draft
> **Documento de trabajo.** No modifica el pipeline SDD.

---

## 1. Executive Summary

CRM-Master carece de un motor de automatización centralizado. Actualmente cada
módulo implementa su propia lógica de notificaciones, recordatorios y acciones
programadas sin un orquestador común. No hay un registro de qué automatizaciones
existen, cuándo se ejecutan, si fallaron, ni cómo reintentarlas. La integración
con capacidades de IA (resúmenes, clasificación, generación de texto) no tiene
un punto de entrada definido.

**AI Automation Hub** implementa un motor de automatización central con registro
de triggers y acciones, pipeline de ejecución configurable, política de reintentos,
y capacidad de ejecución de tareas de IA. La arquitectura sigue el patrón
**Trigger Registry → Execution Pipeline → Action Registry** donde triggers y
acciones son registrables sin modificar el motor.

El impacto esperado es eliminar la lógica de automatización dispersa, proporcionar
un registro único de ejecución con auditoría, y sentar las bases para un futuro
Workflow Builder visual y un AI Assistant.

---

## 2. Technical Approach

El sistema se compone de ocho capas:

1. **Trigger Registry** — registro de triggers disponibles. Cada trigger es un
   evento de dominio (`cliente.creado`, `cita.confirmada`, `pago.recibido`) o
   un evento temporal (`cron.programado`, `manual.user`). Los triggers se
   definen en `packages/shared/` y son descubribles por el motor.

2. **Action Registry** — registro de acciones ejecutables. Cada acción es una
   clase concreta que implementa la interfaz `AutomationAction`. Ejemplos:
   `SendEmailAction`, `CreateTaskAction`, `GenerateAIResponseAction`. Las
   acciones se registran mediante inyección de dependencias.

3. **Automation Dispatcher** — abstracción que recibe un trigger evaluado y
   programa su ejecución. La implementación inicial es `SyncDispatcher`
   (ejecución en el mismo proceso). Futuras implementaciones incluirán
   `BullMQDispatcher` (cola de trabajos) y `DistributedDispatcher` (workers).
   `AutomationEngine` depende únicamente de `AutomationDispatcher`.

4. **AI Provider Abstraction** — interfaz `AiProvider` que desacopla las
   acciones de IA del proveedor concreto. `GenerateAIResponseAction`,
   `SummarizeAction`, `ClassifyTicketAction` dependen de `AiProvider`, no
   de OpenAI ni de ningún proveedor específico. Los proveedores se registran
   mediante DI: `OpenAiProvider`, `AnthropicProvider`, `AzureOpenAiProvider`,
   `OllamaProvider`, `LmStudioProvider`.

5. **Secret Store** — almacén seguro de credenciales. Las acciones nunca
   contienen API keys. Obtienen sus credenciales de `SecretStore.get(tenantId, key)`.
   Los secrets se almacenan cifrados en la tabla `tenant_secrets`.

6. **Execution Pipeline** — orquestador que recibe un trigger, evalúa qué
   automatizaciones están habilitadas, construye el pipeline de acciones y las
   ejecuta secuencialmente. Cada acción declara su propia política de fallo
   (RETRY / CONTINUE / ABORT), timeout, y diferenciación de errores
   retryables vs no retryables.

7. **Execution Store** — tabla `automation_executions` que registra cada
   ejecución con su estado, resultado, duración, errores y audit trail.

8. **Automation Registry** — tabla `automation_rules` donde los tenants definen
   "cuando ocurra X, ejecutar Y". Cada regla asocia un trigger con una o más
   acciones, con filtros condicionales y política de reintentos configurable.

```
[Domain Event] ──► [Trigger Registry] ──► [Execution Pipeline]
                      │                          │
                      │                    [Action Registry]
                      │                          │
                      ▼                          ▼
              [Automation Rules]          [Action Instance]
                      │                          │
                      └──────────┬───────────────┘
                                 ▼
                        [Execution Store]
                        (audit trail + retry)
```

---

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Trigger model | Event-driven (DomainEvents), Polling, Webhook | **Event-driven (DomainEvents)** | Reutiliza el EventEmitter2 existente. Cero latencia. Sin polling. |
| Action model | Clases concretas registradas vía DI, Scripts embebidos, Webhooks externos | **Clases con interfaz `AutomationAction`** | Type-safe, testeable, registrable via NestJS DI. Extensible sin modificar el motor. |
| Execution pipeline | Secuencial, Paralelo, DAG | **Secuencial con paralelismo opcional** | Simple, predecible, fácil de auditar. Paralelismo se añade como optimización futura. |
| Dispatcher abstraction | Sync, BullMQ, Distributed | **`AutomationDispatcher` con `SyncDispatcher`** | Engine depende de la interfaz, no del mecanismo de ejecución. BullMQ se añade sin modificar el engine. |
| AI Provider abstraction | OpenAI directo, Interfaz común | **Interfaz `AiProvider`** | Actions dependen de `AiProvider`. Proveedores se registran por DI. Migrar de OpenAI a Anthropic no requiere cambiar actions. |
| Secret Store | Env vars, Tabla cifrada, Vault externo | **Tabla `tenant_secrets` cifrada** | Las acciones piden secrets por clave. Nunca contienen API keys en su código. |
| Retry strategy | Fixed delay, Exponential backoff, Dead letter queue | **Exponential backoff (3 intentos)** | Estándar para sistemas distribuidos. Evita tormentas de reintentos. Solo aplica a errores retryables. |
| Failure policy | Centralizada en el engine, Delegada a cada acción | **Delegada a cada acción** | Cada `AutomationAction` declara `onFailure: 'RETRY' | 'CONTINUE' | 'ABORT'`. El engine delega, no decide. |
| Error classification | Sin distinción, Retryable vs Non-retryable | **RetryableError / NonRetryableError** | Errores de red, timeout y provider unavailable son retryables. Validation, auth y malformed prompt no lo son. |
| Idempotency | executionId UUID, StepId, AI request hash | **executionId + stepId + AI request hash** | AI idempotency: `sha256(executionId + actionId + normalizedPrompt)`. Duplicados no invocan al proveedor dos veces. |
| AI execution | Síncrono (esperar respuesta), Asíncrono (callback), Polling | **Asíncrono con polling de estado** | Las APIs de IA pueden tardar segundos. El pipeline no debe bloquearse. |
| Prompt sanitization | Ninguna, Filtro básico, Policy explícita | **PromptSanitizer policy** | Previene prompt injection, leakage y system prompt override antes de cada invocation de IA. |
| Rule storage | Tabla `automation_rules`, archivo YAML, base de datos externa | **Tabla `automation_rules`** | Scoped por tenant, versionable, consultable. |
| Multi-tenant isolation | Fila `tenant_id`, esquema separado | **Fila `tenant_id`** | Consistente con el resto del CRM. |

---

## 4. Data Flow

```
1. Domain event fires (e.g. 'cita.confirmada')
        │
        ▼
2. Event Handler @OnEvent('cita.confirmada')
        │
        ▼
3. AutomationEngine.evaluate(trigger)
        │
        ├── Check tenant concurrency quota (max 5 concurrent)
        ├── Query: SELECT * FROM automation_rules
        │         WHERE trigger = 'cita.confirmada'
        │         AND tenant_id = X AND is_active = true
        │
        ▼
4. For each matching rule:
        │
        ├── Generate executionId (UUID)
        ├── Create execution record (PENDING)
        │
        ▼
5. AutomationDispatcher.dispatch(execution)
        │
        ├── SyncDispatcher.execute(execution)  [v1]
        │   │
        │   ▼
        ├── 5. Execute action pipeline (sequential):
        │   │
        │   ├── Action 1: SendEmailAction.execute(context)
        │   │     ├── Mark step IN_PROGRESS
        │   │     ├── Check timeout (action-specific)
        │   │     ├── Execute (email.send)
        │   │     ├── Mark step COMPLETED
        │   │     │
        │   │     └── On FAILED:
        │   │           ├── Is error retryable?
        │   │           │   ├── Network/Timeout → RETRY (exponential backoff)
        │   │           │   ├── Validation/Auth → SKIP (non-retryable)
        │   │           │   └── Unknown → ABORT pipeline
        │   │           │
        │   │           └── Action policy:
        │   │               ├── RETRY → retry up to action.maxRetries
        │   │               ├── CONTINUE → mark FAILED, continue pipeline
        │   │               └── ABORT → mark FAILED, stop pipeline
        │   │
        │   ├── Action 2: CreateTaskAction.execute(context)
        │   │     └── (same cycle)
        │   │
        │   └── Action N: ...
        │
        └── [Future] BullMQDispatcher.enqueue(execution)  [v2]
                │
                └── Worker picks up → executes pipeline
                │
                ▼
7. Publish 'automation.completed' event
        │
        ├── ActivityTimeline.publish()
        └── SearchModule.index() [future]
```

---

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `packages/database/prisma/schema.prisma` | Modify | Add `AutomationRule`, `AutomationExecution`, `AutomationStep` models |
| 2 | `packages/shared/src/automation/trigger-registry.ts` | Create | Trigger definitions, types, metadata |
| 3 | `packages/shared/src/automation/action.interface.ts` | Create | `AutomationAction` interface |
| 4 | `packages/shared/src/automation/index.ts` | Create | Re-export |
| 5 | `apps/api/src/modules/automation/automation.module.ts` | Create | NestJS module |
| 6 | `apps/api/src/modules/automation/automation.service.ts` | Create | Core engine: evaluate, execute, retry |
| 7 | `apps/api/src/modules/automation/automation.controller.ts` | Create | CRUD for rules + manual execution |
| 8 | `apps/api/src/modules/automation/dto.ts` | Create | Rule CRUD schemas, execution filters |
| 9 | `apps/api/src/modules/automation/actions/send-email.action.ts` | Create | First built-in action |
| 10 | `apps/api/src/modules/automation/actions/create-task.action.ts` | Create | Second built-in action |

### 5.2 Secondary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 11 | `apps/api/src/modules/core/core.module.ts` | Modify | Import `AutomationModule` |
| 12 | `apps/api/src/modules/automation/automation.service.spec.ts` | Create | Unit tests |
| 13 | `apps/api/src/modules/automation/actions/__tests__/send-email.action.spec.ts` | Create | Action tests |
| 14 | `apps/api/modules/automation/actions/generate-ai-response.action.ts` | Create | AI action (MVP) |
| 15 | `apps/api/test/doorbell/automation-cross-tenant-isolation.spec.ts` | Create | Doorbell test |

### 5.3 Expected NOT to Change

- `app.module.ts` — pasa por `CoreModule`
- Existing domain services — no se modifican. El automation consume eventos existentes.
- `SearchModule` — independiente
- `ActivityTimeline` — independiente (el automation publica eventos hacia él)
- Frontend — esta SPEC es backend-only. UI del automation en SPEC separada.

---

## 6. Read Order

1. `docs/templates/design-master-prompt.md` — recordar estructura
2. `docs/templates/design-enterprise-template.md` — recordar secciones
3. `packages/shared/src/activity-timeline/event-envelope.ts` — patrón de contratos compartidos
4. `packages/database/prisma/schema.prisma` — entender naming y modelos existentes
5. `packages/shared/src/automation/action.interface.ts` (borrador) — definir contrato de acciones
6. `packages/shared/src/automation/trigger-registry.ts` (borrador) — definir triggers conocidos
7. `apps/api/src/modules/automation/automation.service.ts` (borrador) — core del motor
8. `apps/api/src/modules/automation/automation.controller.ts` (borrador) — CRUD + ejecución

---

## 7. Expected Commands

```bash
pnpm --filter database prisma migrate dev --name add_automation_tables
pnpm --filter database generate
pnpm --filter api test automation
pnpm --filter api lint
pnpm turbo build --filter=api
```

---

## 8. Design Confidence

**Confidence:** High

El patrón Trigger Registry → Execution Pipeline → Action Registry es una
variante del patrón Event → Consumer ya implementado en SPEC-0009 y SPEC-0010.
El equipo conoce el mecanismo de eventos, la inyección de dependencias para el
registro de acciones, y las políticas de reintento son estándar. La única
incertidumbre es la integración con APIs de IA externas (latencia, costos),
mitigada por el modelo de ejecución asíncrona.

---

## 9. Exploration Budget

| Resource | Budget | Notes |
|----------|--------|-------|
| Repo searches | 5 | Patrones de shared, action patterns, event patterns |
| Files to read | 8 | Schema, shared contracts, existing event handlers |
| Files to create | 12 | Module, service, controller, DTOs, actions, contracts, tests |
| Files to modify | 2 | schema.prisma, core.module.ts |

---

## 10. Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI action latency bloquea el pipeline | Media | Alto | Timeout configurable por acción (default 30s). Async execution. AbortSignal propagation. |
| Acciones fallan silenciosamente | Baja | Alto | Execution store registra cada paso. Fallo = estado FAILED visible en auditoría. |
| Bucle infinito (automation ejecuta automation) | Baja | Medio | Las automatizaciones NO publican eventos que otras automatizaciones consuman. Solo los dominios publican. |
| Reglas de tenant corruptas | Baja | Medio | Validación Zod en cada CREATE/UPDATE. Los triggers y actions conocidos son enum. |
| Prompt injection en acciones de IA | Media | Alto | PromptSanitizer valida y sanitiza todo input antes de invocar al AiProvider. System prompt protegido. |
| Exposición de API keys en execution logs | Baja | Alto | SecretStore gestiona credenciales. Actions nunca emiten secrets en logs ni en execution history. |
| Noisy neighbour (tenant satura el engine) | Baja | Medio | Límite de concurrencia por tenant (default 5). Cola particionada por tenant en v2. |

---

## 11. Testing Strategy

| Layer | Focus | Approach |
|-------|-------|----------|
| Unit — Engine | evaluate(), execute(), retry() con reglas mock | Jest |
| Unit — Actions | Cada acción con contexto mock | Jest |
| Integration — API | CRUD rules, manual execution, execution history | supertest |
| Doorbell | Tenant A rules no visibles para Tenant B | E2E |
| AI action mock | Respuesta simulada con timeout | Jest + mocked AI client |

---

## 12. Doorbell Tests

| Test file | What it proves |
|-----------|----------------|
| `automation-cross-tenant-isolation.spec.ts` | Tenant A no puede ejecutar ni ver reglas de Tenant B |
| `automation-cross-tenant-execution.spec.ts` | La ejecución de una regla de Tenant A no afecta datos de Tenant B |

---

## 13. Required ADRs

| ADR | Reason | Status |
|-----|--------|--------|
| ADR-0007 | Documentar la arquitectura del AI Automation Hub, el modelo de triggers/acciones, la estrategia de reintentos y la ejecución asíncrona de IA. | Proposed |

---

## 14. Boundaries

| Boundary | Owner | Purpose |
|----------|-------|---------|
| `TriggerRegistry` | AutomationModule | Único registro de triggers conocidos |
| `ActionRegistry` | AutomationModule | Único registro de acciones disponibles |
| `AutomationEngine` | AutomationModule | Orquestador del pipeline. Solo él ejecuta acciones. |
| `AutomationRule` (tabla) | AutomationModule | Almacenamiento de reglas por tenant |
| `AutomationExecution` (tabla) | AutomationModule | Almacenamiento de ejecuciones |
| Domain Events | Domain modules | Disparan triggers. No conocen AutomationModule. |

---

## 15. Extensibilidad

| Future feature | How it fits | Effort |
|----------------|-------------|--------|
| New trigger | Añadir al TriggerRegistry + el dominio ya publica el evento | Hours |
| New action | Implementar `AutomationAction` + registrar DI | Hours |
| New AI provider | Implementar `AiProvider` + registrar DI. Actions no cambian. | Hours |
| BullMQ dispatcher | Implementar `BullMQDispatcher`. Engine no cambia. | Days |
| Workflow Builder | Consume `GET /api/v1/automation/rules` + triggers + actions | Weeks |
| AI Assistant | `GenerateAIResponseAction` es el entry point del assistant | Days |
| Parallel execution | Pipeline acepta `mode: 'parallel'` en la regla | Days |
| Webhook trigger | Nuevo trigger + endpoint público con validación HMAC | Days |
| Human approval steps | `HumanApprovalAction` que pausa y espera callback | Weeks |

---

## Architecture Review (MANDATORY)

### A. Scalability

| Factor | 10× (100 rules/tenant) | 100× (1000 rules/tenant) | Mitigation |
|--------|----------------------|-------------------------|------------|
| Rule queries | <5ms | <20ms | Index on `(tenantId, trigger)` |
| Execution store | <10ms per write | <50ms | Index on `(tenantId, createdAt)`. Archive after 90 days. |
| AI action latency | 2-5s per call | 2-5s (parallel) | Async execution. No bloquea el pipeline principal. |
| Concurrent executions | <10/min | <100/min | Queue-based execution si es necesario (v2). |

**Decision:** El motor escala linealmente. El cuello de botella son las acciones de IA externas, mitigado por:
- Timeouts por acción (default 30s).
- `AutomationDispatcher` permite migrar a BullMQ sin cambiar el engine.
- Límite de concurrencia por tenant (default 5) evita saturaciones.

### B. Open/Closed Principle (OCP)

**Point of extension:** `ActionRegistry` (inyección de dependencias) y `TriggerRegistry` (enum + metadata).

**What must change to add one new action:** Implementar `AutomationAction` + registrar provider en `AutomationModule`. Cero cambios en el motor.

**What must change to add one new trigger:** Añadir entrada al TriggerRegistry. El dominio ya publica el evento.

**Decision:** OCP cumplido. El motor no conoce las acciones concretas. El registry las descubre por DI.

### C. Ownership

| Data / Capability | Owner | Consumers |
|-------------------|-------|-----------|
| `automation_rules` | AutomationModule | AutomationEngine (reads). Tenant admin (CRUD via controller). |
| `automation_executions` | AutomationModule | AutomationEngine (writes). Tenant admin (reads via controller). |
| Trigger definitions | AutomationModule (TriggerRegistry) | AutomationEngine (evaluation) |
| Action implementations | AutomationModule (ActionRegistry) | AutomationEngine (execution) |
| Domain events | Domain modules | Disparan triggers sin conocer AutomationModule. |

**Decision:** AutomationModule es el único propietario de reglas, ejecuciones y registro de triggers/acciones.

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
|------|----------|---------|----------|
| automation_rules | Indefinido (mientras la regla esté activa) | No aplica | Desactivar (is_active=false) en lugar de borrar |
| automation_executions | 90 días online | Archivo mensual a tabla fría | Eliminar >90 días via job programado |

**Decision:** Las reglas son suaves (is_active). Las ejecuciones se archivan después de 90 días.

### E. Idempotency

| Operation | Duplicate risk | Protection | Fallback |
|-----------|---------------|------------|----------|
| `execute(ruleId, context)` | Media (reintentos del pipeline) | `executionId` UUID único por intento | `ON CONFLICT (execution_id) DO NOTHING` |
| `createRule()` | Baja | Validación unique sobre nombre + tenantId | Error de duplicado |
| `runAction()` | Media (reintentos) | El action recibe `stepId` y verifica si ya se completó | Skip si ya COMPLETED |

**Decision:** Cada ejecución tiene un `executionId` UUID. La tabla usa `ON CONFLICT DO NOTHING`. Cada paso de acción tiene un `stepId` y verifica estado antes de ejecutar.

Para acciones de IA, se genera un hash de idempotencia:
`sha256(executionId + actionId + normalizedPrompt)`. Este hash se pasa como
`idempotencyKey` al `AiProvider`. Si el proveedor soporta idempotency keys
(OpenAI, Anthropic), la misma key no genera una segunda invocación. Si no
la soporta, el `AiProvider` cachea la respuesta por key internamente.

### F. Shared Contracts

| Contract | Location | Consumers | Producers |
|----------|----------|-----------|-----------|
| `AutomationAction` interface | `packages/shared/src/automation/` | Engine | Action implementations |
| `TriggerDefinition` | `packages/shared/src/automation/` | Engine, Frontend (future) | Registry |
| `AutomationRule` | `packages/shared/src/automation/` | Engine, Controller, Frontend | CRUD |
| `ExecutionResult` | `packages/shared/src/automation/` | Engine, Controller | Frontend |

**Decision:** Contratos compartidos en `packages/shared/src/automation/`. Misma estrategia que SPEC-0009 y SPEC-0010.

### G. Partitioning Strategy

| Dimension | Risk | Strategy |
|-----------|------|----------|
| Tenant | Bajo (pocas reglas por tenant) | `tenant_id` indexado. No requiere partición. |
| Time | Medio (executions crecen rápido) | Partición mensual en `automation_executions`. Cleanup >90 días. |

**Decision:** `automation_executions` se particiona por mes (misma estrategia que ActivityTimeline en SPEC-0009). `automation_rules` no requiere partición.

---

## 16. Interfaces / Contracts

```typescript
// ─── packages/shared/src/automation/ ─────────────────────

// ─── AutomationAction ────────────────────────────────────
// Each action declares its own failure policy, timeout, and retry limits.

export type FailurePolicy = 'RETRY' | 'CONTINUE' | 'ABORT';

export interface AutomationAction {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly timeout: number;            // ms, default 30000
  readonly maxRetries: number;         // default 3
  readonly onFailure: FailurePolicy;   // default 'RETRY'
  execute(context: ActionContext): Promise<ActionResult>;
  isRetryable(error: Error): boolean;  // each action classifies its own errors
}

export interface ActionContext {
  executionId: string;
  stepId: string;
  tenantId: string;
  trigger: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  signal?: AbortSignal;               // for cancellation
}

export interface ActionResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  durationMs: number;
}

// ─── AutomationDispatcher ─────────────────────────────────
// Engine depends ONLY on this interface.
// SyncDispatcher executes in-process (v1).
// BullMQDispatcher executes via queue (v2).
// DistributedDispatcher executes via workers (v3).

export interface AutomationDispatcher {
  dispatch(execution: ExecutionContext): Promise<void>;
}

export interface ExecutionContext {
  executionId: string;
  tenantId: string;
  ruleId: string;
  trigger: string;
  actions: string[];
  payload: Record<string, unknown>;
}

// ─── AiProvider ────────────────────────────────────────────
// Actions depend on AiProvider, never on a concrete provider.
// Providers register via DI: OpenAiProvider, AnthropicProvider, etc.

export type AiModel = 'gpt-4' | 'claude-3' | 'llama-3' | string;

export interface AiProvider {
  readonly id: string;                    // 'openai' | 'anthropic' | 'ollama'
  generate(prompt: AiPrompt, opts?: AiOptions): Promise<AiResponse>;
  summarize(text: string, opts?: AiOptions): Promise<AiResponse>;
  classify(input: string, categories: string[], opts?: AiOptions): Promise<AiClassification>;
}

export interface AiPrompt {
  system?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

export interface AiOptions {
  model?: AiModel;
  timeout?: number;                      // action-specific timeout
  idempotencyKey?: string;              // sha256(executionId + actionId + prompt)
}

export interface AiResponse {
  content: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  durationMs: number;
}

export interface AiClassification {
  category: string;
  confidence: number;
}

// ─── SecretStore ───────────────────────────────────────────
// Actions request secrets by key. Never embed API keys in action code.

export interface SecretStore {
  get(tenantId: string, key: string): Promise<string | null>;
  set(tenantId: string, key: string, value: string): Promise<void>;
  delete(tenantId: string, key: string): Promise<void>;
}

// ─── PromptSanitizer ───────────────────────────────────────
// Applied before every AiProvider invocation.

export interface PromptSanitizer {
  sanitize(prompt: AiPrompt): AiPrompt;
  validate(prompt: AiPrompt): { valid: boolean; errors: string[] };
}

export interface TriggerDefinition {
  id: string;
  name: string;
  description: string;
  category: 'domain' | 'schedule' | 'manual';
  eventType?: string;       // domain event name if category=domain
  payloadSchema: Record<string, unknown>;
}

export interface AutomationRuleDto {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  trigger: string;
  actions: string[];         // ordered action IDs
  filters?: Record<string, unknown>;
  retryPolicy?: {
    maxAttempts: number;      // default 3
    backoffMs: number;        // default 1000
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

```prisma
// ─── Tenant secrets (encrypted) ─────────────────────────
model TenantSecret {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  key       String
  value     String   // encrypted at rest
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([tenantId, key])
  @@map("tenant_secrets")
}

// ─── Automation tables ──────────────────────────────────

model AutomationRule {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  name        String
  description String?
  trigger     String   // trigger ID from TriggerRegistry
  actions     String[] // ordered action IDs
  filters     Json?    @default("{}")
  config      Json?    @default("{}")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([tenantId, trigger])
  @@map("automation_rules")
}

model AutomationExecution {
  id            String   @id @default(uuid())
  tenantId      String   @map("tenant_id")
  ruleId        String   @map("rule_id")
  trigger       String
  status        String   @default("pending") // pending | running | completed | partial | failed
  actionsTotal  Int      @map("actions_total")
  actionsOk     Int      @map("actions_ok")
  actionsFailed Int      @map("actions_failed")
  startedAt     DateTime @default(now()) @map("started_at")
  completedAt   DateTime? @map("completed_at")
  error         String?

  steps AutomationExecutionStep[]

  @@index([tenantId, status])
  @@index([tenantId, createdAt(sort: Desc)])
  @@map("automation_executions")
}

model AutomationExecutionStep {
  id            String   @id @default(uuid())
  executionId   String   @map("execution_id")
  actionId      String   @map("action_id")
  status        String   @default("pending") // pending | running | completed | failed | skipped
  attempt       Int      @default(1)
  maxAttempts   Int      @default(3)
  input         Json?
  output        Json?
  error         String?
  startedAt     DateTime? @map("started_at")
  completedAt   DateTime? @map("completed_at")
  durationMs    Int?     @map("duration_ms")

  execution AutomationExecution @relation(fields: [executionId], references: [id], onDelete: Cascade)

  @@index([executionId])
  @@map("automation_execution_steps")
}
```

---

## Policies

### Tenant Concurrency

Cada tenant tiene un límite de ejecuciones concurrentes para evitar el
problema de noisy neighbour.

| Parameter | Default | Configurable | Scope |
|-----------|---------|--------------|-------|
| maxConcurrentExecutions | 5 | Por tenant en `tenant.config` | Previene que un tenant sature el engine |
| maxRulesPerTenant | 50 | Por plan | Límite de reglas activas |

El `AutomationEngine` verifica el límite antes de ejecutar. Si se excede,
la ejecución se rechaza con estado `THROTTLED` y se reintenta
automáticamente cuando haya disponibilidad.

### Prompt Sanitization Policy

Aplicada antes de cada invocación a `AiProvider.generate()`. Consta de
dos fases:

**Validación:**
- El system prompt no contiene variables de usuario (protegido contra override).
- El mensaje del usuario no excede `maxInputLength` (default 4000 chars).
- El mensaje del usuario no contiene plantillas de system prompt conocidas.
- Contenido binario o codificado (base64, hex) es rechazado.

**Sanitización:**
- Se añade un prefijo al system prompt que refuerza los límites del asistente.
- Se escapan caracteres de control y secuencias de escape.
- Se limpiar meta-instrucciones del contenido del usuario.
- Se añade un suffix que instruye al modelo ignorar intentos de redirección.

El `PromptSanitizer` se ejecuta en el action, antes de llamar a `AiProvider`.
Si la validación falla, la acción se marca como `FAILED` con error
`NON_RETRYABLE` (no se reintenta).

### Error Classification

| Error type | Retryable | Examples |
|------------|-----------|----------|
| NetworkError | ✅ Sí | conexión perdida, DNS failure, TLS error |
| TimeoutError | ✅ Sí | provider timeout (>action.timeout) |
| ProviderUnavailableError | ✅ Sí | 503, rate limit, temporary outage |
| ValidationError | ❌ No | payload inválido, campos requeridos faltantes |
| AuthenticationError | ❌ No | API key inválida o expirada |
| AuthorizationError | ❌ No | sin permiso para ejecutar la acción |
| MalformedPromptError | ❌ No | prompt supera límite de tokens, contenido rechazado |
| UnsupportedActionError | ❌ No | acción no soportada por el provider |

Cada `AutomationAction.isRetryable()` implementa esta clasificación.
Errores no retryables pasan directamente a `CONTINUE` o `ABORT` según
la política de la acción.

---

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 1 | Add `automation_rules`, `automation_executions`, `automation_execution_steps` tables | Bajo | `prisma migrate down` |
| 2 | Create `AutomationModule` + shared contracts | Bajo | Revertir commit |
| 3 | Implement built-in actions (email, task) | Bajo | Desregistrar del módulo |
| 4 | Implement AI action (mock en v1, real en v2) | Medio | Configurable por feature flag |
| 5 | Wire into CoreModule | Bajo | Quitar del imports |

---

## 18. Open Questions

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| 1 | ¿Deben las acciones de IA ejecutarse en un worker separado? | **Resolved** | La abstracción `AutomationDispatcher` lo permite. v1 usa `SyncDispatcher`. v2 usará `BullMQDispatcher` sin cambiar el engine. |
| 2 | ¿Soporte para acciones condicionales (if/else)? | Open | Recomendación: v1 pipeline lineal. V2 con condiciones si la demanda lo justifica. |
| 3 | ¿Notificar al tenant cuando una automation falla repetidamente? | Open | Recomendación: v1 consultable vía execution history. V2 con alerts. |
| 4 | ¿Dónde se almacenan las API keys de los proveedores de IA? | **Resolved** | `SecretStore` + tabla `tenant_secrets` cifrada. Las acciones nunca contienen keys. |
| 5 | ¿Cómo se evita la inyección de prompt en acciones de IA? | **Resolved** | `PromptSanitizer` se ejecuta antes de cada invocación a `AiProvider`. System prompt reforzado. |
| 6 | ¿Cómo se garantiza que una acción de IA no se ejecute dos veces? | **Resolved** | Idempotency key = `sha256(executionId + actionId + normalizedPrompt)`. El provider recibe la key. |

---

> **Fin del documento.**
> **Enterprise Design Standard SDD v2.1.** Listo para pasar a Tasks.
