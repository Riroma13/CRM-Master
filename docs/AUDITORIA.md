# Auditoría Técnica — CRM-Master

> **Propósito**: Revisión sistemática para garantizar escalabilidad, mantenibilidad y preparación para salida a producción pública.
> **Metodología**: Revisión línea por línea de cada módulo JS/TS, CSS, infraestructura Docker, API companion, tests y datos.
> **Destinatario**: Arquitecto de software senior.
> **Fecha**: 16 Julio 2026

---

## RESUMEN EJECUTIVO

| Métrica | Valor |
|---|---|
| **Líneas backend** (apps/api) | **9.237** |
| **Líneas frontend tenant-web** | **12.521** |
| **Líneas frontend admin-web** | **4.373** |
| **Líneas paquetes compartidos** | **1.567** (database + generator + shared + ui) |
| **Líneas CSS** | **2 globals.css** (Tailwind utility-first, sin CSS propio significativo) |
| **Módulos backend** | **39** |
| **Endpoints API** | **~120** |
| **Modelos Prisma** | **29** |
| **Tests** | **68 archivos, ~157 API + ~140 frontend, ~170 total estimados** |
| **Rate limiter** | 5/min IP+email, retraso progresivo, bcrypt dummy hash (login) |
| **Contenedores Docker** | 6 (Postgres, Redis, Caddy, API, Tenant-web, Admin-web) |
| **Alertas de seguridad** | 33 hallazgos: **2 HIGH**, 13 MEDIUM, 18 LOW/INFO |
| **Deuda técnica estimada** | Media-alta — **2 críticas, 13 importantes, 18 menores** |

---

## 1. ARQUITECTURA GENERAL

### 1.1 Stack

```
Monorepo: Turborepo + pnpm 9
Backend:  NestJS 11 + Prisma 6 + PostgreSQL 16 (multi-tenant row-level)
Frontend: Next.js 15 + React 19 + Tailwind 4 + shadcn/ui
Auth:     Better-Auth (admin) + jsonwebtoken (client)
Colas:    BullMQ + Redis 7
Infra:    Docker + Caddy + wildcard TLS *.crmmaster.com
Tests:    Jest (API) + Vitest (frontend) + Playwright (E2E)
```

### 1.2 Multi-tenant Architecture

```
                         Host: acme.crmmaster.com
                               │
                    ┌──────────┴──────────┐
                    │  TenantResolve       │
                    │  Middleware          │
                    │  (Host → tenantId)   │
                    └──────────┬──────────┘
                               │ req.tenantId
                    ┌──────────┴──────────┐
                    │  Prisma Client       │
                    │  Extension           │
                    │  (auto-scope)        │
                    └──────────┬──────────┘
                               │ WHERE tenantId = ?
                    ┌──────────┴──────────┐
                    │  29 modelos          │
                    │  20 tenantId-scoped  │
                    │  9 clienteId-scoped  │
                    └─────────────────────┘
```

**Punto fuerte**: Scoping automático vía Prisma `$extends` + generator que lee schema.prisma. Zero listas hardcodeadas.

**Punto débil**: 11 queries raw SQL ($queryRawUnsafe) en admin services que bypassan el scoping.

### 1.3 Auth Dual

| Tipo | Cookie | Guard | JWT |
|---|---|---|---|
| Admin | `__Secure-session` | `BetterAuthGuard` | Better-Auth sessions |
| Cliente | `__Secure-client-session` | `ClientAuthGuard` | jsonwebtoken (7d exp) |

**Punto fuerte**: Login siempre devuelve 401, dummy hash, rate limiting, tiempo constante.

---

## 2. SEGURIDAD — HALLAZGOS

### 🔴 CRÍTICOS (2)

