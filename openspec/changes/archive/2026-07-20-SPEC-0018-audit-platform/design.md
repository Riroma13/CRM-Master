# Design: SPEC-0018 — Audit & Compliance Platform

> **Versión template:** 1.0
> **SDD Compliance:** v2.1 (Feature Frozen)
> **Enterprise Design Standard:** ACTIVE
> **Platform Baseline:** sdd-v2.1-baseline
> **Estado:** Refined per Architecture Review
> **Reference:** Architecture Review `architecture-review.md` — Verdict REJECTED → Refined per 13 findings (4 blocking, 9 high-severity)

---

## 1. Executive Summary

CRM-Master carece de un registro de auditoría con garantías de inmutabilidad
y cumplimiento normativo. Activity Timeline (SPEC-0017) registra historia de
negocio, pero no proporciona integridad criptográfica, retención configurable
por compliance, legal hold, ni soporte para frameworks como GDPR, SOC2 o
ISO-27001. Los eventos de seguridad (autenticación, autorización, cambios de
permisos) se registran de forma dispersa o no se registran en absoluto.

**Audit Platform** es el sistema de registro para eventos de seguridad y
cumplimiento. Almacenamiento append-only con integridad criptográfica
(per-tenant hash chain con secuencia monotónica), retención configurable por
tenant, legal hold por fila (no por partición), redacción criptográfica para
GDPR, exportación de evidencia, y soporte para frameworks de compliance.
Es independiente de Activity Timeline — nunca mezcla responsabilidades.

El impacto esperado es proporcionar evidencia de auditoría defendible,
satisfacer requisitos regulatorios (GDPR, SOC2, ISO-27001), y dar a los
tenants control sobre sus políticas de retención sin comprometer la
inmutabilidad de los registros.

---

## 2. Technical Approach

El Audit Platform se organiza en cinco capas:

1. **Audit Publisher** — interfaz compartida en `packages/shared/` para que
   cualquier módulo publique eventos de auditoría. Nunca escribe directamente
   en la base de datos.

2. **Audit Ingestion** — consumidor asíncrono (BullMQ) que recibe eventos,
   valida schema, calcula hash de integridad (SHA-256 sobre el contenido +
   prevHash + secuencia monotónica), y persiste en tabla append-only.
   La inserción usa `INSERT ... ON CONFLICT (tenantId, sequence) DO NOTHING`
   para prevenir forks en la cadena de hash. El estado de la cadena se
   mantiene en `tenant_audit_state` para O(1) lookup. Eventos malformados
   van a DLQ.

3. **Audit Storage** — tabla `audit_events` append-only con columna `prevHash`,
   `hash`, y `sequence` formando una cadena de hash por tenant.
   La inmutabilidad se enforced via tres mecanismos:
   - Prisma middleware que intercepta `update`/`delete` y lanza excepción
   - PostgreSQL trigger `BEFORE UPDATE OR DELETE` que lanza excepción
   - DB role separation: `audit_app` (INSERT + SELECT), `audit_admin` (DROP PARTITION)
   Partición por mes.

4. **Compliance Engine** — evalúa eventos contra políticas de compliance
   (GDPR, SOC2, ISO-27001). Genera `ComplianceViolation` cuando se detecta
   una brecha. Las políticas son plugables via `ComplianceRule` interface.
   También soporta `ExpectationRule` para detectar eventos faltantes
   (e.g., "todo login debe tener un mfa_check en 5 minutos").
   La evaluación es **per-tenant**, nunca cross-tenant batch.

5. **Retention Engine** — aplica políticas de retención por tenant.
   Soporta legal hold por fila (`legalHold`, `legalHoldUntil`),
   archive (particiones a cold storage), purge (DELETE con filtro
   `legal_hold = false`), y redacción criptográfica para GDPR
   (metadata overwrite preservando la cadena de hash).

```
Module ──→ AuditPublisher.publish(event)
               │
               ▼
       Audit Ingestion (BullMQ)
               │
           [Validate schema + required fields]
               │
           [Deduplicate by eventId — ON CONFLICT DO NOTHING]
               │
           [Load tenant_audit_state → sequence counter]
               │
           [Compute SHA-256 hash chain]
               │    prevHash = lastEvent.hash OR genesisHash(tenantId)
               │    sequence = lastSequence + 1
               │    currHash = H(content + prevHash + sequence)
               │
           [Persist in transaction]
               │    INSERT INTO audit_events (..., prevHash, hash, sequence)
               │      ON CONFLICT (tenant_id, sequence) DO NOTHING
               │    UPDATE tenant_audit_state SET lastHash = currHash,
               │      lastSequence = sequence, lastEventId = eventId,
               │      lastOccurredAt = occurredAt WHERE tenantId = ?
               │
           [Append-only enforcement gate]
               │    Prisma middleware blocks UPDATE/DELETE on AuditEvent
               │    PostgreSQL trigger blocks UPDATE/DELETE at DB level
               │    DB role audit_app has INSERT + SELECT only
               │
               ▼
       Compliance Engine ──→ ComplianceViolation (if triggered)
               │    ExpectationRule detects missing events
               │    Per-tenant evaluation, never cross-tenant batch
               │
               ▼
       Retention Engine ──→ Archive / Purge / Redact / Legal Hold
               │
               ▼
       Audit API ←── Search + Export + Evidence
```

