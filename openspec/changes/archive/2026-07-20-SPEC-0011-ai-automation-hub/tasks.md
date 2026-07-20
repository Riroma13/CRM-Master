# Tasks: SPEC-0011 — AI Automation Hub

> **Basado en:** Design APPROVED (Architecture Review: 9 improvements incorporated)
> **SDD v2.1 — Enterprise Design Standard**
> **Fecha:** 2026-07-19

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~900–1200 |
| 400-line budget risk | **High** |
| Chained PRs recommended | **Yes** |
| Suggested split | PR1 Foundation → PR2 Engine → PR3 Actions → PR4 Integration → PR5 Testing |
| Delivery strategy | `stacked-to-main` |
| Chain strategy | `stacked-to-main` |

---

## Phase 1: Foundation — Schema, Shared Contracts, ADR

**Objetivo:** Crear la base de datos, los contratos compartidos de Automation,
TriggerRegistry, AiProvider, SecretStore, AutomationDispatcher, PromptSanitizer
y el ADR-0007.

**Dependencias:** Ninguna.

**Riesgo:** Bajo. Cambios aditivos. No afectan módulos existentes.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 1.1 | ADR-0007: AI Automation Hub Architecture | `docs/architecture/adr/0007-automation-hub.md` | ADR creado documentando la arquitectura del motor, abstracciones, políticas y decisiones clave | Documental |
| 1.2 | Add automation tables to Prisma schema | `packages/database/prisma/schema.prisma` | Modelos `AutomationRule`, `AutomationExecution`, `AutomationExecutionStep`, `TenantSecret`. Indexes en `(tenantId, trigger)`, `(tenantId, createdAt)`, FK constraints. | Schema |
| 1.3 | Create shared contracts | `packages/shared/src/automation/automation-action.ts` | `AutomationAction` interface con `execute()`, `isRetryable()`, `FailurePolicy`, `timeout`, `maxRetries`, `onFailure`, `ActionContext`, `ActionResult` | Shared |
| 1.4 | Create AiProvider interface | `packages/shared/src/automation/ai-provider.ts` | `AiProvider` interface con `generate()`, `summarize()`, `classify()`, `AiPrompt`, `AiOptions`, `AiResponse`, `AiClassification` | Shared |
| 1.5 | Create SecretStore interface | `packages/shared/src/automation/secret-store.ts` | `SecretStore` interface con `get()`, `set()`, `delete()` | Shared |
| 1.6 | Create AutomationDispatcher interface | `packages/shared/src/automation/automation-dispatcher.ts` | `AutomationDispatcher` interface con `dispatch()`, `ExecutionContext` | Shared |
| 1.7 | Create TriggerRegistry | `packages/shared/src/automation/trigger-registry.ts` | `TriggerDefinition` type, `TRIGGERS` registry with all known triggers, `getTrigger()`, `getTriggersByEvent()` | Shared |
| 1.8 | Create PromptSanitizer interface | `packages/shared/src/automation/prompt-sanitizer.ts` | `PromptSanitizer` interface con `sanitize()`, `validate()`. `SanitizedPrompt` result type. | Shared |
| 1.9 | Create AutomationRule DTO | `packages/shared/src/automation/automation-rule.ts` | `AutomationRuleDto`, `CreateAutomationRuleSchema`, `UpdateAutomationRuleSchema` (Zod) | Shared |
| 1.10 | Create re-export | `packages/shared/src/automation/index.ts`, `packages/shared/src/index.ts` | Export all automation modules. `tsc --noEmit` passes. | Shared |

**Expected Commands:**
```bash
pnpm --filter database prisma validate
pnpm --filter shared tsc --noEmit
```

**Acceptance Criteria:**
- [ ] `prisma validate` pasa con los 4 nuevos modelos
- [ ] `tsc --noEmit` en `packages/shared` sin errores
- [ ] ADR-0007 creado
- [ ] Cada interfaz está en su propio archivo (AiProvider, SecretStore, AutomationDispatcher, AutomationAction, PromptSanitizer)

---

## Phase 2: Engine Core — Service, Dispatcher, Pipeline

**Objetivo:** Implementar el motor central de automatización: `AutomationEngine`,
`SyncDispatcher`, pipeline de ejecución con manejo de fallos, reintentos y
política por acción.

**Dependencias:** Phase 1 (shared contracts)

