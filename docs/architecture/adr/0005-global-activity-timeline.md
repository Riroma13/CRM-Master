# ADR-0005 — Global Activity Timeline (Publisher / Event Bus)

- **Número ADR:** ADR-0005
- **Fecha:** 2026-07-18
- **Autor:** Sistema
- **Estado:** Accepted

---

## 1. Contexto

CRM-Master no tiene una fuente única de auditoría funcional. Actualmente:

- `EventoBitacora` solo captura eventos técnicos vinculados a sistemas.
- Cada módulo registra actividad de forma distinta (o no la registra).
- No hay una línea de tiempo unificada por cliente, usuario o entidad.

Se necesita un **Activity Timeline** que:

- Concentre toda la actividad relevante del CRM en una sola tabla.
- Sea la fuente única de verdad para auditoría funcional.
- Permita timelines por cliente, usuario, sistema, incidencia, documento y global.
- Sea extensible sin modificar el timeline al añadir nuevos módulos.

## 2. Decisión

> **Decidimos** implementar un patrón **Publisher → ActivityTimeline** con una
> tabla `activity_events` de tipo append-only log, **porque** es el modelo más
> simple que cumple los requisitos de auditoría, consulta por entidad y
> extensibilidad, **aceptando que** el timeline depende de que cada módulo
> llame explícitamente a `publish()` y que no hay garantía absoluta de
> cobertura de eventos sin una estrategia de verificación.

### Contrato del evento

El contrato vive en `packages/shared/src/activity-timeline/` y es la ÚNICA
fuente compartida para productores y consumidores:

```typescript
// packages/shared/src/activity-timeline/event-envelope.ts
export interface ActivityEventEnvelope {
  eventType: string;        // 'modulo.accion' — registry en event-types.ts
  tenantId: string;
  clienteId?: string;
  entityType: string;       // 'cliente' | 'sistema' | 'documento' | ...
  entityId?: string;
  actor: string;
  sourceModule: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: string;         // 'crm' | 'scheduling' | 'communication' | 'automation' | 'auth'
  payload: Record<string, unknown>;
}
```

### Registry de event types

`packages/shared/src/activity-timeline/event-types.ts` contiene TODOS los
eventos conocidos como un `const enum` o Zod union. Añadir un nuevo evento
requiere únicamente añadirlo a este archivo. Sin modificar el timeline.

### Principio de publicación

No todo cambio en base de datos es un evento de actividad.

**Publican** — operaciones con significado de negocio:
- Creación de entidad (cliente, sistema, documento, incidencia, presupuesto)
- Cambio de estado (incidencia resuelta, presupuesto aceptado, documento firmado)
- Acción de usuario (inicio de sesión, cambio de contraseña)
- Evento del sistema (automatización ejecutada, email enviado)
- Interacción con cliente (encuesta respondida, pago recibido)

**NO publican** — operaciones técnicas sin valor de auditoría:
- Lecturas (GET)
- Cambios internos de proceso (cron ticks, cache invalidation)
- Cambios de entidades del sistema sin impacto funcional (config de módulo)
- Operaciones batch sin entidad específica

### Idempotencia

Cada `publish()` acepta un `eventId` opcional (UUID v4 generado por el
productor). El timeline hace `INSERT ... ON CONFLICT (eventId) DO NOTHING`.
Si el productor reintenta con el mismo `eventId`, el segundo publish es
silenciosamente ignorado. Si no se proporciona `eventId`, el timeline genera
uno automáticamente (sin idempotencia).

```sql
-- Si eventId se proporciona:
INSERT INTO activity_events (event_id, ...) VALUES ($1, ...)
ON CONFLICT (event_id) DO NOTHING;
```

### Particionado

La tabla `activity_events` se particiona por rango de fechas (mensual):

```sql
CREATE TABLE activity_events (
  id BIGSERIAL,
  event_id UUID,
  tenant_id UUID NOT NULL,
  ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE activity_events_2026_07 PARTITION OF activity_events
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
-- Las particiones se crean mensualmente via cron o pg_partman
```

Los índices compuestos con `tenantId` + `created_at DESC` cubren el 90% de
las queries. Las particiones mensuales mantienen cada segmento manejable.

### Política de retención