---

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Storage model | Append-only SQL, Event store, Document DB, Blockchain | **Append-only PostgreSQL + hash chain** | Misma base que el plataforma. Sin dependencias externas. Hash chain proporciona integridad criptográfica sin blockchain. |
| Integrity | Blockchain, SHA-256 chain, Digital signatures, No integrity | **SHA-256 hash chain per tenant con secuencia monotónica** | Cada evento almacena `prevHash`, `hash`, y `sequence`. La cadena permite detectar manipulación de registros históricos. La secuencia `(tenantId, sequence)` con unique constraint previene forks. Sin overhead de PoW. |
| Hash chain fork prevention | Lock, Sequence-based, Tenant-sharded queues | **Sequence-based + `(tenantId, sequence)` unique constraint** | `tenant_audit_state` mantiene contador atómico. `INSERT ON CONFLICT DO NOTHING` con unique `(tenantId, sequence)` previene forks a nivel DB. Retry automático del worker si falla. |
| Genesis hash | `"0000..."`, `sha256(tenantId + secret)` | **`SHA-256(tenantId + AUDIT_CHAIN_SECRET + "genesis")`** | Determinístico por tenant. `AUDIT_CHAIN_SECRET` es env variable, NUNCA cambia. Previene ambigüedad del primer evento. |
| Ingestion | Síncrono, Asíncrono (BullMQ), Híbrido | **Asíncrono (BullMQ)** | Misma infraestructura que SPEC-0011/12/13/14/15/16/17. Los módulos publican sin esperar persistencia. |
| Append-only enforcement | Application-level, Prisma middleware, DB trigger, RLS, All | **Prisma middleware + PostgreSQL trigger + DB role separation** | Capas redundantes. Middleware protege en ORM, trigger protege en DB, roles limitan privilegios. `audit_app` tiene solo INSERT+SELECT. `audit_admin` (retention engine) tiene DROP PARTITION via raw SQL. |
| Legal hold | Row-level flag, Partition flag, Separate table | **Row-level (`legalHold` + `legalHoldUntil`) + `AuditEventLegalHold`** | Sin contaminación cruzada entre tenants. Una retención de un tenant no retiene datos de otros. La tabla de legal hold permite gestión bulk por tenant. |
| GDPR deletion | Partition drop, Row delete, Cryptographic redaction | **Cryptographic redaction con recálculo de hash** | La fila sobrevive para preservar la cadena criptográfica. Metadata se marca `_redacted: true` y solo retiene campos no sensibles. Prisma middleware se bypasea via `__internalRedact` flag. La cadena continúa verificable. |
| Retention | Cascade delete, Partition drop, TTL index, Custom engine | **Partition drop (admin) + Retention Engine (row-level purge)** | Las particiones mensuales se dropean solo por `audit_admin` via SQL raw. Purge de filas individuales respeta `legal_hold = false`. Sin cascade delete. |
| Compliance evaluation | Real-time, Batch (cron), On-query | **Batch (BullMQ cron)** | La evaluación de compliance es post-persistence. No bloquea la ingestion. Las violaciones se detectan en ventanas regulares. Evaluación per-tenant, nunca cross-tenant batch. |
| Compliance data access | Direct DB, Service call, Context interface | **`ComplianceContext`** | Interface que proporciona `getTenantConfig()`, `queryEvents()`, `getPolicy()`. Permite evaluación cross-system sin acoplamiento directo. |
| Missing event detection | N/A, ExpectationRule | **`ExpectationRule` interface** | Corre periódicamente, no por evento. Detecta patrones ausentes (e.g., login sin mfa_check). |
| Export | JSON, CSV, HIPAA format, Custom | **JSON + CSV (pluggable Exporter)** | Formato estándar. Los exporters son plugables via `AuditExporter` interface. |
| Search | PostgreSQL full-text, Elasticsearch, Columnar | **BRIN en `occurredAt` + B-tree en `(tenantId, occurredAt DESC)`** | BRIN óptimo para chronological append-only. B-tree para queries por tenant. BRIN en `tenantId` no proporciona beneficio — usar B-tree para queries de tenant. Elasticsearch es extensión futura. |
| `ComplianceViolation.eventId` | FK constraint, String reference | **String reference (sin FK)** | Violaciones pueden referenciar eventos eliminados por partition purge. Sin FK constraint. Query handling debe account para missing event data. |
| Compliance engine isolation | Cross-tenant batch, Per-tenant iteration | **Per-tenant iteration** | El `ComplianceEngine` itera tenants y evalúa reglas individualmente scoped. Marcar como `sdd-apply-pro` por tocar aislamiento de tenant. |

---

## 4. Data Flow

```
Publish audit event:

Module → AuditPublisher.publish({
  tenantId, eventId, actorType, actorId,
  resourceType, resourceId, action, outcome,
  ipAddress, userAgent, correlationId,
  occurredAt, metadata
})
       │
       ├── Queue in BullMQ (audit:ingestion)
       └── Return (async)

Ingest audit event:

BullMQ worker picks up event
       │
       ├── Validate schema
       │     ├── INVALID → DLQ
       │     └── VALID → continue
       │
       ├── Deduplicate by eventId — ON CONFLICT (event_id) DO NOTHING
       │
       ├── Lock tenant_audit_state row for this tenantId
       │
       ├── Read tenant_audit_state for current sequence
       │     ├── FIRST EVENT → prevHash = SHA-256(tenantId + AUDIT_CHAIN_SECRET + "genesis")
       │     │                 sequence = 1
       │     └── EXISTING   → prevHash = state.lastHash
       │                     sequence = state.lastSequence + 1
       │
       ├── Compute hash chain:
       │     currentHash = SHA-256(content + prevHash + sequence)
       │
       ├── ATOMIC TRANSACTION:
       │     ├── INSERT INTO audit_events (..., prevHash, hash, sequence)
       │     │     ON CONFLICT (tenant_id, sequence) DO NOTHING
       │     │     ├── SUCCESS → continue
       │     │     └── DUPLICATE (fork detected) → ROLLBACK, retry from start
       │     │
       │     └── UPDATE tenant_audit_state
       │           SET lastHash = currentHash,
       │               lastSequence = sequence,
       │               lastEventId = eventId,
       │               lastOccurredAt = occurredAt
       │           WHERE tenantId = tenantId
       │
       ├── Append-only enforcement gate (active on all paths):
       │     ├── Prisma middleware intercepts update/delete → throws
       │     ├── PostgreSQL trigger BEFORE UPDATE OR DELETE → raises exception
       │     └── DB role audit_app permits INSERT+SELECT only
       │
       └── Acknowledge

GDPR redaction flow:

Admin or Retention Engine
       │
       ├── Call redactEvent(eventId, tenantId, fieldsToRedact)
       │     ├── Uses internalAuditPrisma with __internalRedact flag
       │     ├── Bypasses Prisma middleware intentionally
       │     └── Executes raw SQL UPDATE (bypasses ORM entirely)
       │
       ├── Transaction:
       │     ├── Read current event (prevHash, hash, sequence)
       │     ├── Update metadata = { "_redacted": true, "_redactedAt": "...",
       │     │     "retainedFields": ["tenantId","eventType","action","outcome","occurredAt"] }
       │     ├── Recalculate: newHash = SHA-256(redactedContent + prevHash + sequence)
       │     ├── UPDATE audit_events SET metadata = ..., hash = newHash WHERE id = eventId
       │     └── UPDATE tenant_audit_state SET lastHash = newHash WHERE tenantId = tenantId
       │
       └── Chain remains verifiable from genesis through redacted event

Compliance evaluation (scheduled, per-tenant):

BullMQ cron job
       │
       ├── Iterate tenants with active compliance policies
       │
       ├── For each tenant:
       │     ├── Load new events since last evaluation
       │     ├── Build ComplianceContext (tenant config, event query, policy)
       │     ├── Run each ComplianceRule
       │     │     ├── PASS → no action
       │     │     └── FAIL → create ComplianceViolation
       │     │
       │     └── Run each ExpectationRule
       │           ├── PASS → no action
       │           └── FAIL (missing event pattern detected) → create ComplianceViolation
       │
       └── Update last evaluated timestamp per tenant

Retention enforcement (scheduled):

BullMQ cron job
       │
       ├── For each tenant with retention policy
       │     ├── Query events WHERE occurredAt < cutoff AND legal_hold = false
       │     ├── DELETE (via audit_admin role, raw SQL)
       │     ├── Archive old partitions (detach → cold storage)
       │     └── Log retention action
       │
       └── (Partition-level legal hold removed — row-level hold only)

Audit query:

Client → GET /api/v1/audit/events?tenantId=...&dateFrom=...
       │
       ├── Filter by tenantId (mandatory)
       ├── Filter by optional params
       ├── Apply BRIN index on occurredAt + B-tree on (tenantId, occurredAt DESC)
       ├── Return paginated results
       └── Each result includes hash + prevHash + sequence for integrity verification
```

