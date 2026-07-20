# Architecture Decisions — SPEC-0016: Notification Center

## Overview

11 decisiones arquitectónicas clave para el Notification Center. El patrón
Definition → Instance → Routing → Delivery con delegación a SPEC-0012 sigue la
misma arquitectura que SPEC-0015 (Workflow Engine). Routing rule-based con
preferences extiende el patrón de Provider registry que ya funciona en SPEC-0011
y SPEC-0012.

---

## Decisions

### AD-001 — Definition Format: JSON + DB Columns

**Status:** Accepted

**Context**

NotificationDefinition necesita almacenar estructura variable (routing rules,
templates) pero también soportar consultas frecuentes por campos fijos
(category, channels, isPublished).

**Decision**

Schema versionado en JSONB para datos variables (rules, template). Columnas
indexadas (tenantId, category, isPublished) para consultas frecuentes. Evita
el overhead de tablas EAV para campos que siempre existen.

**Alternatives Considered**

- **JSON puro en columna única**: Consultas lentas en campos frecuentes sin
  índices específicos.
- **YAML**: Sin soporte nativo en PostgreSQL, requeriría parsing adicional.
- **Tabla completamente normalizada**: Overhead de joins innecesario para campos
  que siempre se consultan juntos.

**Consequences**

Positivas:
- Consultas simples (WHERE, JOIN) en campos indexados.
- Flexibilidad para schema versionado sin migration de columnas.
- Sin dependencias externas de serialización.

Negativas:
- Validación de JSON debe hacerse en aplicación (Zod), no en base de datos.

**Future Evolution**

Si los routing rules se vuelven muy complejos o requieren búsqueda, se puede
extraer a tabla separada `NotificationDefinitionRule`. Por ahora, JSONB es
suficiente.

---

### AD-002 — Definition Immutability After Publish

**Status:** Accepted

**Context**

Una definición de notificación publicada no debe cambiar mientras haya
instancias en curso. Ejemplo: cambiar el template de "cita confirmada" no debe
retroceder y modificar notificaciones ya enviadas.

**Decision**

Las definiciones son inmutables tras publicarse. Al crear una instancia de
notificación, se almacena `contentSnapshot` (copia del contenido resuelto de la
definición en ese momento). Mismo patrón que Workflow Engine (SPEC-0015).

**Alternatives Considered**

- **Tabla NotificationDefinitionVersion separada**: Más complejidad de joins.
  Snapshot en instancia es más simple y garantiza inmutabilidad sin joins.

**Consequences**

Positivas:
- Garantía de que notificaciones históricas no cambian.
- Sin joins para obtener el contenido en el momento de creación.
- Patrón probado en SPEC-0015.

Negativas:
- Duplicaciín de datos (contenido snapshot por cada instancia).

**Future Evolution**

Si el almacenamiento de snapshots crece demasiado, se puede implementar una
tabla `NotificationDefinitionVersion` con referencia desde la instancia, pero
esto añade complejidad sin necesidad actual.

---

### AD-003 — Delivery Delegation to SPEC-0012 Communication Platform

**Status:** Accepted

**Context**

El Notification Center debe enviar notificaciones por email, SMS, push, etc.
Pero no debe conocer ni gestionar proveedores externos. SPEC-0012 ya abstrae
esa capa.

**Decision**

El Notification Center nunca toca proveedores. SPEC-0012 es el único bounded
context autorizado para entrega. La llamada es vía `CommunicationProvider.send()`
con `idempotencyKey` para deduplicación.

**Alternatives Considered**

- **Directo a proveedores**: Acoplamiento, duplicación de lógica de entrega,
  violación de boundaries.

**Consequences**

Positivas:
- Separación limpia de concerns.
- Reutilización de la lógica de entrega de SPEC-0012 (templates, canales,
  throttling a nivel proveedor).
- Si se añade un nuevo canal, solo SPEC-0012 cambia.

Negativas:
- Dependencia cross-SPEC: si SPEC-0012 no soporta `idempotencyKey`, el
  Notification Center no puede garantizar deduplicación. (Resuelto: se añadió
  el campo como requisito.)

**Future Evolution**

Si la latencia de la llamada a SPEC-0012 es un problema, se puede introducir
una cola BullMQ dedicada entre ambos bounded contexts.

---

### AD-004 — Rule-Based Routing with Overrides

**Status:** Accepted

**Context**

El Routing Engine debe decidir por qué canal enviar cada notificación basándose
en prioridad, preferencias del usuario, quiet hours, y reglas de la definición.

**Decision**

Rule-based con overrides configurables por definición. Las reglas se evalúan en
orden: definición → preferencias del usuario → overrides. Las notificaciones
CRITICAL bypassan rate limiting y quiet hours.

