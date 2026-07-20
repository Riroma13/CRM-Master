# Design: SPEC-0013 — Customer Profile Backend & Tests

> **Versión template:** 1.0
> **SDD Compliance:** v2.1 (Feature Frozen)
> **Enterprise Design Standard:** ACTIVE
> **Platform Baseline:** sdd-v2.1-baseline
> **SPEC-0004 heredado:** ARCHIVED (parcial — frontend entregado, backend sin tests)
> **Estado:** Draft

---

## 1. Executive Summary

SPEC-0004 (Ficha de Cliente) implementó el frontend de detalle de cliente y los
módulos backend `EventosModule` + `TareasModule`, pero quedaron pendientes todos
los tests del backend: unitarios (Zod, servicios), integración (endpoints) y
seguridad (aislamiento multi-tenant). El frontend (8 componentes + page) ya está
entregado y no se modificará.

SPEC-0013 completa el ciclo de SPEC-0004 implementando exclusivamente:

- Tests unitarios para schemas Zod (Eventos + Tareas)
- Tests unitarios para servicios (EventosService + TareasService con Prisma mockeado)
- Tests de integración para endpoints (GET/POST eventos, tareas, clientes)
- Tests de seguridad (aislamiento entre tenants, 401/403)
- Cierre SDD completo (Verify + Archive)

Sin cambios en frontend, sin cambios en backend, sin cambios en schema de datos.

---

## 2. Technical Approach

El backend ya está implementado y en producción. Esta SPEC no modifica el backend.
Solo añade cobertura de tests siguiendo el patrón establecido en SPEC-0010,
SPEC-0011 y SPEC-0012: tests con Prisma mockeado para unitarios, supertest para
integración, y doorbell E2E para aislamiento multi-tenant.

Los tests existentes de `dashboard.service.spec.ts`, `clients.service.spec.ts` y
`tenant-dashboard.service.spec.ts` sirven como patrón de referencia para la
estructura de mocks y assertions.

```
Backend existente (sin cambios)
       │
       ▼
Unit tests ──► Zod schemas validation
       │         EventosService (mocked Prisma)
       │         TareasService (mocked Prisma)
       │         ClientsService.findOneOrFail()
       │
Integration ──► GET/POST /api/v1/admin/clientes/:id/eventos
       │         GET/POST /api/v1/admin/clientes/:id/tareas
       │         GET /api/v1/admin/clientes/:id
       │         PATCH /api/v1/admin/clientes/:id
       │
Security ──►  Cross-tenant isolation (doorbell)
                 Cross-client isolation (doorbell)
```

---

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Test framework | Jest, Vitest | **Jest** | Ya configurado en apps/api. Mismo framework que los tests existentes. |
| Prisma mocking | Unit test mock, Testcontainers, Base de datos real | **Unit test mock** | Los tests unitarios usan mock de PrismaService. Los de integración requieren DB real. |
| Integration testing | supertest + Nest TestingModule, HTTP tests | **supertest + TestingModule** | Mismo patrón que SPEC-0009 y SPEC-0010. |
| Doorbell | isolation-gate.spec.ts pattern, E2E HTTP | **Doorbell pattern existente** | Mismo patrón que todos los doorbell tests del proyecto. |
| Frontend tests | Vitest, Testing Library | **No se implementan** | Por decisión explícita: el frontend ya se entregó y no se modifica. |
| Backend modifications | Añadir tests sin modificar backend | **Zero backend changes** | El backend está completo y en producción. Solo tests. |

---

## 4. Data Flow

```
Test execution flow:

1. Unit tests (Jest, mocked Prisma)
        │
        ├── EventosService.findAll()
        │     ├── Mock: prisma.eventoBitacora.findMany → return eventos
        │     ├── Assert: filtros por clienteId, paginación, orden
        │     └── Assert: FK validation (sistemaId pertenece a cliente)
        │
        ├── TareasService.findAll()
        │     ├── Mock: prisma.tarea.findMany → return tareas
        │     ├── Assert: filtros por clienteId, estado, paginación
        │     └── Assert: create with defaults
        │
        └── Zod schema validation
              ├── CreateEventoSchema: valid/invalid payloads
              ├── CreateTareaRapidaSchema: valid/invalid payloads
              └── Partial update schemas

2. Integration tests (supertest + real DB)
        │
        ├── GET /api/v1/admin/clientes/:id
        │     ├── 200 + datos completos (sistemas + items)
        │     └── 404 (inexistente)
        │
        ├── PATCH /api/v1/admin/clientes/:id
        │     ├── 200 + updated fields
        │     └── 404 (inexistente)
        │
        ├── GET /api/v1/admin/clientes/:clienteId/eventos
        │     ├── 200 paginated
        │     └── Empty array when no events
        │
        ├── POST /api/v1/admin/clientes/:clienteId/eventos
        │     ├── 201 created
        │     └── 400 invalid payload
        │
        ├── GET /api/v1/admin/clientes/:clienteId/tareas
        │     ├── 200 filtered
        │     └── Empty array when no tareas
        │
        └── POST /api/v1/admin/clientes/:clienteId/tareas
              ├── 201 created
              └── 400 invalid payload

3. Security tests (doorbell E2E)
        │
        ├── Cross-tenant: Tenant A no puede ver datos de Tenant B
        └── Cross-client: Cliente A no puede ver eventos de Cliente B
```