---

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `packages/database/prisma/schema.prisma` | Modify | Add `AuditEvent`, `AuditPolicy`, `AuditEventLegalHold`, `tenant_audit_state`, `ComplianceRule`, `ComplianceViolation`, `ExpectationRule` models |
| 2 | `packages/shared/src/audit/audit.types.ts` | Create | Event types: AuditEvent, AuditActor, AuditResource, Outcome |
| 3 | `packages/shared/src/audit/audit-publisher.ts` | Create | `AuditPublisher` interface |
| 4 | `packages/shared/src/audit/compliance.types.ts` | Create | ComplianceRule, ComplianceViolation, ComplianceFramework, ComplianceContext, ExpectationRule |
| 5 | `packages/shared/src/audit/retention.types.ts` | Create | RetentionPolicy, LegalHold, ArchivePolicy |
| 6 | `packages/shared/src/audit/index.ts` | Create | Re-export |
| 7 | `apps/api/src/modules/audit/audit.module.ts` | Create | NestJS module |
| 8 | `apps/api/src/modules/audit/audit.service.ts` | Create | Ingestion + hash chain + query logic |
| 9 | `apps/api/src/modules/audit/audit.controller.ts` | Create | Audit API |
| 10 | `apps/api/src/modules/audit/ingestion/ingestion.service.ts` | Create | BullMQ consumer + sequence-based chain |
| 11 | `apps/api/src/modules/audit/compliance/compliance-engine.ts` | Create | Compliance evaluation (per-tenant) |
| 12 | `apps/api/src/modules/audit/retention/retention-engine.ts` | Create | Retention + legal hold + GDPR redaction |
| 13 | `apps/api/src/modules/audit/guards/audit.guard.ts` | Create | Tenant isolation |
| 14 | `apps/api/src/modules/audit/middleware/audit-append-only.middleware.ts` | Create | Prisma middleware blocking update/delete on AuditEvent |
| 15 | `apps/api/src/modules/audit/database/audit-db-roles.sql` | Create | SQL migration: create audit_app, audit_admin roles + trigger |

### 5.2 Secondary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 16 | `apps/api/src/modules/audit/compliance/rules/gdpr-rule.ts` | Create | GDPR compliance rule |
| 17 | `apps/api/src/modules/audit/compliance/rules/soc2-rule.ts` | Create | SOC2 compliance rule |
| 18 | `apps/api/src/modules/audit/compliance/expectation-rules/login-mfa-rule.ts` | Create | ExpectationRule: login debe tener mfa_check en 5 min |
| 19 | `apps/api/src/modules/audit/export/export.service.ts` | Create | Audit export |
| 20 | `apps/api/src/modules/audit/export/exporters/json-exporter.ts` | Create | JSON export format |
| 21 | `apps/api/src/modules/audit/export/exporters/csv-exporter.ts` | Create | CSV export format |
| 22 | `apps/api/src/modules/audit/integrity/integrity-verifier.ts` | Create | Hash chain verification |
| 23 | `apps/api/src/modules/audit/redaction/redaction.service.ts` | Create | GDPR redaction preserving chain |
| 24 | `apps/api/src/modules/audit/retention/legal-hold.service.ts` | Create | Row-level legal hold management |
| 25 | `apps/api/src/modules/core/core.module.ts` | Modify | Import AuditModule |

### 5.3 Expected NOT to Change

- Activity Timeline (SPEC-0017) — responsabilidad separada
- Cualquier módulo de negocio — modificados solo para añadir `AuditPublisher.publish()`
- Frontend — SPEC separada

---

## 6. Read Order