**Riesgo:** Medio. El pipeline debe manejar correctamente los tres tipos de
política de fallo (RETRY/CONTINUE/ABORT), la diferenciación de errores
retryables, y los timeouts por acción.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 2.1 | Implement SyncDispatcher | `apps/api/src/modules/automation/dispatchers/sync-dispatcher.ts` | Implementa `AutomationDispatcher.dispatch()`. Ejecuta el pipeline secuencialmente en el mismo proceso. Verifica el límite de concurrencia del tenant antes de ejecutar. | Engine |
| 2.2 | Implement AutomationEngine | `apps/api/src/modules/automation/automation.service.ts` | `evaluate(trigger)`: consulta reglas activas para el trigger + tenant. `execute(execution)`: orquesta el pipeline via dispatcher. `canExecute(tenantId)`: verifica cuota de concurrencia. | Engine |
| 2.3 | Implement pipeline executor | `apps/api/src/modules/automation/pipeline-executor.ts` | Ejecuta acciones en secuencia. Por cada acción: verifica timeout, ejecuta, clasifica error, aplica política (RETRY/CONTINUE/ABORT), registra paso. Retry con exponential backoff. | Engine |
| 2.4 | Implement action context builder | `apps/api/src/modules/automation/action-context.builder.ts` | Construye `ActionContext` con `executionId`, `stepId`, `tenantId`, `trigger`, `payload`, `AbortSignal`. | Engine |
| 2.5 | Implement AutomationModule | `apps/api/src/modules/automation/automation.module.ts` | Registra `AutomationEngine`, `SyncDispatcher`, pipeline executor, `SecretStore`, `PromptSanitizer`, `ActionRegistry`. | Wiring |

**Expected Commands:**
```bash
pnpm --filter api lint
pnpm --filter api test automation
pnpm turbo build --filter=api
```

**Acceptance Criteria:**
- [ ] `AutomationEngine.evaluate()` retorna reglas activas por trigger
- [ ] `SyncDispatcher.dispatch()` ejecuta pipeline secuencial
- [ ] Pipeline executor aplica RETRY/CONTINUE/ABORT según la política de cada acción
- [ ] Pipeline executor distingue errores retryables vs no retryables
- [ ] Timeout por acción se respeta (AbortSignal)
- [ ] Límite de concurrencia por tenant se verifica antes de ejecutar

---

## Phase 3: Actions — Built-in Actions + AI Provider

**Objetivo:** Implementar las acciones integradas y la abstracción de IA.

**Dependencias:** Phase 2 (pipeline executor listo para ejecutar acciones)

**Riesgo:** Medio. La abstracción `AiProvider` debe estar correctamente diseñada
para que las acciones de IA nunca dependan de un proveedor concreto.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 3.1 | Implement PromptSanitizer | `apps/api/src/modules/automation/prompt-sanitizer.ts` | Implementa `PromptSanitizer.sanitize()` y `validate()`. System prompt reforzado. Variables de usuario escapadas. Meta-instrucciones limpiadas. | Security |
| 3.2 | Implement SecretStore | `apps/api/src/modules/automation/secret-store.service.ts` | Implementa `SecretStore` con tabla `tenant_secrets` cifrada. `get()` descifra al leer. `set()` cifra al escribir. | Security |
| 3.3 | Implement SendEmailAction | `apps/api/src/modules/automation/actions/send-email.action.ts` | `AutomationAction` que envía email. Obtiene credenciales SMTP de `SecretStore`. `onFailure: 'RETRY'`, timeout 15s. | Action |
| 3.4 | Implement CreateTaskAction | `apps/api/src/modules/automation/actions/create-task.action.ts` | `AutomationAction` que crea tarea en CRM. `onFailure: 'CONTINUE'`, timeout 10s. | Action |
| 3.5 | Implement WebhookAction | `apps/api/src/modules/automation/actions/webhook.action.ts` | `AutomationAction` que ejecuta webhook HTTP. `onFailure: 'RETRY'`, timeout 30s. | Action |
| 3.6 | Implement AiProvider abstraction layer | `apps/api/src/modules/automation/ai/provider-registry.ts` | Registry de proveedores IA. `getProvider(id)`: retorna el `AiProvider` registrado. Los providers se registran via DI. | AI |
| 3.7 | Implement GenerateAIResponseAction | `apps/api/src/modules/automation/actions/generate-ai-response.action.ts` | `AutomationAction` que llama a `AiProvider.generate()`. Prompt sanitizado via `PromptSanitizer` antes de invocar. Idempotency key generada. `onFailure: 'ABORT'`, timeout 60s. | AI |
| 3.8 | Implement SummarizeAction | `apps/api/src/modules/automation/actions/summarize.action.ts` | `AutomationAction` que llama a `AiProvider.summarize()`. `onFailure: 'ABORT'`, timeout 60s. | AI |
| 3.9 | Implement ClassifyTicketAction | `apps/api/src/modules/automation/actions/classify-ticket.action.ts` | `AutomationAction` que llama a `AiProvider.classify()`. `onFailure: 'CONTINUE'` (clasificación no crítica), timeout 30s. | AI |
| 3.10 | Register all actions in module | `apps/api/src/modules/automation/automation.module.ts` | Todas las acciones registradas como providers. ActionRegistry las descubre por DI. | Wiring |