---

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `apps/api/src/modules/eventos/dto.spec.ts` | Create | Zod schema validation tests |
| 2 | `apps/api/src/modules/eventos/eventos.service.spec.ts` | Create | EventosService unit tests (mocked Prisma) |
| 3 | `apps/api/src/modules/tareas/dto.spec.ts` | Create | Zod schema validation tests |
| 4 | `apps/api/src/modules/tareas/tareas.service.spec.ts` | Create | TareasService unit tests (mocked Prisma) |
| 5 | `apps/api/src/modules/clients/clients.service.spec.ts` | Modify | Add findOneOrFail() test + include sistemas.items test |
| 6 | `apps/api/test/doorbell/customer-profile-cross-tenant.spec.ts` | Create | Cross-tenant isolation doorbell test |

### 5.2 Secondary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 7 | `apps/api/test/integration/customer-profile.spec.ts` | Create | Integration tests for all 6 endpoints |
| 8 | `apps/api/test/doorbell/customer-profile-cross-client.spec.ts` | Create | Cross-client isolation doorbell test |
| 9 | `openspec/changes/SPEC-0004-ficha-cliente/` | Archive | Mover SPEC-0004 a archive al completar SPEC-0013 |

### 5.3 Expected NOT to Change

- `apps/api/src/modules/eventos/` — los archivos de implementación NO se modifican
- `apps/admin-web/src/app/clients/` — frontend existente NO se modifica
- `apps/tenant-web/` — sin cambios
- `packages/database/prisma/schema.prisma` — sin cambios de schema
- `app.module.ts`, `core.module.ts` — sin cambios de wiring
- Existing tests de otros módulos — sin cambios

---

## 6. Read Order

1. `apps/api/src/modules/dashboard/dashboard.service.spec.ts` — patrón de test con mocked Prisma
2. `apps/api/src/modules/eventos/dto.ts` — schemas Zod existentes a testear
3. `apps/api/src/modules/eventos/eventos.service.ts` — service existente a testear
4. `apps/api/src/modules/tareas/dto.ts` — schemas Zod existentes a testear
5. `apps/api/src/modules/tareas/tareas.service.ts` — service existente a testear
6. `apps/api/src/modules/clients/clients.service.ts` — findOneOrFail() existente
7. `apps/api/test/doorbell/isolation-gate.spec.ts` — doorbell pattern existente

---

## 7. Expected Commands

```bash
pnpm --filter api test eventos
pnpm --filter api test tareas
pnpm --filter api test clientes
pnpm --filter api test customer-profile
pnpm --filter api lint
pnpm turbo build --filter=api
```

---

## 8. Design Confidence

**Confidence:** High

Todos los tests siguen patrones ya establecidos en SPEC-0010, SPEC-0011 y
SPEC-0012. Los mocks de Prisma tienen 4 implementaciones de referencia en el
proyecto. Los doorbell tests siguen el mismo patrón de los 6 doorbell tests
existentes. Zero incertidumbre técnica.

---

## 9. Exploration Budget

| Resource | Budget | Notes |
|----------|--------|-------|
| Repo searches | 2 | Patrones de test existentes |
| Files to read | 5 | Schemas, services, doorbell pattern |
| Files to create | 6 | Test files + doorbell |
| Files to modify | 1 | clients.service.spec.ts (extender) |

---

## 10. Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Doorbell tests requieren DB real | Media | Bajo | Skipear si no hay DATABASE_URL. Mismo patrón que SPEC-0010/0011. |
| Tests de integración requieren DB | Media | Bajo | Misma mitigación. Los unitarios cubren la lógica sin DB. |
| clients.service.spec.ts ya existe y puede tener tests previos | Media | Medio | Leer el archivo antes de modificar para no romper tests existentes. |

---

## 11. Testing Strategy