1. `packages/shared/src/audit/audit.types.ts` — tipos base
2. `packages/shared/src/audit/audit-publisher.ts` — interfaz de publicación
3. `packages/shared/src/audit/compliance.types.ts` — compliance
4. `packages/shared/src/audit/retention.types.ts` — retención
5. `packages/database/prisma/schema.prisma` — modelo existente
6. `apps/api/src/modules/audit/ingestion/ingestion.service.ts` — ingestion
7. `apps/api/src/modules/audit/middleware/audit-append-only.middleware.ts` — enforced immutable
8. `apps/api/src/modules/audit/database/audit-db-roles.sql` — DB roles + trigger
9. `apps/api/src/modules/audit/audit.service.ts` — core
10. `apps/api/src/modules/audit/compliance/compliance-engine.ts` — compliance
11. `apps/api/src/modules/audit/retention/retention-engine.ts` — retención
12. `apps/api/src/modules/audit/redaction/redaction.service.ts` — redacción GDPR

---

## 7. Expected Commands

```bash
pnpm --filter database prisma migrate dev --name add_audit_tables
pnpm --filter database generate
pnpm --filter api test audit
pnpm turbo build --filter=api
```

---

## 8. Design Confidence

**Confidence:** High

El patrón append-only con hash chain SHA-256 es la arquitectura estándar
para auditoría inmutable (similar a Amazon CloudTrail, Google Cloud Audit).
La secuencia monotónica por tenant con unique constraint `(tenantId, sequence)`
previene forks en workers concurrentes. Las tres capas de append-only
enforcement (Prisma middleware + DB trigger + roles) son defensa en profundidad.
La ingesta asíncrona con BullMQ sigue el mismo patrón que SPEC-0017.
La separación de responsabilidades con Activity Timeline está claramente
definida con matriz de decisión. Compliance plugable via `ComplianceRule`
y `ExpectationRule` interfaces extiende OCP.

---

## 9. Exploration Budget

| Resource | Budget | Notes |
|----------|--------|-------|
| Repo searches | 4 | Patrones de publicación en módulos existentes |
| Files to read | 5 | Schema, shared contracts de otras SPEC |
| Files to create | 25 | Module, service, controller, ingestion, compliance, retention, guards, export, integrity, middleware, redaction, legal hold, DB roles |
| Files to modify | 2 | schema.prisma, core.module.ts |

---

## 10. Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Hash chain verificación computacionalmente cara en queries | Media | Medio | La verificación se hace bajo demanda (endpoint `/audit/integrity`), no en cada query. `tenant_audit_state` cachea el último hash por tenant. |
| Compliance rules falsos positivos | Alta | Medio | Las reglas son configurables. Los falsos positivos se marcan como revisados sin eliminar la violación. |
| Sequence collision entre workers requiere retry | Media | Bajo | `INSERT ON CONFLICT DO NOTHING` detecta la colisión. El worker retry automáticamente con la secuencia actualizada. El overhead es <10ms por colisión. Probabilidad baja con workers bien configurados. |
| GDPR redaction no satisface requerimiento legal de borrado completo | Baja | Alto | La estrategia de redacción se documenta explícitamente en la política de compliance. Si se requiere borrado completo, existe un proceso de excepción formal documentado. |
| Rendimiento BRIN index vs volumen | Baja | Medio | BRIN en `occurredAt` es óptimo para append-only chronological. B-tree en `(tenantId, occurredAt DESC)` para queries de tenant. Si degrada, migrar a columnar (ClickHouse) como extensión. |

---

## 11. Testing Strategy

| Layer | Focus | Approach |
|-------|-------|----------|
| Unit — Hash chain | SHA-256 computation, prevHash linking, sequence-based fork prevention, tamper detection | Jest |
| Unit — Compliance | Rule evaluation, violation creation, framework filters, ComplianceContext | Jest |
| Unit — ExpectationRule | Missing event detection patterns | Jest |
| Unit — Retention | Policy application, row-level legal hold, partition management | Jest |
| Unit — Redaction | GDPR redaction preserves chain, redacted event verification | Jest |
| Unit — Append-only middleware | Prisma middleware throws on update/delete, bypass via __internalRedact | Jest |
| Integration — API | Event query, export, integrity verification | supertest |
| Integration — Ingestion | BullMQ → validation → dedup → sequence → persist → tenant_audit_state | Jest + BullMQ mock |
| Doorbell | Tenant A events no visibles para Tenant B | E2E |
| Doorbell — Append-only | UPDATE/DELETE fails on audit_events via ORM, trigger, and role | E2E |
| Doorbell — Redaction | After redaction, the hash chain is still verifiable | E2E |

---

## 12. Doorbell Tests

| Test file | What it proves |
|-----------|----------------|
| `audit-cross-tenant-isolation.spec.ts` | Tenant A cannot see Tenant B's audit events or compliance violations |
| `audit-append-only.spec.ts` | No DELETE or UPDATE operations succeed on audit_events — via Prisma middleware, PostgreSQL trigger, and DB role |
| `audit-redaction-chain-verification.spec.ts` | After GDPR redaction, the hash chain remains verifiable from genesis through the redacted event |
| `audit-sequence-fork-prevention.spec.ts` | Concurrent inserts for the same tenant produce different sequences — unique constraint (tenantId, sequence) prevents forks |

---

## 13. Required ADRs

| ADR | Reason | Status |
|-----|--------|--------|
| ADR-0014 | Documentar la arquitectura del Audit Platform: hash chain con secuencia monotónica, append-only enforcement (middleware + trigger + roles), row-level legal hold, redacción GDPR, matriz de boundaries con Activity Timeline, compliance framework, y ExpectationRule. | Proposed |

---

## 14. Boundaries

| Boundary | Owner | Purpose |
|----------|-------|---------|
| `AuditEvent` (storage) | AuditModule | Almacenamiento append-only inmutable con hash chain + secuencia monotónica |
| `tenant_audit_state` (state) | AuditModule | Estado de la cadena por tenant: lastHash, lastSequence, lastEventId, lastOccurredAt |
| `AuditPublisher` (contract) | AuditModule | Interfaz de publicación para todos los módulos |
| `ComplianceEngine` | AuditModule | Evaluación de reglas de compliance (per-tenant) |
| `ExpectationRule` | AuditModule | Detección de eventos faltantes |
| `RetentionEngine` | AuditModule | Políticas de retención + row-level legal hold + redacción GDPR |
| `IntegrityVerifier` | AuditModule | Verificación de hash chain |
| `AuditExporter` | AuditModule | Exportación de evidencia |
| `AuditAppendOnlyMiddleware` | AuditModule | Prisma middleware que bloquea update/delete en AuditEvent |
| `AuditDBRoles` | AuditModule | `audit_app` (INSERT+SELECT), `audit_admin` (DROP PARTITION via raw SQL) |
| `AuditDBTrigger` | AuditModule | PostgreSQL trigger `block_audit_event_mutation()` |
| Activity Timeline | ActivityModule (SPEC-0017) | Historia de negocio — responsabilidad separada |
| Event production | Respective modules | Cada módulo publica sus propios eventos de auditoría |

