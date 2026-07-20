# ADR-0007 — AI Automation Hub

- **Número ADR:** ADR-0007
- **Fecha:** 2026-07-19
- **Autor:** Sistema
- **Estado:** Proposed

---

## 1. Contexto

CRM-Master carece de un motor de automatización centralizado. Cada módulo
implementa su propia lógica de notificaciones, recordatorios y acciones
programadas sin un orquestador común. No existe un registro unificado de
automatizaciones, ejecuciones, fallos ni reintentos.

Se necesita un AI Automation Hub que:

- Centralice la definición y ejecución de automatizaciones.
- Soporte triggers event-driven, manuales y programados.
- Ejecute pipelines de acciones (email, tareas, webhooks, IA).
- Proporcione auditoría completa de ejecuciones.
- Permita extender triggers y acciones sin modificar el motor.

## 2. Decisión

> **Decidimos** implementar un motor de automatización con arquitectura de
> registro (Trigger Registry → Action Registry) y pipeline de ejecución
> secuencial con política de fallo delegada a cada acción, **porque**
> desacopla completamente el motor de los triggers y acciones concretos,
> **aceptando que** para alta carga (>100K ejecuciones/día) será necesario
> migrar de `SyncDispatcher` a `BullMQDispatcher`.

### Abstracciones aprobadas

| Abstracción | Propósito |
|-------------|-----------|
| `AutomationAction` | Interfaz que toda acción debe implementar. Declara timeout, maxRetries, onFailure, isRetryable. |
| `AutomationDispatcher` | Desacopla el engine del mecanismo de ejecución. v1: SyncDispatcher. v2: BullMQDispatcher. |
| `AiProvider` | Desacopla las acciones de IA del proveedor concreto (OpenAI, Anthropic, Ollama). |
| `SecretStore` | Almacenamiento cifrado de credenciales. Las acciones nunca contienen API keys. |
| `PromptSanitizer` | Previene prompt injection antes de invocar al AiProvider. |

### Políticas

| Política | Comportamiento |
|----------|---------------|
| Failure policy | Cada acción declara RETRY / CONTINUE / ABORT. El engine delega. |
| Error classification | Retryable (network, timeout) vs Non-retryable (validation, auth). |
| AI Idempotency | `sha256(executionId + actionId + prompt)` como idempotency key. |
| Tenant concurrency | `maxConcurrentExecutions: 5` por tenant. Evita noisy neighbour. |
| Prompt sanitization | Filtro de system prompt override, meta-instrucciones, caracteres de control. |

## 3. Consecuencias

### Positivas

- OCP real: nuevas acciones y triggers sin modificar el motor.
- Acciones de IA desacopladas del proveedor: migrar de OpenAI a Anthropic no requiere cambiar acciones.
- API keys nunca en código: SecretStore gestiona credenciales.
- Ejecución distribuida futura sin cambiar el engine (Dispatcher abstraction).

### Negativas

- SyncDispatcher bloquea el event loop en acciones lentas. Se migrará a BullMQDispatcher cuando la carga lo justifique.
- La tabla `automation_executions` crece rápido. Requiere particionado mensual.
- El PromptSanitizer añade latencia antes de cada invocación de IA (<<100ms, aceptable).

## 4. Alternativas consideradas

### Alternativa A: Workflow Engine (Temporal, Camunda)

- **Pros:** Maduro, escalable, distributed por diseño.
- **Contras:** Infraestructura pesada para la fase actual del producto.
- **Por qué se descartó:** Sobredimensionado. SyncDispatcher + futuro BullMQDispatcher cubren las necesidades.

### Alternativa B: OpenAI directo sin AiProvider abstraction

- **Pros:** Menos código, más rápido de implementar.
- **Contras:** Acoplamiento a OpenAI. Migrar a Anthropic requiere reescribir acciones.
- **Por qué se descartó:** El acoplamiento viola OCP. La abstracción cuesta ~50 líneas y elimina el riesgo.

## 5. Mitigaciones

- [ ] Monitorear longitud de la cola de ejecuciones. Si excede 100 concurrentes, activar BullMQDispatcher.
- [ ] Verificar que ningún secret se loguea en execution history (test de regresión en CI).

## 6. Impacto

- **Backend:** Nuevo módulo `AutomationModule`. 4 nuevas tablas en Prisma.
- **Frontend:** No impacta (SPEC separada).
- **Infraestructura:** Sin cambios (PostgreSQL existente + EventEmitter2 existente).

## 7. Referencias

- `openspec/changes/SPEC-0011-ai-automation-hub/design.md` — Design APPROVED.
- `openspec/changes/SPEC-0011-ai-automation-hub/tasks.md` — Tasks.
- ADR-0004: SDD Feature Freeze.
- ADR-0005: Global Activity Timeline.