| Periodo | Acción |
|---------|--------|
| 0–12 meses | Online, consultable vía API |
| 12–24 meses | Archivado a tabla fría `activity_events_archive` (misma estructura, sin particionar) |
| >24 meses | Eliminado (retención máxima) |

La tabla fría no está expuesta en la API pública. Si se necesita consultar
datos históricos, se hace mediante una query administrada con acceso explícito.

### Open/Closed Principle

El timeline NO debe modificarse para aceptar nuevos publicadores. Se cumple
porque:

1. `event-types.ts` — añadir un nuevo tipo es una línea.
2. `ActivityEventEnvelope` — el contrato es fijo, el `payload` es genérico.
3. `ActivityTimelineService.publish()` — acepta cualquier `envelope` que
   cumpla el contrato; no conoce los tipos concretos.
4. No existe una lista de "módulos autorizados" en el timeline.

El único cambio necesario al añadir un publicador es en el módulo dominio:
llamar a `this.activityTimeline.publish(envelope)`.

## 3. Consecuencias

### Positivas

- Fuente única de auditoría funcional.
- Contrato compartido en `packages/shared/` — evita duplicación de tipos.
- Idempotencia por `eventId` — seguro ante reintentos.
- Particionado mensual — la tabla no degrada con el tiempo.
- OCP respetado — el timeline no sabe qué módulos publican.
- Política de retención explícita.

### Negativas

- Cada módulo debe acordarse de llamar a `publish()`. No hay forma de
  forzarlo desde el timeline (podría ser un middleware NestJS, pero sería
  más complejo).
- `ON CONFLICT DO NOTHING` añade una restricción `UNIQUE` sobre `event_id`
  que puede ser costosa en escritura concurrente alta.
- La partición manual requiere mantenimiento (creación de particiones
  futuras, eliminación de antiguas).

## 4. Alternativas consideradas

### Alternativa A: PostgreSQL LISTEN/NOTIFY + workers asíncronos

- **Pros**: Desacoplamiento total, el timeline nunca ralentiza la operación
  de dominio.
- **Contras**: Complejidad operativa (workers, colas, posible pérdida de
  eventos si el worker cae). No justificado para la carga esperada.
- **Por qué se descartó**: La escritura síncrona a `activity_events` añade
  <5ms por operación. Para la escala de CRM-Master (decenas de operaciones
  por minuto, no miles), la sincronía es adecuada.

### Alternativa B: Event Sourcing puro (tabla de eventos como fuente de verdad)

- **Pros**: Máxima trazabilidad, reconstrucción de estado.
- **Contras**: Cambio radical en la arquitectura de persistencia. No es
  compatible con Prisma ni con el modelo actual. Inviable sin reescribir
  toda la capa de datos.
- **Por qué se descartó**: El timeline es un complemento de auditoría, no
  el sistema de persistencia principal.

### Alternativa C: Un solo `payload TEXT` sin tipado

- **Pros**: Simplicidad máxima, cero mantenimiento de tipos.
- **Contras**: Sin validación, sin descubrimiento, sin safety. Cada
  publicador puede romper el contrato sin que el timeline lo sepa.
- **Por qué se descartó**: El contrato tipado en `packages/shared/` es
  esencial para la mantenibilidad a largo plazo.

## 5. Mitigaciones

- [ ] Crear test de cobertura de eventos en CI: verifica que cada `eventType`
      del registry está cubierto por al menos un test de integración.
- [ ] El `publish()` debe loguear un WARNING si el `eventType` no está en el
      registry (detección temprana de eventos no registrados).
- [ ] Usar `pg_partman` o cron mensual para automatizar la creación de
      particiones.

## 6. Impacto

- **Backend**: Nuevo módulo `ActivityTimelineModule`. Modificaciones en 12+
  módulos de dominio para añadir `publish()`.
- **Base de datos**: Nueva tabla `activity_events` con particionado mensual.
- **Frontend**: No impacta (el timeline UI es PR separado).
- **Infraestructura**: Sin impacto (no hay nuevas colas, workers, ni brokers).

## 7. Referencias

- `openspec/changes/SPEC-0009-global-activity-feed/design.md` — design original.
- `packages/shared/src/activity-timeline/event-envelope.ts` — contrato compartido.
- `docs/architecture/sdd-infrastructure.md` — SDD platform documentation.