### Activity Timeline vs Audit Platform — Decision Matrix

| Action type | Platform | Rationale |
|-------------|----------|-----------|
| `login`, `logout`, `authenticate` | **Audit only** | Evento de seguridad/autenticación |
| `authorize`, `deny` | **Audit only** | Decisión de autorización |
| `role.assign`, `role.revoke` | **BOTH** | Cambio de permiso (seguridad) + cambio de perfil de usuario (actividad de negocio) |
| `permission.create`, `permission.delete` | **Audit only** | Cambio en matriz de permisos |
| `tenant.config.change` | **Audit only** | Cambio de configuración crítica del tenant |
| `user.create`, `user.delete` | **BOTH** | Creación/borrado de usuario (seguridad + actividad administrativa) |
| `user.update` (datos personales) | **Activity only** | Actualización de perfil de usuario |
| `workflow.started`, `workflow.completed`, `workflow.failed` | **Activity only** | Progreso de flujo de negocio |
| `document.created`, `document.updated` | **Activity only** | Operaciones CRUD de documentos |
| `document.export` | **Audit only** | Exportación de datos (posible fuga) |
| `export` (any resource) | **Audit only** | Exportación de datos |
| `purge` | **Audit only** | Eliminación masiva de datos |
| `notification.sent` | **Activity only** | Notificación enviada |
| `payment.processed` | **Activity only** | Transacción de pago |
| `cita.created`, `cita.rescheduled` | **Activity only** | Gestión de citas |
| `integration.sync.completed` | **Activity only** | Sincronización con integración externa |
| `api.key.created`, `api.key.revoked` | **Audit only** | Gestión de credenciales API |
| `api.access.denied` | **Audit only** | Intento de acceso no autorizado a API |
| `automation.triggered` | **Activity only** | Automatización ejecutada |
| `system.backup`, `system.restore` | **Audit only** | Operaciones del sistema |
| `compliance.violation.detected` | **Audit only** | Propio del Audit Platform |

**Rule:** Security/access/compliance events → Audit. Business domain events → Activity Timeline.
Dual-relevant (e.g., role assignment, user creation) → BOTH. Module authors use the matrix above.

---

## 15. Extensibilidad

| Future feature | How it fits | Effort |
|----------------|-------------|--------|
| New compliance framework | Implementar `ComplianceRule` + registrar en registry. Sin cambios en engine. | Days |
| New retention policy | Implementar `RetentionPolicy` interface. Sin cambios en engine. | Days |
| New export format | Implementar `AuditExporter` interface. Sin cambios en API. | Days |
| ClickHouse storage backend | Implementar `AuditStorage` interface. Sin cambios en ingestion o API. | Weeks |
| Real-time compliance alerts | Añadir `AlertHandler` al ComplianceEngine. Sin cambiar reglas existentes. | Days |
| New ExpectationRule | Implementar `ExpectationRule` interface. Sin cambios en compliance engine. | Days |
| PKI digital signatures | Añadir firma asimétrica opcional al hash chain. Sin cambios en estructura existente. | Weeks |
| RFC 3161 timestamping | Añadir sello de tiempo firmado a `AuditExporter`. | Weeks |

---

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor | 10× (1B eventos/año) | 100× (10B eventos/año) | Mitigation |
|--------|---------------------|------------------------|------------|
| Storage | ~500 GB/año | ~5 TB/año | Partición mensual. Archive mensual a cold storage. |
| Write throughput | ~1K/s | ~10K/s | BullMQ workers paralelos. Sequence-based insert evita locks de tabla. |
| Sequence collision retry | <1% de inserts | <5% | `INSERT ON CONFLICT DO NOTHING` + retry automático. Overhead insignificante. |
| `tenant_audit_state` lookup | <1ms | <2ms | O(1) por PK `tenantId`. Cached en worker memory. |
| Hash chain computation | <1ms por evento | <2ms | SHA-256 en Node.js es rápido. `tenant_audit_state` cachea prevHash. |
| Query by date range | <100ms | <500ms | BRIN index en `occurredAt`. B-tree en `(tenantId, occurredAt DESC)`. Partición pruning. |
| Integrity verification | <1s por 10K eventos | <10s | Bajo demanda. No bloquea writes ni reads. |

**Decision:** El modelo append-only con `tenant_audit_state` y secuencia monotónica escala horizontalmente. El unique constraint `(tenantId, sequence)` previene forks sin locks pesados. Los retrys por colisión de secuencia son raros (<1%) y automáticos.

### B. Open/Closed Principle (OCP)

**Point of extension:** `ComplianceRule`, `ExpectationRule`, `RetentionPolicy`, `AuditExporter`.

**What must change to add a new compliance rule:** Implementar `ComplianceRule` interface + registrar en `ComplianceRuleRegistry`. Cero cambios en ingestion o engine.

**What must change to add a new expectation rule:** Implementar `ExpectationRule` interface + registrar en `ExpectationRuleRegistry`. Cero cambios en compliance engine.

**What must change to add a new retention policy:** Implementar `RetentionPolicy` interface. Cero cambios en retention engine.

**What must change to add a new export format:** Implementar `AuditExporter` interface. Cero cambios en API.

### C. Ownership

