# Architecture Decisions

## Overview

Workflow Engine implementa un motor BPM completo con definiciones de proceso
versionadas e inmutables, instancias duraderas, ejecución asíncrona, nodos de
decisión, paralelismo, timers, espera de eventos, tareas humanas, compensación
(Saga) y recuperación ante fallos. La arquitectura sigue el patrón
Definition → Instance → Execution con nodos type-driven.

## Decisions

### AD-001 — Definition Format: JSON Versionado

**Status:** Accepted

**Context:** El motor necesita un formato de definición de procesos que sea
versionable, fácil de comparar, y sin dependencias externas pesadas.

**Decision:** JSON versionado con schema explícito. Las definiciones se almacenan
como JSON en Prisma con un campo `version` incremental.

**Alternatives Considered:**
- BPMN 2.0 XML: Estándar pero pesado, requiere parser externo.
- YAML: Legible pero menos tipado.

**Consequences:**
- Positivas: Sin dependencias externas. Fácil de versionar y comparar en git.
- Negativas: No es compatible con herramientas BPMN estándar (puente futuro).

**Future Evolution:** BPMN 2.0 import como capa opcional en v2.

---

### AD-002 — Definition Immutability

**Status:** Accepted

**Context:** Una vez que una definición de workflow está en producción, no debe
poder modificarse para no afectar instancias en ejecución.

**Decision:** Una vez publicada (`isPublished: true`), una definición es inmutable.
Los cambios crean una nueva versión. Las instancias en ejecución conservan la
versión con la que empezaron.

**Alternatives Considered:**
- Editable siempre: Riesgo de corrupción de instancias en ejecución.
- Migrar instancias: Complejidad alta, beneficio bajo.

**Consequences:**
- Positivas: Seguridad en ejecución. No hay migración forzada.
- Negativas: Múltiples versiones conviven. Las definiciones antiguas no se borran.

**Future Evolution:** Sistema de deprecación de versiones con alertas a tenants.

---

### AD-003 — Instance Persistence: Tablas Relacionales

**Status:** Accepted

**Context:** Las instancias de workflow necesitan persistencia duradera con
consultas simples por tenant, estado y correlationId.

**Decision:** Tablas relacionales en PostgreSQL via Prisma. Trazabilidad a través
de `WorkflowAudit`.

**Alternatives Considered:**
- Event sourcing: Complejidad alta, no necesario para el alcance actual.
- Graph DB: No justificado para la cardinalidad actual.

**Consequences:**
- Positivas: Consultas simples. Índices eficientes. Scoping automático vía Prisma.
- Negativas: No hay replay de eventos nativo (el audit trail lo compensa).

**Future Evolution:** Particionado mensual para `workflow_instances` y `workflow_audit`.

---

### AD-004 — Node Execution: Asíncrono con BullMQ

**Status:** Accepted

**Context:** La ejecución de nodos no debe bloquear al cliente. El motor debe
escalar horizontalmente.

**Decision:** Cada nodo se ejecuta como un job BullMQ. Workers estateless.
Misma estrategia que SPEC-0011, 0012, 0013, 0014.

**Alternatives Considered:**
- Síncrono: Bloquea al cliente, no escala.
- Híbrido: Complejidad innecesaria.

**Consequences:**
- Positivas: Escalable, resiliente, idempotente.
- Negativas: Latencia adicional de cola. Complejidad de recovery.

**Future Evolution:** Circuit breakers para plataformas externas.

---

### AD-005 — Compensation: Saga Orquestada

**Status:** Accepted

**Context:** Cuando un workflow falla después de pasos parciales, necesita
ejecutar compensaciones en orden inverso.

**Decision:** Saga orquestada por el CompensationEngine. El engine conoce el grafo
completo y ejecuta las compensaciones en orden inverso.

**Alternatives Considered:**
- Saga coreografiada: Las plataformas externas se comunican entre sí (alto
acoplamiento).

**Consequences:**
- Positivas: Control centralizado. Compensaciones idempotentes.
- Negativas: Punto único de fallo para compensación.

**Future Evolution:** Timeout configurable por compensación.

---

### AD-006 — Parallel Split / Join Nativo

**Status:** Accepted

**Context:** El motor necesita soportar paralelismo con semántica fork/join.

**Decision:** Nodos `ParallelSplit` y `ParallelJoin`. Split crea N filas en
`WorkflowActiveBranch`. Join espera que todas las ramas se completen.

**Alternatives Considered:**
- DAG execution: Más flexible pero más complejo.

**Consequences:**
- Positivas: Semántica clara. Join consulta `WorkflowActiveBranch` sin deserializar
JSON.
- Negativas: Solo fork/join simple (no soporta DAG complejo nativamente).

