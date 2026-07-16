# Architecture Decision Records — CRM-Master

> Formato: Problema → Contexto → Decisión → Consecuencias
> Estado: ✅ Aceptada | 🔄 Propuesta | ❌ Rechazada
> Total: 7 ADRs

---

## ADR-001: Login retorna siempre 401

| Campo | Valor |
|-------|-------|
| Estado | ✅ Aceptada |
| Fecha | 2026-07-04 |
| Tags | `auth`, `security`, `breaking` |

**Problema**: El login de cliente devolvía 404 (email no existe) vs 401 (contraseña incorrecta), filtrando existencia de usuarios.

**Contexto**: El endpoint `POST /api/v1/client/auth/login` necesitaba unificar la respuesta de error para prevenir enumeración de usuarios por respuesta HTTP.

**Decisión**: Todos los fallos de autenticación devuelven `401 Unauthorized` con mensaje idéntico `"Credenciales inválidas"`. Además:

- Comparación en tiempo constante (dummy hash bcrypt si usuario no existe)
- Rate limiting: 5 intentos/minuto por IP+email
- Retraso progresivo: 0→200→500→1000→2000ms
- Logging interno con email hasheado (SHA-256, sin PII)

**Consecuencias**:
- ✅ Previene enumeración de usuarios por timing o código HTTP
- ✅ Mitiga ataques de fuerza bruta con rate limiting progresivo
- ⚠️ Rate limiter es in-memory por instancia (no escala horizontalmente sin Redis)
- ⚠️ Retraso progresivo se ejecuta antes del dummy hash (timing side-channel menor)

**Archivo**: `apps/api/src/modules/client-auth/client-auth.service.ts`

---

## ADR-002: Tenant scope generado desde schema.prisma

| Campo | Valor |
|-------|-------|
| Estado | ✅ Aceptada |
| Fecha | 2026-07-05 |
| Tags | `architecture`, `schema`, `generation`, `scalability` |

**Problema**: Las listas de modelos con `tenantId`/`clienteId` estaban hardcodeadas en `createPrismaClient()`. La de `clienteId` solo tenía 2 de 9 modelos reales.

**Contexto**: El sistema multi-tenant necesita saber qué modelos tienen `tenantId` y `clienteId` para inyectar automáticamente los filtros en cada query. Mantener listas manuales era frágil y se desactualizaba.

**Decisión**: Crear un generador que lee `schema.prisma` y produce:

- `tenant-models.ts` — listas tipadas de modelos (`TENANT_SCOPED_MODELS`, `CLIENTE_SCOPED_MODELS`, `ALL_MODELS`)
- `tenant-metadata.json` — metadata para CI (comparación deep-equality ignorando timestamp)
- `tenant-scope.spec.ts` — tests de consistencia interna

Si alguien agrega `tenantId` o `clienteId` a un modelo, el sistema se actualiza solo en el próximo `pnpm generate`. CI verifica que los generated files no estén stale via `pnpm generate:scope:verify`.

**Consecuencias**:
- ✅ Zero mantenimiento manual de listas de modelos
- ✅ Detección temprana en CI de modelos no cubiertos
- ⚠️ El generador no es un Prisma generator real — usa regex parsing en vez de DMMF
- ⚠️ Dependencia de `tsx` para ejecutar TypeScript

**Archivo**: `packages/database/prisma/generators/tenant-scope/generator.ts`
**Integrity test**: `packages/database/prisma/generators/tenant-scope/integrity.spec.ts`

---

## ADR-003: Email de ClientUser globalmente único

| Campo | Valor |
|-------|-------|
| Estado | ✅ Aceptada |
| Fecha | 2026-07-05 |
| Tags | `schema`, `auth`, `data-model` |

**Problema**: El modelo `ClientUser` tenía `email @unique` (global) y `@@unique([tenantId, email])` (compuesto). Había ambigüedad sobre cuál mantener.

**Contexto**: En un sistema multi-tenant, se podría argumentar que el email debería ser único solo dentro de cada tenant (una persona podría ser cliente de dos tenants distintos con el mismo email). La decisión tenía implicaciones de producto y de migración.

**Decisión**: Mantener AMBOS constraints:

- `@unique` global — previene colisión de emails entre tenants (una identidad, un email)
- `@@unique([tenantId, email])` — índice compuesto como safety net y para queries por tenant

Si en el futuro se necesita permitir el mismo email en dos tenants, hay que:
1. Hacer migration para sacar el `@unique` global
2. Mantener solo el compuesto