| Data / Capability | Owner | Consumers |
|-------------------|-------|-----------|
| Audit events (storage) | AuditModule | Compliance, Retention, Export, Integrity |
| `tenant_audit_state` | AuditModule | Ingestion (hash chain) |
| AuditPublisher (contract) | AuditModule | All modules (publish) |
| Append-only enforcement | AuditModule | Compliance (audit trail integrity) |
| Compliance rules | AuditModule | ComplianceEngine |
| Expectation rules | AuditModule | ComplianceEngine |
| Retention policies | AuditModule | RetentionEngine |
| GDPR redaction | AuditModule | RetentionEngine, Admin API |
| Activity events | ActivityModule (SPEC-0017) | Timeline API |

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
|------|----------|---------|----------|
| Audit events | Configurable (default 1 year) | Partition detach mensual | `DELETE WHERE occurredAt < cutoff AND legal_hold = false` |
| Compliance violations | Same as audit events | With partition | With events |
| Legal hold records | Indefinido (until released) | No aplica | Solo por release explícito |
| `tenant_audit_state` | Indefinido | No aplica | Solo si se elimina el tenant |
| Redacted events | Same as base retention | With partition | Redacted events are NOT deleted — they survive to preserve chain |
| DLQ events | 90 días | — | Eliminar >90 días |

**GDPR Deletion Strategy:**
- **Default path:** Cryptographic redaction. The event row survives with metadata `"_redacted": true`. Only non-sensitive fields are retained (`tenantId`, `eventType`, `action`, `outcome`, `occurredAt`). The hash chain is recalculated and remains verifiable.
- **Tradeoff documented:** "GDPR right to deletion is satisfied by redaction, not full erasure. The row survives to preserve the cryptographic chain. If full erasure is legally required, a formal exception process is documented."
- **Exception process:** If full erasure is legally mandated, a formal exception request is filed. Upon approval, the row is deleted and the chain gap is documented as a compliance exception.

### E. Idempotency

| Operation | Duplicate risk | Protection |
|-----------|---------------|------------|
| `publish()` | Alta (retry del caller) | `eventId` UUID + `ON CONFLICT (event_id) DO NOTHING` |
| `ingestion()` (hash chain) | Alta (worker retry) | `INSERT ON CONFLICT (tenant_id, sequence) DO NOTHING` — secuencia previene duplicados |
| `compliance.evaluate()` | Media | Track `lastEvaluatedId` por tenant para evitar re-evaluar |
| `retention.apply()` | Baja | Idempotent by design — `DELETE WHERE` condition es determinística |
| `redact()` | Baja | `_redacted` flag previene doble redacción |
| `legalHold.apply()` | Baja | Upsert en `AuditEventLegalHold` — idempotente |

### F. Shared Contracts

| Contract | Location | Consumers |
|----------|----------|-----------|
| `AuditEvent` | `packages/shared/src/audit/` | Publisher, Ingestion, API |
| `AuditPublisher` | `packages/shared/src/audit/` | All modules |
| `ComplianceRule` | `packages/shared/src/audit/` | ComplianceEngine, Rules |
| `ExpectationRule` | `packages/shared/src/audit/` | ComplianceEngine |
| `ComplianceContext` | `packages/shared/src/audit/` | ComplianceRule, ExpectationRule |
| `RetentionPolicy` | `packages/shared/src/audit/` | RetentionEngine |
| `AuditExporter` | `packages/shared/src/audit/` | ExportService |

### G. Partitioning Strategy

`audit_events` se particiona por mes. Cada partición contiene eventos de un mes, con su propio BRIN index. Las particiones > retention window se archivan (detach + move to cold storage).

**Legal hold:** Row-level únicamente. No existe partition-level hold. Un tenant en hold NO retiene datos de otros tenants en la misma partición. La purga de filas usa `DELETE WHERE legal_hold = false`.

**Partition management:** Solo `audit_admin` role ejecuta DROP PARTITION via raw SQL (Prisma ORM bypass). El retention engine usa queries con role `audit_admin` para purgar.

**Redacción:** Los eventos redactados se mantienen en su partición original. No se mueven. La cadena de hash se recalcula post-redacción.

---

## 16. Interfaces / Contracts

```typescript
// ─── Core Audit Types ────────────────────────────

export type ActorType = 'user' | 'system' | 'integration' | 'workflow' | 'admin' | 'api';

export type ResourceType =
  | 'user' | 'role' | 'permission' | 'tenant' | 'configuration'
  | 'workflow' | 'notification' | 'document' | 'integration'
  | 'automation' | 'communication' | 'auth' | 'api';

export type Action =
  | 'create' | 'read' | 'update' | 'delete'
  | 'login' | 'logout' | 'authenticate'
  | 'authorize' | 'deny'
  | 'assign' | 'revoke'
  | 'start' | 'complete' | 'fail'
  | 'export' | 'import' | 'purge';

export type Outcome = 'success' | 'failure' | 'denied' | 'error';

export interface AuditActor {
  type: ActorType;
  id: string;
  displayName?: string;
}

export interface AuditResource {
  type: ResourceType;
  id: string;
  displayName?: string;
}

export interface AuditEvent {
  id: string;                  // UUID eventId
  tenantId: string;
  actor: AuditActor;
  resource: AuditResource;
  action: Action;
  outcome: Outcome;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  occurredAt: string;
  receivedAt: string;
  metadata: Record<string, unknown>;
  sequence: number;            // monotonic per-tenant counter
  hash: string;                // SHA-256 of (content + prevHash + sequence)
  prevHash: string;            // SHA-256 of previous event OR genesisHash
  legalHold: boolean;          // row-level legal hold flag
  legalHoldUntil?: string;     // optional hold expiration
}

export interface AuditPublisher {
  publish(event: Omit<AuditEvent, 'id' | 'receivedAt' | 'hash' | 'prevHash' | 'sequence' | 'legalHold' | 'legalHoldUntil'>): Promise<{ eventId: string }>;
}

// ─── Compliance Types ────────────────────────────

export type ComplianceFramework = 'gdpr' | 'soc2' | 'iso27001';

export interface ComplianceContext {
  getTenantConfig(tenantId: string): Promise<TenantConfig>;
  queryEvents(query: AuditQuery): Promise<AuditEvent[]>;
  getPolicy(tenantId: string): Promise<RetentionPolicy>;
}

export interface ComplianceRule {
  readonly name: string;
  readonly framework: ComplianceFramework;
  evaluate(context: ComplianceContext): Promise<ComplianceViolation[]>;
}

export interface ExpectationRule {
  readonly name: string;
  readonly framework: ComplianceFramework;
  evaluate(context: ComplianceContext): Promise<ComplianceViolation[]>;
}

export interface ComplianceViolation {
  id: string;
  tenantId: string;
  ruleName: string;
  framework: ComplianceFramework;
  eventId: string;             // string reference, NOT FK — may reference deleted events
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: string;
  resolvedAt?: string;
}

// ─── Tenant Audit State ──────────────────────────

export interface TenantAuditState {
  tenantId: string;
  lastEventId: string;
  lastHash: string;
  lastSequence: number;
  lastOccurredAt: string;
}

// ─── Retention Types ────────────────────────────

export interface RetentionPolicy {
  tenantId: string;
  retentionDays: number;
  archiveAfterDays: number;
  purgeAfterDays: number;
}

export interface LegalHoldEntry {
  id: string;
  tenantId: string;
  reason: string;
  fromDate: string;
  toDate: string;
  createdAt: string;
  releasedAt?: string;
}

// ─── Export Types ───────────────────────────────

export interface AuditExporter {
  readonly format: string;
  export(events: AuditEvent[]): Promise<Buffer | string>;
  contentType: string;
}

// ─── Redaction Types ────────────────────────────

export interface RedactionRequest {
  eventId: string;
  tenantId: string;
  reason: string;
  requestedBy: string;
}

// ─── Audit Query Types ──────────────────────────

export interface AuditQuery {
  tenantId: string;
  eventTypes?: string[];
  dateFrom?: string;
  dateTo?: string;
  actions?: string[];
  actorIds?: string[];
  resourceIds?: string[];
  outcomes?: string[];
  cursor?: string;
  limit?: number;
}
```