| Layer | Focus | Approach |
|-------|-------|----------|
| Unit — Zod | CreateEventoSchema, EventoListQuery, CreateTareaRapidaSchema, TareaListQuery — valid/invalid payloads | Jest parameterized |
| Unit — EventosService | findAll() con filtros y FK validation, create() con validación de sistemaId, errores | Jest + mocked PrismaService |
| Unit — TareasService | findAll() con filtros y paginación, create() con defaults, errores | Jest + mocked PrismaService |
| Unit — ClientsService | findOneOrFail() lanza NotFoundException para IDs inexistentes | Jest + mocked PrismaService |
| Integration — API | 6 endpoints: happy path, 404, 400, paginación | supertest + TestingModule |
| Security — Cross-tenant | Tenant A no ve datos de Tenant B | Doorbell E2E |
| Security — Cross-client | Cliente A no ve eventos de Cliente B | Doorbell E2E |

---

## 12. Doorbell Tests

| Test file | What it proves |
|-----------|----------------|
| `customer-profile-cross-tenant.spec.ts` | Tenant A no puede acceder a eventos/tareas de Tenant B |
| `customer-profile-cross-client.spec.ts` | Cliente A no puede acceder a eventos de Cliente B dentro del mismo tenant |

---

## 13. Required ADRs

Ninguno. La arquitectura está definida en ADR-0001 y SPEC-0004. Este cambio es
puramente aditivo (tests) y no requiere nuevas decisiones arquitectónicas.

---

## 14. Boundaries

| Boundary | Owner | Purpose |
|----------|-------|---------|
| EventosService tests | Test suite | Validan que EventosService consulta y filtra correctamente |
| TareasService tests | Test suite | Validan que TareasService consulta y crea correctamente |
| Zod schema tests | Test suite | Validan que los schemas aceptan/rechazan payloads correctamente |
| Integration tests | Test suite | Validan que los endpoints responden con los códigos y datos correctos |
| Doorbell tests | Test suite | Validan aislamiento multi-tenant en los endpoints |
| Backend modules | No se modifican | El backend ya está completo y en producción |

---

## 15. Extensibilidad

| Future feature | How it fits | Effort |
|----------------|-------------|--------|
| Frontend tests | Añadir tests Vitest para los componentes existentes | Days |
| Más filtros en eventos/tareas | Añadir tests primero, luego implementar filtros | Hours |
| E2E tests con Playwright | SPEC separada para integración frontend-backend | Weeks |

---

## Architecture Review (MANDATORY)

### A. Scalability

Los tests no afectan la escalabilidad del sistema. Los doorbell tests se ejecutan
bajo demanda con base de datos real. Los unitarios son rápidos (<100ms cada uno).

### B. Open/Closed Principle (OCP)

Los tests son puramente aditivos. No modifican el backend existente.
El OCP se respeta completamente.

### C. Ownership

| Data / Capability | Owner | Consumers |
|-------------------|-------|-----------|
| Test suites | Engineering | CI pipeline, developers |
| Backend modules | Domain modules | No se modifican |
| Doorbell tests | Infrastructure | CI pipeline (gate) |

### D. Data Retention

Los tests no generan datos persistentes. Los doorbell tests limpian sus datos
al finalizar (afterAll).

### E. Idempotency

Los tests son idempotentes: ejecutarlos N veces produce el mismo resultado.
Doorbell tests incluyen cleanup en afterAll.

### F. Shared Contracts

Los tests usan los contratos compartidos existentes (`dto.ts`, tipos de
`packages/shared/`). No se añaden nuevos contratos.

### G. Partitioning Strategy

No aplica. Los tests no requieren particionamiento.

---

## 16. Interfaces / Contracts

No se modifican interfaces ni contratos. Los tests usan los existentes:

```typescript
// CrearEventoSchema (de eventos/dto.ts) — se testea sin modificar
// CrearTareaRapidaSchema (de tareas/dto.ts) — se testea sin modificar
// EventosService (de eventos/eventos.service.ts) — se testea sin modificar
// TareasService (de tareas/tareas.service.ts) — se testea sin modificar
```

---

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 1 | Crear test files (6 archivos) | Bajo | Eliminar archivos |
| 2 | Ejecutar tests unitarios | Bajo | No afecta producción |
| 3 | Ejecutar tests de integración (si hay DB) | Bajo | No afecta producción |
| 4 | Ejecutar doorbell tests (si hay DB) | Bajo | No afecta producción |
| 5 | Archivar SPEC-0004 + SPEC-0013 | Bajo | Revertir archive |

---

## 18. Open Questions

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| 1 | ¿clients.service.spec.ts ya existe? | Open | Verificar antes de modificar. Si existe, extender en lugar de reemplazar. |
| 2 | ¿Frontend tests en SPEC-0013 o en SPEC separada? | **Resolved** | Fuera de alcance. SPEC-0013 es backend-only. |
| 3 | ¿Los doorbell tests deben limpiar datos después de ejecutarse? | **Resolved** | Sí. afterAll debe eliminar los datos de prueba. |

---

> **Fin del documento.**
> **Enterprise Design Standard SDD v2.1.** Pendiente de Architecture Review.
> Próximo paso: Tasks → Apply → Verify → Archive.