**Expected Commands:**
```bash
pnpm --filter api test automation
pnpm --filter api lint
pnpm turbo build --filter=api
```

**Acceptance Criteria:**
- [ ] `SecretStore.get()` retorna secreto descifrado. `set()` almacena cifrado.
- [ ] `PromptSanitizer` rechaza prompts con intentos de system prompt override
- [ ] `GenerateAIResponseAction` ejecuta con idempotency key
- [ ] `ClassifyTicketAction` llama a `AiProvider.classify()` con las categorías correctas
- [ ] Todas las acciones implementan `isRetryable()` correctamente

---

## Phase 4: Integration — Controller, Event Handlers, Wiring

**Objetivo:** Implementar el CRUD de reglas, los event handlers que conectan
eventos de dominio con el AutomationEngine, y la integración con el resto del
sistema (CoreModule, ActivityTimeline).

**Dependencias:** Phase 2 (engine), Phase 3 (actions)

**Riesgo:** Medio. Los event handlers deben ejecutarse sin bloquear el dominio.
La integración con ActivityTimeline debe ser correcta.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 4.1 | Implement AutomationController | `apps/api/src/modules/automation/automation.controller.ts` | CRUD de reglas: `POST /api/v1/automation/rules`, `GET /api/v1/automation/rules`, `GET /api/v1/automation/rules/:id`, `PATCH /api/v1/automation/rules/:id`, `DELETE /api/v1/automation/rules/:id`. Ejecución manual: `POST /api/v1/automation/rules/:id/execute`. Historial: `GET /api/v1/automation/executions`. | Controller |
| 4.2 | Implement DTOs | `apps/api/src/modules/automation/dto.ts` | `CreateRuleSchema`, `UpdateRuleSchema`, `RuleListQuery`, `ExecutionQuery`. Validación Zod. | DTO |
| 4.3 | Implement event handlers | `apps/api/src/modules/automation/automation.event-handlers.ts` | `@OnEvent('cliente.creado')`, `@OnEvent('cita.confirmada')`, `@OnEvent('cita.cancelada')`, `@OnEvent('pago.recibido')`, `@OnEvent('tarea.overdue')`. Cada handler llama a `AutomationEngine.evaluate(trigger)` con el payload del evento. | Events |
| 4.4 | Wire AutomationModule in CoreModule | `apps/api/src/modules/core/core.module.ts` | Import `AutomationModule` en `CoreModule` | Wiring |
| 4.5 | Wire event bus integration | `apps/api/src/modules/automation/automation.module.ts` | `EventEmitterModule` ya está registrado por SearchModule. AutomationModule solo consume eventos. | Wiring |

**Expected Commands:**
```bash
pnpm --filter api test automation
pnpm --filter api lint
pnpm turbo build --filter=api
```

**Acceptance Criteria:**
- [ ] CRUD de reglas funcional con validación Zod
- [ ] Ejecución manual via endpoint
- [ ] Event handlers reciben eventos de dominio y llaman a `AutomationEngine.evaluate()`
- [ ] Los handlers no bloquean el flujo del dominio (try/catch + log)
- [ ] `GET /api/v1/automation/executions` retorna historial paginado

---

## Phase 5: Testing — Doorbell, Integration, Verification

**Objetivo:** Completar la cobertura de tests de integración, doorbell
(aislamiento multi-tenant) y verificación del registry de acciones/triggers.

**Dependencias:** Phases 1–4

**Riesgo:** Medio. Los doorbell tests requieren base de datos real.

### Tasks