```prisma
// ─── TenantAuditState ───────────────────────────
model TenantAuditState {
  tenantId      String   @id @map("tenant_id")
  lastEventId   String   @map("last_event_id")
  lastHash      String   @map("last_hash")
  lastSequence  Int      @map("last_sequence")
  lastOccurredAt DateTime @map("last_occurred_at")

  @@map("tenant_audit_state")
}

// ─── AuditEvent ──────────────────────────────────
model AuditEvent {
  id            String   @id
  tenantId      String   @map("tenant_id")
  sequence      Int                                 // monotonic per-tenant
  actorType     String   @map("actor_type")
  actorId       String   @map("actor_id")
  actorName     String?  @map("actor_name")
  resourceType  String   @map("resource_type")
  resourceId    String   @map("resource_id")
  resourceName  String?  @map("resource_name")
  action        String
  outcome       String
  ipAddress     String?  @map("ip_address")
  userAgent     String?  @map("user_agent")
  correlationId String?  @map("correlation_id")
  occurredAt    DateTime @map("occurred_at")
  receivedAt    DateTime @default(now()) @map("received_at")
  metadata      Json     @default("{}")
  hash          String   // SHA-256(content + prevHash + sequence)
  prevHash      String   // SHA-256(prev) or genesisHash
  legalHold     Boolean  @default(false) @map("legal_hold")
  legalHoldUntil DateTime? @map("legal_hold_until")

  @@unique([tenantId, sequence])
  @@index([tenantId, occurredAt(sort: Desc)])
  @@index([tenantId, actorType, actorId, occurredAt(sort: Desc)])
  @@index([tenantId, resourceType, resourceId, occurredAt(sort: Desc)])
  @@index([tenantId, action, outcome, occurredAt(sort: Desc)])
  @@index([tenantId, correlationId])
  @@index([occurredAt], type: Brin)
  @@map("audit_events")
}

// ─── AuditEventLegalHold ─────────────────────────
model AuditEventLegalHold {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  reason    String
  fromDate  DateTime @map("from_date")
  toDate    DateTime @map("to_date")
  createdAt DateTime @default(now()) @map("created_at")
  releasedAt DateTime? @map("released_at")

  @@index([tenantId])
  @@index([tenantId, releasedAt])
  @@map("audit_event_legal_holds")
}

// ─── AuditRetentionPolicy ────────────────────────
model AuditRetentionPolicy {
  id               String   @id @default(uuid())
  tenantId         String   @unique @map("tenant_id")
  retentionDays    Int      @default(365) @map("retention_days")
  archiveAfterDays Int?     @map("archive_after_days")
  purgeAfterDays   Int?     @map("purge_after_days")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  @@map("audit_retention_policies")
}

// ─── ComplianceViolation ─────────────────────────
model ComplianceViolation {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  ruleName    String   @map("rule_name")
  framework   String
  eventId     String   @map("event_id")  // string reference, NOT FK
  severity    String   @default("medium")
  description String
  detectedAt  DateTime @default(now()) @map("detected_at")
  resolvedAt  DateTime? @map("resolved_at")
  notes       String?

  @@index([tenantId, framework, detectedAt(sort: Desc)])
  @@index([tenantId, severity, detectedAt(sort: Desc)])
  @@map("compliance_violations")
}

// ─── ComplianceExpectationRun ─────────────────────
model ComplianceExpectationRun {
  id            String   @id @default(uuid())
  tenantId      String   @map("tenant_id")
  lastRunAt     DateTime @map("last_run_at")
  lastEventId   String?  @map("last_event_id")

  @@unique([tenantId])
  @@map("compliance_expectation_runs")
}
```

```sql
// ─── DB Roles Migration (audit-db-roles.sql) ─────

-- Create roles
CREATE ROLE audit_app;
CREATE ROLE audit_admin;

-- Grant privileges
GRANT INSERT, SELECT ON audit_events TO audit_app;
GRANT ALL ON audit_events TO audit_admin;          -- includes DROP PARTITION

-- Block trigger
CREATE OR REPLACE FUNCTION block_audit_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only. UPDATE and DELETE are prohibited.'
    USING HINT = 'Use the redaction API for GDPR compliance. Use audit_admin role for partition management.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_block_audit_mutation
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW
  EXECUTE FUNCTION block_audit_event_mutation();
```