| ID | Hallazgo | Archivo | Impacto |
|---|---|---|---|
| **C1** | **JWT_SECRET hardcodeado como fallback** | `client-auth.service.ts:14` | `CLIENT_JWT_SECRET` sin set → fallback literal `'client-jwt-dev-secret-change-in-prod'`. Quien conozca el string puede forjar JWTs de cliente en producción. **REMEDIACIÓN**: Validar env var al startup y fallar si no está set. |
| **C2** | **CORS wildcard + credentials en producción** | `main.ts` | `CORS_ORIGIN` sin set → `'*'` con `credentials: true`. Cualquier sitio web puede hacer peticiones autenticadas contra la API. **REMEDIACIÓN**: Exigir CORS_ORIGIN explícito en producción. |

### 🟡 IMPORTANTES (13)

| ID | Hallazgo | Impacto |
|---|---|---|
| M1 | **Dev mode bypass**: requests a `/tenant/*` resuelven al primer tenant sin Host header | Solo dev, pero podría confundir pruebas de aislamiento |
| M2 | **`aggregateRaw`/`findRaw` no bloqueados** en Prisma scoped client | Puerta trasera potencial si el adapter postgres los soporta |
| M3 | **Token blacklist sin límite**: `Set<string>` crece infinitamente en logout | Memory leak en producción con muchos logouts |
| M4 | **Rate limiter in-memory**: no comparte estado entre réplicas | Atacante puede hacer 5N intentos con N réplicas |
| M5 | **RateLimitGuard sin cleanup**: `Map` sin `OnModuleDestroy` ni cleanup | Fuga de memoria por tenant visitado |
| M6 | **DTO password min 6 vs service min 8**: inconsistencia | `z.string().min(6)` en DTO, `if (len < 8)` en service |
| M7 | **40+ archivos con `any`/`as any`**: tipado inseguro en cadena auth | Error de tipo no capturable en compilación |
| M8 | **Empty catch blocks**: storage.service.ts, backup.service.ts | Fallos silenciosos en operaciones de archivos |
| M9 | **Sin structured logging**: solo NestJS Logger, sin JSON, sin levels | Imposible agregar logs en producción |
| M10 | **Sensitive data en logs**: stack traces con rutas internas | Exposición de PII en errores |
| M11 | **Helmet sin CSP**: default config, sin Content-Security-Policy | XSS si se renderiza contenido de usuario |
| M12 | **Sin validación de env vars al startup**: fallbacks inseguros | Config errors no detectados temprano |
| M13 | **Cobertura desigual**: 15+ módulos sin tests, incluidos auth y tenants | Riesgo de regresiones silenciosas |

### 🟢 MENORES (18)

Selección de los más relevantes:

| ID | Hallazgo |
|---|---|
| L1 | Cache TTL en middleware nunca se cancela (orphaned timeouts en watch mode) |
| L2 | `as any` en return de `createPrismaClient()` — pierde type safety del cliente |
| L3 | BetterAuthGuard no verifica que la sesión pertenezca al tenant resuelto (mitigado por TenantScopeGuard downstream) |
| L4 | Timing side-channel entre usuario existente y no-existente (progressivo delay antes de dummy hash) |
| L5 | Cero enums en schema — valores String sin validación a nivel DB |
| L6 | Cero `@relation` explícitas en schema — relaciones implícitas frágiles |
| L7 | `console.log` en main.ts — usar Logger de NestJS |
| L8 | Rate limiter compartido entre login y register — un bloqueo afecta ambos |
| L9 | Sin métricas Prometheus ni health checks de dependencias |
| L10 | Sin request ID correlation en logs |

---

## 3. TESTING

### 3.1 Cobertura Actual

| Área | Archivos | Tests |
|---|---|---|
| API unit tests | 24 spec files | 157 tests |
| API E2E (supertest) | 9 test files | ~50 escenarios |
| Tenant-web (Vitest) | 25 test/spec files | ~140 tests |
| Admin-web | 9 test files | ~24 tests |
| Database (scope) | 2 spec files | 13 tests |
| **Total** | **68 archivos** | **~380 tests** |

### 3.2 Módulos SIN Tests

⚠️ **15 módulos backend sin cobertura**:

`admin-tools`, `audit`, `automations`, `communications`, `encuestas`, `eventos`, `incidencias`, `notifications`, `pagos`, `search`, `tenant-clientes`, `tenant-encuestas`, `tenant-incidencias`, `tenant-notificaciones`, `tenant-profile`, `webhooks`

Estos son principalmente módulos CRUD de la vista admin del tenant. La ausencia de tests implica que cualquier refactor o cambio en scoping de tenant podría romperlos silenciosamente.

### 3.3 Doorbell Test (Aislamiento)

✅ Existe: `apps/api/test/doorbell/client-isolation.e2e-spec.ts` — 202 líneas verificando que un tenant no accede a datos de otro.

---

## 4. INFRAESTRUCTURA

### 4.1 Docker Compose

```yaml
Servicios:
  postgres:16-alpine   → puerto 5432
  redis:7-alpine       → puerto 6379
  caddy:2-alpine       → puerto 80/443 (perfil: production)
  api                  → puerto 3001 (perfil: production)
  tenant-web           → puerto 3004 → 3000 (perfil: production)
  admin-web            → puerto 3002 (perfil: production)
```

**Puntos fuertes**:
- Health checks en postgres y redis
- Volúmenes persistentes separados
- Caddy con wildcard TLS
- Servicios de app en perfil `production` (no corren en dev)

**Puntos débiles**:
- Sin `restart: unless-stopped` en los servicios de app (solo en postgres/redis)
- Sin health checks en los servicios NestJS/Next.js
- Sin redes Docker separadas (todo en default)
- Sin límites de recursos (memory/cpu)

### 4.2 Dockerfiles

| App | Líneas | Base |
|---|---|---|
| api | 19 | `node:20-alpine` |
| tenant-web | 36 | `node:20-alpine` (multistage) |
| admin-web | 36 | `node:20-alpine` (multistage) |

Sin Dockerfile para los microservicios BullMQ (workers).

### 4.3 CI/CD

✅ `.github/workflows/ci.yml` con 3 jobs:
- `verify`: `pnpm generate:scope:verify`
- `test-database`: scope + database tests
- `lint`: `pnpm lint`

Sin deploy automatizado, sin stage de integración, sin E2E en CI.

---

## 5. DEUDA TÉCNICA — PRIORIZADA

### Deuda Crítica (pre-producción)

| # | Ítem | Esfuerzo |
|---|---|---|
| 1 | **Validar CLIENT_JWT_SECRET** al startup — fallar si no está configurado | 15 min |
| 2 | **Exigir CORS_ORIGIN explícito** en producción | 15 min |

### Deuda Importante (sprint próximo)

| # | Ítem | Esfuerzo |
|---|---|---|
| 3 | Token blacklist con TTL (ej. Redis o Map con expiración) | 2h |
| 4 | `OnModuleDestroy` en `RateLimitGuard` | 30 min |
| 5 | Unificar validación de password (DTO 6 vs service 8) | 15 min |
| 6 | Reemplazar `any`/`as any` con tipos concretos en auth chain | 4h |
| 7 | Eliminar empty catch blocks en storage/backup | 1h |
| 8 | Agregar structured logging (pino o winston) con JSON output | 3h |
| 9 | Agregar CSP header en Helmet | 1h |
| 10 | Validar env vars al startup con envalid/Joi/Zod | 2h |
| 11 | Separar rate limiter buckets para login vs register | 1h |
| 12 | Agregar tests a módulos CRUD sin cobertura (priorizar tenants, auth) | 8h |
| 13 | Documentar dev-mode bypass (tenant-resolve middleware) | 30 min |

### Deuda Menor

| # | Ítem |
|---|---|
| 14 | Cancelar cache TTL timeouts en middleware |
| 15 | Agregar `@relation` explícitas en schema.prisma |
| 16 | Migrar String enum-like fields a Prisma enums |
| 17 | Reemplazar `console.log` por NestJS Logger |
| 18 | Configurar redes Docker separadas |
| 19 | Agregar health checks a servicios app en docker-compose |
| 20 | Agregar `restart: unless-stopped` a todos los servicios |
| 21 | Configurar Prometheus métricas |
| 22 | Agregar request ID correlation en logs |
| 23 | Documentar env vars faltantes (CLIENT_JWT_SECRET, etc.) |
| 24 | Agregar `.env.example` completo en raíz |
| 25 | Rate limit compartido: documentar decisión register:ip |
| 26 | CSP report-uri para monitoreo de violaciones |