| # | Task | Files | Criterion | Impact |
|---|------|-------|-----------|--------|
| 5.1 | Engine unit tests | `apps/api/src/modules/automation/automation.service.spec.ts` | `evaluate()` retorna reglas correctas. `canExecute()` respeta límite de concurrencia. Pipeline ejecuta acciones en orden. | Testing |
| 5.2 | Dispatcher unit tests | `apps/api/src/modules/automation/dispatchers/sync-dispatcher.spec.ts` | `dispatch()` ejecuta pipeline. Rechaza si concurrencia excedida. | Testing |
| 5.3 | Pipeline executor unit tests | `apps/api/src/modules/automation/pipeline-executor.spec.ts` | RETRY con backoff. CONTINUE salta error. ABORT detiene pipeline. Timeout cancel. Retryable vs non-retryable. | Testing |
| 5.4 | Action unit tests | `apps/api/src/modules/automation/actions/__tests__/*.action.spec.ts` | Cada acción con contexto mock. SecretStore mockeado. AiProvider mockeado. | Testing |
| 5.5 | AI idempotency tests | `apps/api/src/modules/automation/actions/__tests__/ai-idempotency.spec.ts` | Mismo executionId + actionId + prompt genera misma idempotency key. Provider no se invoca dos veces. | Testing |
| 5.6 | SecretStore tests | `apps/api/src/modules/automation/secret-store.service.spec.ts` | `set()` + `get()` roundtrip. `delete()` elimina. `get()` de key inexistente retorna null. | Testing |
| 5.7 | PromptSanitizer tests | `apps/api/src/modules/automation/prompt-sanitizer.spec.ts` | System prompt override rechazado. Input válido pasa. Meta-instrucciones limpiadas. | Testing |
| 5.8 | Doorbell — cross-tenant isolation | `apps/api/test/doorbell/automation-cross-tenant-isolation.spec.ts` | Tenant A no puede ver ni ejecutar reglas de Tenant B | Testing |
| 5.9 | Doorbell — cross-tenant execution | `apps/api/test/doorbell/automation-cross-tenant-execution.spec.ts` | Ejecución de regla de Tenant A no afecta datos de Tenant B | Testing |
| 5.10 | Full suite verification | Todas las suites | `pnpm test`, `pnpm lint`, `pnpm turbo build` | Verification |

**Expected Commands:**
```bash
pnpm --filter api test automation
pnpm --filter api lint
pnpm turbo build --filter=api
```

**Acceptance Criteria:**
- [ ] Engine tests: evaluate, canExecute, pipeline execution
- [ ] Dispatcher tests: dispatch, concurrency limit
- [ ] Pipeline tests: RETRY/CONTINUE/ABORT, timeout, retryable errors
- [ ] Action tests: each action with mocked dependencies
- [ ] AI idempotency tests: same key = no duplicate invocation
- [ ] SecretStore tests: encrypt/decrypt roundtrip
- [ ] PromptSanitizer tests: injection rejection, valid pass
- [ ] Doorbell tests: cross-tenant isolation + execution
- [ ] Full suite passes

---

## Verify Readiness

### What Verify will check

| Area | Check |
|------|-------|
| **Working Set Accuracy** | ¿Todos los archivos del Working Set se crearon/modificaron? |
| **Architecture Compliance** | `AutomationEngine` depende de `AutomationDispatcher`. Actions dependen de `AiProvider`, no de proveedores concretos. |
| **Failure Policies** | ¿RETRY/CONTINUE/ABORT funcionan correctamente en pipeline? |
| **Error Classification** | ¿Errores retryables vs no retryables se manejan correctamente? |
| **AI Idempotency** | ¿Misma idempotency key evita invocación duplicada? |
| **Tenant Isolation** | ¿Doorbell tests pasan? |
| **Secret Management** | ¿Secrets cifrados en reposo? |

### Doorbell Tests Expected

| Test | File |
|------|------|
| Cross-tenant rule isolation | `automation-cross-tenant-isolation.spec.ts` |
| Cross-tenant execution isolation | `automation-cross-tenant-execution.spec.ts` |

### Metrics for Archive

| Metric | Expected source |
|--------|----------------|
| Working Set Accuracy | Design → Apply comparison |
| Verify Iterations | Number of Verify/Fix cycles |
| Verify Discoveries | Issues found during Verify (Critical/Major/Minor) |
| Prediction Accuracy | Files, tests, commands, dependencies predicted vs actual |

---

## Resumen

| Métrica | Valor |
|---------|-------|
| **Fases** | 5 |
| **Tareas totales** | 38 |
| **Distribución** | Shared: 10 / Engine: 7 / Actions + AI: 10 / Integration: 5 / Testing: 10 |
| **Riesgo principal** | Pipeline executor debe manejar correctamente 3 políticas de fallo + retryable errors + timeouts |
| **Riesgo secundario** | AI provider abstraction debe estar correctamente diseñada para no acoplar actions a OpenAI |
| **Design respetado** | ✅ Íntegramente. Las 9 mejoras arquitectónicas incluidas. |