**Future Evolution:** Timeout configurable por ParallelJoin para evitar ramas
huérfanas.

---

### AD-007 — Human Tasks: Tabla + Evento

**Status:** Accepted

**Context:** Los nodos `UserTask` necesitan crear tareas humanas que un operador
resuelve de forma asíncrona.

**Decision:** `WorkflowUserTask` en base de datos. El usuario resuelve via API
`POST /workflow/instances/:id/resume`. El engine reanuda la ejecución.

**Alternatives Considered:**
- Polling: Ineficiente.
- WebSocket: Complejidad adicional de estado.

**Consequences:**
- Positivas: Persistente. Fácil de listar desde Mission Control.
- Negativas: El usuario debe llamar a la API explícitamente.

---

### AD-008 — Timers: BullMQ + DB

**Status:** Accepted

**Context:** Los timers (esperas temporizadas) deben sobrevivir a reinicios del
worker.

**Decision:** BullMQ programa el wake-up como repeatable job. DB guarda timers
pendientes. Job de recovery al iniciar el worker.

**Alternatives Considered:**
- Solo BullMQ: Los timers se pierden si la cola se reinicia.
- Solo DB: No hay wake-up real sin polling.

**Consequences:**
- Positivas: Recovery automático. Wake-up real sin polling.
- Negativas: Dos fuentes de verdad que deben sincronizarse.

---

### AD-009 — Locking: Optimistic con version Field

**Status:** Accepted

**Context:** Múltiples workers pueden intentar ejecutar el mismo nodo
simultáneamente.

**Decision:** Campo `version` en `WorkflowInstance`. Cada escritura incrementa
version. Si el version cambia entre read y write, la transacción falla.

**Alternatives Considered:**
- Pessimistic lock: Requiere conexión DB siempre abierta.
- Distributed lock: Requiere Redis externo.

**Consequences:**
- Positivas: Simple, sin infraestructura adicional.
- Negativas: Write contention bajo alta concurrencia (mitigado con Workers).

---

### AD-010 — Crash Recovery: Polling + Timer Recovery

**Status:** Accepted

**Context:** Si un worker falla, los jobs en ejecución pueden perderse y las
instancias quedar huérfanas.

**Decision:** Al iniciar, el engine busca instancias con steps pendientes y las
reprograma. BullMQ stalled job handling como defensa adicional.

**Alternatives Considered:**
- WAL: Complejidad alta de implementación.
- Event sourcing: Excesivo para el alcance.

**Consequences:**
- Positivas: Simple de implementar. Recupera instancias colgadas.
- Negativas: Ventana de inactividad hasta que el worker se reinicia.

---

### AD-011 — SubWorkflow: Asíncrono con Suspensión

**Status:** Accepted

**Context:** SubWorkflow necesita ejecutar un workflow hijo y reanudar el padre
al completarse, sin bloquear workers.

**Decision:** El padre programa el hijo y se suspende (SUSPENDED). El hijo
completa y emite un evento que reanuda al padre. Mismo patrón que EventWait.

**Alternatives Considered:**
- Síncrono: Bloquea el worker BullMQ.
- Fire-and-forget: El padre no sabe cuándo termina el hijo.

**Consequences:**
- Positivas: Compatible con BullMQ. Patrón probado con EventWait.
- Negativas: Timeout de suspensión necesario (`maxInstanceLifetime`).

---

### AD-012 — Variables Storage: Tabla Separada

**Status:** Accepted

**Context:** Las variables de instancia se escriben frecuentemente. Si estuvieran
en la misma fila que la instancia, habría write contention.

**Decision:** `WorkflowVariable` en tabla separada. Cada variable es una fila
independiente con `@@unique([instanceId, key])`.

**Alternatives Considered:**
- JSON column en `WorkflowInstance`: Write contention alta.
- Redis: Fuera de la arquitectura actual.

**Consequences:**
- Positivas: Escrituras independientes. Consultas por clave eficientes.
- Negativas: Más filas en DB. Consultas con JOIN.

---

### AD-013 — Active Branches: Tabla Separada

**Status:** Accepted

**Context:** ParallelJoin necesita consultar ramas activas. Si estuvieran como
JSON array, cada consulta requeriría deserialización.

**Decision:** `WorkflowActiveBranch` en tabla separada con `branchId`, `status` y
`tenantId`.

**Alternatives Considered:**
- JSON array `currentNodes[]`: Deserialización costosa para joins.
- Sin tracking: Imposible implementar ParallelJoin correctamente.

**Consequences:**
- Positivas: Consultas simples sin deserialización.
- Negativas: Más filas en DB.

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

← [archive-report.md](archive-report.md) | [pr-description.md](pr-description.md) →