**Consecuencias**:
- ✅ No se puede tener el mismo email en dos tenants distintos
- ✅ El compuesto acelera queries por tenant+email
- ⚠️ Una persona que quiere ser cliente de dos tenants necesita dos emails distintos
- ⚠️ Para self-registration, implica que un email registrado en tenant A no puede registrarse en tenant B (devuelve 409)

**Archivo**: `packages/database/prisma/schema.prisma` (líneas 217-226)

---

## ADR-004: Portal de cliente con route groups

| Campo | Valor |
|-------|-------|
| Estado | ✅ Aceptada |
| Fecha | 2026-07-06 |
| Tags | `frontend`, `routing`, `auth` |

**Problema**: Necesitábamos separar rutas de admin vs cliente en el mismo dominio `{slug}.crmmaster.com` sin cambiar URLs existentes ni agregar otro subdominio.

**Contexto**: El tenant-web debía servir tanto la interfaz de administración del negocio como el portal de autogestión del cliente final. Ambas en el mismo subdominio del tenant.

**Decisiones**:

1. Route groups de Next.js: `(admin)/` y `(client)/` en la misma app `tenant-web`
2. Middleware Edge (`middleware.ts`) lee la cookie de sesión y redirige según el role
3. URLs de admin no cambian (el route group es invisible en la URL)
4. El middleware verifica firma JWT con `jsonwebtoken.verify(secret)` (no confiar en decode)

**Consecuencias**:
- ✅ Sin CORS, sin dos apps, sin subdominio separado
- ✅ URLs de admin existentes no se rompen
- ✅ Un solo deploy para toda la experiencia del tenant
- ⚠️ El middleware debe correr en Edge Runtime (limitaciones de APIs de Node)
- ⚠️ La funcionalidad de cliente requiere `NEXT_PUBLIC_CLIENT_PORTAL_ENABLED=true`

**Archivo**: `apps/tenant-web/src/middleware.ts`, `apps/tenant-web/src/app/(admin)/`, `apps/tenant-web/src/app/(client)/`

---

## ADR-005: Shared UI package

| Campo | Valor |
|-------|-------|
| Estado | ✅ Aceptada |
| Fecha | 2026-07-07 |
| Tags | `frontend`, `components`, `reusability` |

**Problema**: Button, Card, Badge, Layout estaban duplicados en admin-web y tenant-web. Cada fix o mejora requería cambios en dos lugares.

**Contexto**: Dos apps Next.js compartían los mismos patrones de UI (shadcn/ui + Tailwind). La duplicación ya había causado desviaciones menores entre ambas.

**Decisión**: Extraer a `packages/ui` como workspace package ESM (`@crm-master/ui`):

- `"sideEffects": false` para tree-shaking
- Admin-web migrado completamente
- Tenant-web migrado progresivamente

**Consecuencias**:
- ✅ Unica fuente de verdad para componentes base
- ✅ Tree-shakeable: apps no incluyen componentes que no usan
- ⚠️ Las apps deben mantener sus propios componentes de negocio (forms, layout específico)
- ⚠️ Los tests de UI deben ejecutarse en el contexto del package, no de la app

**Archivo**: `packages/ui/`

---

## ADR-006: Feature-branch-chain para PRs grandes

| Campo | Valor |
|-------|-------|
| Estado | ✅ Aceptada |
| Fecha | 2026-07-07 |
| Tags | `workflow`, `review`, `scalability` |

**Problema**: Cambios >400 líneas son difíciles de revisar. Los PRs grandes acumulan feedback lento y bugs.

**Contexto**: El equipo usa SDD con múltiples fases. Features como client-platform generaban ~2500 líneas. Un solo PR era inmanejable.

**Decisión**:

- Feature-branch-chain: cada PR apunta al anterior, solo el tracker mergea a main
- PRs pequeños y revisables (~400 líneas cada uno)
- Pipeline: Task → Branch → Implementación → Commit → Push → Review → Merge
- **Nunca un branch sin commits**

Modos:
- `stacked-to-main`: cada PR mergea directo a main (rápido, fix on the go)
- `feature-branch-chain`: PRs apuntan al anterior, tracker mergea a main (rollback controlado)

**Consecuencias**:
- ✅ Revisión más fácil (PRs de ~400 líneas)
- ✅ Rollback controlado en feature-branch-chain
- ⚠️ Requiere disciplina: mergear rápido para evitar branches stale
- ⚠️ Stacked-to-main puede dejar main en estado inconsistente entre PRs si no se coordina