**Alternatives Considered**

- **ML-based**: Excesivo para el caso de uso actual. Puede añadirse como
  RoutingStrategy alternativa en el futuro.
- **Static priority matrix**: Inflexible, no permite personalización por usuario.

**Consequences**

Positivas:
- Comportamiento predecible y testeable.
- Configurable por definición y por usuario.
- OCP: nuevas RoutingStrategies se registran sin modificar el engine.

Negativas:
- Las reglas complejas (múltiples condiciones) pueden ser difíciles de
  configurar sin interfaz visual.

**Future Evolution**

Implementar `RoutingStrategy` interface + `RoutingStrategyRegistry` (mismo
patrón que `NodeExecutorRegistry` en SPEC-0015) para permitir estrategias
alternativas (ML-based, A/B testing, etc.)

---

### AD-005 — BullMQ Repeatable + Event Window for Batching

**Status:** Accepted

**Context**

Las notificaciones deben poder agruparse en batches (digest diario, semanal)
y en ventanas configurables. La infraestructura existente usa BullMQ.

**Decision**

BullMQ repeatable jobs para programar digests. Event window para batching:
las notificaciones creadas durante la ventana se agrupan por
`{tenantId}:{batchKey}`. Al cerrar la ventana, el job procesa el grupo.
Misma infraestructura que SPEC-0011/12/13/15.

**Alternatives Considered**

- **Cron jobs nativos**: Sin la gestión de colas que BullMQ ya proporciona.
- **Scheduler en base de datos**: Sin reintentos, sin monitoreo.

**Consequences**

Positivas:
- Workers estateless, escalables horizontalmente.
- Reintentos automáticos en fallo.
- Mismo stack que el resto del ecosistema.

Negativas:
- La ventana de batch introduce latencia (notificaciones no inmediatas).

**Future Evolution**

Configurar el tamaño de ventana por tenant si se detecta que ciertos tenants
necesitan batches más frecuentes.

---

### AD-006 — Preference Storage: EAV Table

**Status:** Accepted

**Context**

Cada usuario puede tener preferencias por categoría de notificación. Las
preferencias pueden crecer (nuevas categorías, nuevos canales). El schema no
debe cambiar por cada nueva preferencia.

**Decision**

Tabla EAV simplificada: `NotificationPreference` con `(tenantId, userId, category)`
como unique constraint. Cada fila representa las preferencias de un usuario para
una categoría (o global si `category IS NULL`). Columnas fijas para los campos
conocidos (enabled, preferredChannels, quietHours, digestFrequency).

**Alternatives Considered**

- **JSONB columna**: Sin restricciones de unicidad a nivel DB, validación más
  compleja.
- **Documento separado**: Overhead de almacenamiento y consulta.

**Consequences**

Positivas:
- Consultas simples: `WHERE tenantId = ? AND userId = ? AND category = ?`.
- Sin schema migration por nueva preferencia.
- Unique constraint evita duplicados.

Negativas:
- Nullable `category` no permite partial unique index en Prisma (se maneja
  en capa de aplicación con upsert).

**Future Evolution**

Si las preferencias crecen a >10 campos, considerar migrar a documento JSONB o
tabla separada por tipo de preferencia.

---

### AD-007 — IdempotencyKey + DB Unique Constraint for Deduplication

**Status:** Accepted

**Context**

El caller (Workflow Engine, Automation) puede reintentar `createNotification()`
en caso de timeout o error de red. Sin deduplicación, cada reintento crea una
notificación duplicada.

**Decision**

`idempotencyKey` opcional en create + `ON CONFLICT (idempotency_key) DO NOTHING`
a nivel DB. Si el mismo `idempotencyKey` se reusa, la operación es no-op y
retorna la notificación existente. `notificationId` + state check en delivery:
si ya DELIVERED, no-op.

**Consequences**

Positivas:
- Sin duplicados aunque el caller reintente.
- El receptor no recibe el mismo mensaje dos veces.
- Sin dependencia de Redis para deduplicación (aunque Redis puede usarse como
  caché adicional).

Negativas:
- La `idempotencyKey` debe ser generada por el caller, que debe garantizar
  unicidad.

**Future Evolution**

Si el volumen de reintentos es alto, cachear `idempotencyKey` en Redis con TTL
para evitar la consulta a DB en cada reintento.

---

### AD-008 — Webhook + Polling Fallback for Receipts

**Status:** Accepted

**Context**

SPEC-0012 entrega la notificación y debe notificar el resultado al Notification
Center. Si el webhook de callback falla, no debe perderse el receipt.

**Decision**

Webhook como mecanismo primario: SPEC-0012 llama a un endpoint del Notification
Center cuando entrega. Polling periódico como fallback: un job BullMQ consulta
los receipts pendientes.