---

## 6. HALLAZGOS POR CAPA

### 6.1 Backend (NestJS) — ✅ Sólido

- Modularidad: 39 módulos con separación clara de concerns
- Guards: 5 guards de auth + tenant scope
- Rate limiting en login y register
- Transacciones atómicas en creación de entidades
- Tests: 24 spec files, 157 tests

⚠️ **11 queries raw SQL** (auque parameterizadas), **15 módulos sin tests**, **tipado `any` generalizado**

### 6.2 Frontend tenant-web — ⚠️ Necesita atención

- Route groups `(admin)/` + `(client)/` correctos
- Middleware Edge con ruteo por cookie
- Portal de cliente funcional
- 25 test files, ~140 tests

⚠️ **Pre-existing failures**: 10 tests fallan (lucide-react mock + calendario), **sidebar test failures** no resueltos

### 6.3 Frontend admin-web — ✅ Correcto

- 6 páginas funcionales (dashboard, clients, systems, inventory)
- Migrado a `@crm-master/ui`
- 9 test files

⚠️ **Funcionalidad limitada**: solo 6 rutas vs 30+ rutas en tenant-web

### 6.4 Paquete UI — ✅ Bien

- Componentes base (Button, Card, Badge, Layout)
- ESM, tree-shakeable
- Tests de primitivas

### 6.5 Database — ✅ Bien

- 29 modelos, 37 índices
- Tenant-scope generator con integridad testeada
- Scoping automático vía Prisma `$extends`
- Migraciones versionadas

### 6.6 Infraestructura — ⚠️ Básica

- Docker compose funcional para producción
- Caddy con wildcard TLS
- Sin monitoreo, sin backup strategy, sin deploy pipeline

---

## 7. RECOMENDACIONES PRE-PRODUCCIÓN

### Imprescindibles (bloqueantes)

1. **🔴 Fijar `CLIENT_JWT_SECRET`** — remover fallback hardcodeado, validar en `onModuleInit`
2. **🔴 Configurar `CORS_ORIGIN` explícito** — validar que no sea `*` en producción
3. 🟡 **Eliminar dummy hash timing gap** — delay progresivo antes de dummy en login
4. 🟡 **Configurar CSP headers** en Helmet
5. 🟡 **Validar env vars al startup** — que no falten secretos

### Altamente recomendados

6. 🟡 **Structured logging** — pino/winston con JSON output
7. 🟡 **Redis-backed rate limiting** — escalar a múltiples réplicas
8. 🟡 **Token blacklist con TTL** — evitar memory leak
9. 🟡 **Tests para módulos CRUD sin cobertura**
10. 🟡 **Health checks reales** (DB, Redis) en docker-compose

---

## 8. CONCLUSIONES

**CRM-Master tiene una arquitectura sólida para producción.** La decisión de usar Prisma `$extends` con generator automático para tenant scoping es el punto más fuerte — zero listas manuales, detection automática de cambios en schema.

**Las 2 alertas HIGH son fáciles de resolver** (JWT fallback + CORS wildcard) y no representan riesgo arquitectónico, solo de configuración.

**La deuda técnica real está en**: (1) cobertura de tests desigual, (2) tipado `any` generalizado, (3) falta de observabilidad estructurada, y (4) rate limiting sin Redis que limita el escalado horizontal.

**Estimación para producción-ready**: ~40h de trabajo técnico distribuido en:
- 2h → blockers HIGH
- 20h → issues MEDIUM prioritarios
- 18h → testing + documentación

---

*Auditoría generada el 16 Julio 2026 — CRM-Master v0.1*