**Tags**: `workflow`, `review`, `scalability`

---

## ADR-007: Self-registration con auto-activación y creación atómica Cliente+ClientUser

| Campo | Valor |
|-------|-------|
| Estado | ✅ Aceptada |
| Fecha | 2026-07-16 |
| Tags | `auth`, `registration`, `mvp` |

**Problema**: Los clientes solo podían ser creados por el admin del tenant. No existía un flujo de auto-registro para clientes finales.

**Contexto**: El portal de cliente estaba activado (`NEXT_PUBLIC_CLIENT_PORTAL_ENABLED=true`) y la página `/registro` existía pero apuntaba al endpoint incorrecto (`/api/v1/auth/register` que crea tenants, no clientes). Se necesitaba un flujo completo de registro.

**Decisiones**:

1. **Auto-activación**: `isActive = true` por defecto. Sin email verification en MVP. El admin puede desactivar usuarios desde el panel existente.

2. **Creación atómica**: `prisma.admin.$transaction` (array-form) crea `Cliente` + `ClientUser` simultáneamente. Si falla uno, no se crea ninguno.

3. **Rate limiting**: Se reusa el mismo pool del login pero con key `register:ip` (IP sola, no IP+email) porque en registro cada intento tiene un email diferente — IP+email sería inefectivo.

4. **Sin auto-login post-registro**: El usuario debe iniciar sesión explícitamente después de registrarse (redirect a `/login?registered=true`).

5. **Campos adicionales**: Se agregaron `nombre String?` y `telefono String?` al modelo `ClientUser` para almacenar el nombre de la persona (separado del nombre del negocio en `Cliente.nombre`).

6. **businessName opcional**: Si se provee, se mapea a `Cliente.nombre`. Si no, se usa `nombre` del DTO.

**Consecuencias**:
- ✅ Los clientes pueden registrarse sin intervención del admin
- ✅ La transacción atómica prevée estados inconsistentes (Cliente sin ClientUser)
- ✅ Reuso de infraestructura existente (rate limiting, guards, tenant resolution)
- ⚠️ Sin email verification: riesgo de registros con emails inválidos (aceptado para MVP)
- ⚠️ Rate limit IP-only: un atacante desde una IP puede hacer 5 intentos de registro con distintos emails antes de ser bloqueado
- ⚠️ Array-form $transaction requiere pre-generar UUIDs porque no puede encadenar resultados

**Endpoint nuevo**:
```
POST /api/v1/client/auth/register
Public
Body: { nombre, email, password, businessName? }
Response: 201 { clientUser: { id, nombre, email } }
Errors: 409 (email exists), 429 (rate limit), 400 (validation), 403 (no tenant)
```

**Archivos**:
- `apps/api/src/modules/client-auth/client-auth.service.ts` — `register()` method
- `apps/api/src/modules/client-auth/client-auth.controller.ts` — `POST auth/register` endpoint
- `apps/api/src/modules/client-auth/dto/client-auth.dto.ts` — `RegisterDto` + `RegisterResponseDto`
- `packages/database/prisma/schema.prisma` — `nombre` + `telefono` en ClientUser
- `apps/tenant-web/src/app/registro/page.tsx` — frontend corregido

---

## Resumen de decisiones

| ADR | Decisión | Impacto |
|-----|----------|---------|
| 001 | Login siempre 401 | Seguridad auth |
| 002 | Generator para listas de modelos | Zero mantenimiento manual |
| 003 | Email global único | Consistencia de identidad |
| 004 | Route groups para admin+cliente | Un solo frontend |
| 005 | Shared UI package | Componentes sin duplicación |
| 006 | Feature-branch-chain | PRs revisables |
| 007 | Self-registration con auto-activación | MVP rápido, sin email verification |

---

## No decisiones (excluidas explícitamente)

| Decisión | Motivo | ADR relacionado |
|----------|--------|-----------------|
| Microservicios | Monolito modular es suficiente para <1000 tenants | — |
| Schema-per-tenant | Shared schema es más simple y probado | ADR-002 |
| GraphQL | REST es suficiente para ~120 endpoints | — |
| Email verification en registro | Aplazado para MVP; se agrega como enhancement | ADR-007 |
| Redis rate limiting | Aplazado; in-memory es suficiente para single instance | ADR-001 |
| CSP en Helmet | Aplazado; default config por ahora | — |