**Alternatives Considered**

- **Solo polling**: Latencia innecesaria en el caso normal.
- **Solo webhook**: Riesgo de pérdida si el webhook falla.

**Consequences**

Positivas:
- Baja latencia en el caso normal (webhook).
- Resiliencia: el polling recupera receipts perdidos.

Negativas:
- El polling añade complejidad operativa (job recurrente, estado pendiente).

**Future Evolution**

Si los webhooks son fiables al 99.9%+, reducir la frecuencia del polling o
eliminarlo.

---

### AD-009 — Sliding Window for Throttling

**Status:** Accepted

**Context**

Cada usuario y canal tiene un límite de notificaciones por minuto/hora. El
throttling debe evitar ráfagas sin ser demasiado restrictivo.

**Decision**

Sliding window en Redis o DB. Ventana deslizante por usuario y canal. Las
notificaciones CRITICAL severity bypassan el rate limiting.

**Alternatives Considered**

- **Token bucket**: Más complejo de implementar sin Redis.
- **Fixed window**: Permite ráfagas al inicio/final de la ventana.
- **Leaky bucket**: Suaviza pero añade latencia innecesaria.

**Consequences**

Positivas:
- Distribución uniforme de notificaciones en el tiempo.
- Sin ráfagas en los bordes de ventana.

Negativas:
- Requiere Redis para alto rendimiento (en DB es más lento).

**Future Evolution**

Si el throttling es cuello de botella, migrar a Redis completamente con
`INCR` + `EXPIRE` para operaciones O(1).

---

### AD-010 — Content Snapshot on NotificationInstance

**Status:** Accepted

**Context**

Asegurar que las notificaciones históricas muestren el contenido que tenían
en el momento de creación, incluso si la definición cambia después.

**Decision**

`contentSnapshot: Json` en `NotificationInstance` almacena el contenido
resuelto (template + variables) al crear la instancia. Esto evita joins a
una tabla de versiones y garantiza inmutabilidad sin consultas adicionales.

**Alternatives Considered**

- **Tabla NotificationDefinitionVersion separada**: Misma complejidad que
  SPEC-0015, pero para notificaciones el snapshot es más simple y suficiente.

**Consequences**

Positivas:
- Garantía de inmutabilidad sin joins.
- Misma tabla, misma transacción.
- Sin migraciones de schema cuando cambia la definición.

Negativas:
- Duplicación de datos (el snapshot se almacena por instancia).

**Future Evolution**

Si miles de millones de notificaciones hacen que el almacenamiento de snapshots
sea prohibitivo, implementar una tabla `NotificationDefinitionVersion` con
referencia desde la instancia.

---

### AD-011 — Double-Checkpoint Preference Evaluation

**Status:** Accepted

**Context**

El usuario puede cambiar sus preferencias (desactivar email, activar quiet
hours) después de que una notificación haya sido creada pero antes de que sea
enviada. Las notificaciones programadas deben respetar el cambio.

**Decision**

Dos checkpoints de evaluación:
- **CHECKPOINT A (creación)**: Evalúa si la categoría está habilitada y
  selecciona canales preferidos. Si está deshabilitada, la notificación se
  cancela inmediatamente.
- **CHECKPOINT B (delivery)**: Re-evalúa preferencias y quiet hours. Si el
  usuario deshabilitó la categoría desde la creación, la notificación se
  cancela. Si está dentro de quiet hours, se reprograma.

`preferencesLastCheckedAt` en la instancia registra cuándo se evaluó por
última vez.

**Alternatives Considered**

- **Evaluación solo en creación**: Las notificaciones programadas ignoran
  cambios de preferencias. UX pobre.
- **Evaluación solo en delivery**: Las notificaciones claramente no deseadas
  (categoría deshabilitada) se crean innecesariamente.

**Consequences**

Positivas:
- Las preferencias se respetan en todo momento.
- Las notificaciones no deseadas no se crean (CHECKPOINT A).
- Los cambios de preferencias afectan a notificaciones pendientes (CHECKPOINT B).
- Audit trail completo con `preferencesLastCheckedAt`.

Negativas:
- Dos evaluaciones por notificación (costo computacional bajo).
- Las notificaciones atómicas (enviadas inmediatamente) solo pasan CHECKPOINT A.

**Future Evolution**

Si el volumen de notificaciones es muy alto, cachear las preferencias del
usuario en Redis para que CHECKPOINT B sea O(1) sin consulta DB.

---

## Related Artifacts

- [design.md](design.md)
- [tasks.md](tasks.md)
- [verify-report.md](verify-report.md)
- [archive-report.md](archive-report.md)
- [pr-description.md](pr-description.md)

---

## Navigation

← [pr-description.md](pr-description.md) | — →