```typescript
// ─── Prisma Append-Only Middleware ──────────────
// apps/api/src/modules/audit/middleware/audit-append-only.middleware.ts

import { Prisma } from '@prisma/client';

export function createAuditAppendOnlyMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    // Skip middleware when __internalRedact flag is set (GDPR redaction path)
    if ((params.args as any)?.__internalRedact === true) {
      delete (params.args as any).__internalRedact;
      return next(params);
    }

    if (params.model === 'AuditEvent') {
      if (params.action === 'update' || params.action === 'updateMany' ||
          params.action === 'delete' || params.action === 'deleteMany') {
        throw new Error(
          'AuditEvent is append-only. UPDATE and DELETE are prohibited. ' +
          'Use the redaction service (internalAuditPrisma with __internalRedact flag) ' +
          'for GDPR compliance operations.'
        );
      }
    }

    return next(params);
  };
}
```

```typescript
// ─── Genesis Hash Helper ─────────────────────────

export function computeGenesisHash(tenantId: string): string {
  const secret = process.env.AUDIT_CHAIN_SECRET;
  if (!secret) {
    throw new Error('AUDIT_CHAIN_SECRET environment variable is required');
  }
  const crypto = require('crypto');
  return crypto.createHash('sha256')
    .update(`${tenantId}${secret}genesis`)
    .digest('hex');
}
```

---

## 17. Migration Strategy

### Module Adoption Analysis

The following table lists modules that will consume `AuditPublisher` to emit audit events.
Each module has its own adoption priority, event types, and dual-publish requirements.

| Priority | Module | Event Types | Dual-publish (Audit + Activity) | Notes |
|----------|--------|-------------|----------------------------------|-------|
| P0 | Auth (SPEC-0004) | `login`, `logout`, `authenticate`, `authorize`, `deny` | No — Audit only | Core security events. P0 for compliance. |
| P0 | Role/Permission | `assign`, `revoke`, `create`, `delete` (roles/perms) | Yes — `role.assign` → BOTH | Permission changes are security + activity. |
| P1 | User management | `create`, `delete` (users) | Yes — `user.create` → BOTH | User creation is security + activity. |
| P1 | API management | `api.key.created`, `api.key.revoked` | No — Audit only | Credential management. |
| P2 | Document management | `export` (documents) | No — Audit only | Export tracking for data leakage prevention. |
| P2 | Tenant config | `update` (config) | No — Audit only | Critical config changes. |
| P3 | Integration | `export` (data sync) | No — Audit only | External data export. |
| P3 | Automation | `export` | No — Audit only | Automated data export. |
| P3 | Workflow | `export` | No — Audit only | Workflow data export. |

**Adoption strategy:**
1. Phase 1 (P0): Auth + Role/Permission — implement in first Apply phase.
2. Phase 2 (P1): User management + API management — second Apply phase.
3. Phase 3 (P2): Document + Tenant config — third Apply phase.
4. Phase 4 (P3): Integration + Automation + Workflow — fourth Apply phase.

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 1 | Add audit tables + partitions + DB roles + trigger | Bajo | `DROP TABLE` (sin datos aún) + `DROP ROLE` + `DROP TRIGGER` |
| 2 | Create shared contracts + AuditPublisher | Bajo | Revertir commit |
| 3 | Implement Audit Ingestion (BullMQ worker + `tenant_audit_state` + sequence-based hash chain) | Bajo | Desactivar workers. Eventos en cola se mantienen. |
| 4 | Implement append-only middleware (Prisma + DB trigger + roles) | Bajo | Quitar middleware, drop trigger, revert roles |
| 5 | Implement AuditService + Audit API | Bajo | Sin datos aún, devuelve vacío. |
| 6 | Implement ComplianceEngine + ComplianceRules + ExpectationRules | Bajo | Sin violaciones hasta que se activen. |
| 7 | Implement GDPR redaction service | Bajo | Sin eventos redactados aún. |
| 8 | Implement RetentionEngine + row-level legal hold | Medio | Configurar políticas ANTES de que venza la primera partición. |
| 9 | Wire AuditModule en CoreModule | Bajo | Quitar del imports |
| 10 | Phase 1 adoption: Auth + Role/Permission modules adopt AuditPublisher | Medio | Cada módulo se adopta individualmente. Rollback por módulo. |
| 11 | Phase 2 adoption: User + API modules | Medio | Rollback por módulo. |
| 12 | Phase 3 adoption: Document + Tenant config | Medio | Rollback por módulo. |
| 13 | Phase 4 adoption: Integration + Automation + Workflow | Medio | Rollback por módulo. |

---

## 18. Open Questions

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| 1 | ¿Hash chain por tenant o global? | **Resolved** | **Por tenant con secuencia monotónica.** La cadena por tenant aísla la criptografía. El `prevHash` del primer evento usa `SHA-256(tenantId + AUDIT_CHAIN_SECRET + "genesis")`. `AUDIT_CHAIN_SECRET` es env variable. `(tenantId, sequence)` unique constraint previene forks. |
| 2 | ¿Soporte para firmas digitales asimétricas (PKI) además de SHA-256? | Open | Recomendación: no en MVP. SHA-256 hash chain es suficiente para integridad. PKI como extensión futura. |
| 3 | ¿Cumplimiento GDPR: right to deletion implica romper la hash chain? | **Resolved** | **No.** Se usa redacción criptográfica en lugar de borrado de fila. Metadata se marca `_redacted: true`. Sólo campos no sensibles se retienen. La cadena de hash se recalcula y sigue siendo verificable. La fila sobrevive para preservar la cadena. Tradeoff documentado. Si borrado completo es requerido legalmente, existe proceso de excepción formal. |
| 4 | ¿Exportación de evidencia con sello de tiempo (timestamping RFC 3161)? | Open | Recomendación: no en MVP. Añadir timestamping firmado como extensión de `AuditExporter`. |

---

> **Fin del documento.**
> **Enterprise Design Standard SDD v2.1.** Refinado por Architecture Review — 13 findings resueltos (4 blocking, 9 high-severity).
