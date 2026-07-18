# PROJECT: CRM-Master

> Plataforma SaaS multi-tenant de gestión empresarial.
> Base para 24+ proyectos/año — estándar profesional.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 20+ |
| Monorepo | Turborepo + pnpm |
| Backend | NestJS + Prisma + PostgreSQL |
| Frontend admin | Next.js 14 (admin-web) |
| Frontend tenant | Next.js 14 (tenant-web) |
| UI | Tailwind + shadcn/ui + Radix |
| Paquete UI compartido | `@crm-master/ui` (ESM, sideEffects:false) |
| Auth | Better-Auth + JWT (admin session) / jsonwebtoken (client JWT) |
| Colas | BullMQ |
| Tests | Jest (api), Vitest (frontend), Playwright (e2e) |
| Infra | Docker + Caddy, VPS, wildcard TLS `*.crmmaster.com` |

---

## Arquitectura

### Multi-tenant

- Cada tenant tiene un slug único → `{slug}.crmmaster.com`
- Resolución por header `Host` (subdominio), nunca por parámetro URL
- Prisma Client Extension auto-inyecta `tenantId` en TODAS las queries
- Raw SQL (`$queryRaw`, `$executeRaw`) bloqueado en clients scoped

### Aislamiento de datos

```
Tenant → Cliente (business entity)
         ├── Sistema(s)
         ├── Inventario
         ├── Bitácora
         ├── Tareas
         ├── Citas (appointments)
         └── Documentos

ClientUser → identity de login para el Cliente (end customer)
             ├── Login con email + password (bcrypt, JWT)
             ├── Portal de autogestión en /portal
             └── Prisma extension inyecta clienteId automáticamente
```

### Scoping automático (generado desde schema.prisma)

```
schema.prisma
     │
     ▼
tenant-scope-generator.ts
     │
     ├── TENANT_SCOPED_MODELS (20 modelos con tenantId)
     ├── CLIENTE_SCOPED_MODELS (9 modelos con clienteId)
     └── Tests auto-generados (verifican consistencia en CI)
```

**Regla**: nadie hardcodea listas de modelos. El generator las crea.

### Auth

| Tipo | Cookie | Guard | Role |
|------|--------|-------|------|
| Admin | `__Secure-session` | `BetterAuthGuard` | admin |
| Cliente | `__Secure-client-session` | `ClientAuthGuard` | client |

- **Login siempre devuelve 401** — sin revelar existencia de usuario
- **Rate limiting**: 5 intentos/minuto por IP+email
- **Retraso progresivo**: 0→200→500→1000→2000ms
- **Tiempo constante**: dummy hash si usuario no existe
- **bcrypt async**: no bloquea el event loop

---

## Estructura del proyecto

```
CRM-Master/
├── .ai/                        ← Contexto para IA (PROJECT, SESSION, DECISIONS, etc.)
├── apps/
│   ├── api/                    ← NestJS backend
│   │   ├── src/modules/        ── Módulos por dominio
│   │   ├── src/common/         ── Guards, decorators, middleware
│   │   └── test/doorbell/      ── Tests de aislamiento multi-tenant
│   ├── admin-web/              ← Next.js — Mission Control (Ricardo)
│   └── tenant-web/             ← Next.js — Portal del tenant
│       ├── src/app/(admin)/    ── Rutas de admin
│       └── src/app/(client)/   ── Rutas del portal de cliente
├── packages/
│   ├── database/               ← Prisma schema + client
│   │   └── prisma/generators/  ── Generadores (tenant-scope)
│   ├── shared/                 ← Zod schemas, DTOs, tipos
│   ├── ui/                     ← Componentes compartidos (Button, Card, Badge, Layout)
│   └── config/                 ← tsconfig base
├── docs/
│   ├── specs/                  ── Especificaciones SDD
│   ├── adr/                    ── Architecture Decision Records
│   └── DESIGN.md               ── Diseño completo del modelo de datos
└── openspec/
    ├── specs/                  ── Especificaciones SDD adicionales
    └── changes/                ── Cambios activos SDD
```

---

## Convenciones

### Commits
Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`

### Testing
- **TDD estricto**: RED → GREEN → REFACTOR. Siempre.
- Tests unitarios con Jest (api) o Vitest (frontend)
- Tests e2e con Playwright (frontend) o supertest (api)
- Doorbell test: prueba de aislamiento multi-tenant + cross-client

### PRs
- Feature-branch-chain para cambios > 400 líneas
- Pipeline: Task → Branch → Implementación → Commit → Push → Review → Merge
- **Nunca un branch sin commits**

---

## Reglas no negociables

1. **SDD primero**: ninguna feature se implementa sin spec aprobada
2. **TDD estricto**: test primero, implementación después
3. **Aislamiento de tenant es crítico**: toda query DEBE pasar por Prisma Client Extension
4. **Resolución de tenant**: por Host header, nunca por URL o body
5. **Secretos**: nunca loggear ni exponer credenciales, tokens, o passwords
6. **Slugs de tenant**: únicos, inmutables, validados contra reserved list
7. **Conventional commits**
8. **Cambios de schema Prisma requieren ADR**
9. **Zero hardcoded model lists**: usar tenant-scope generator siempre
10. **Login siempre 401**: nunca revelar existencia de usuario
11. **Split de TenantModule obligatorio** si: (a) supera 25 feature modules, O (b) múltiples ramas concurrentes modifican `tenant/tenant.module.ts` por conflictos. Estrategia en ADR-0003.
12. **Composition modules puros**: todo módulo NestJS agregador debe seguir `docs/architecture/module-composition.md`. Sin providers, controllers, ni lógica.
13. **Regresión de app.module.ts**: si reappears among Top Hot Files, es regresión.

---

## SDD Platform Infrastructure

La plataforma SDD incluye componentes de infraestructura documentados en
`docs/architecture/sdd-infrastructure.md`:

- **Environment Verification**: chequeos pre-workflow (modelos, templates, docs)
- **Fallback Telemetry**: registro estructurado de cada fallback de modelo
- **SDD Doctor**: comando `/sdd-doctor` para auditoría completa del entorno
- **JSON Artifact**: métricas estructuradas con info del entorno
- **Stability Policy**: la plataforma SDD es feature-complete; cambios requieren evidencia

---

## Frontend Architecture (Navigation)

### Composition Rules

1. **Navigation ownership belongs to features.** Each feature module owns its
   `navigation.ts` with id, label, href, icon, order, and visibility rules.
   See `src/config/navigation/{feature}.ts`.

2. **Sidebar is presentation only.** It consumes the Navigation Registry and
   renders items. No hardcoded routes, icons, or labels.

3. **Registry is composition only.** `src/config/navigation/registry.ts` imports
   all feature navigation files, sorts by order, and exposes `getVisible()`.
   Zero feature-specific logic.

4. **No feature requires modifying Sidebar.** Adding a new admin page = create
   the page + create/add to a navigation feature file. Sidebar is untouched.

5. **Breadcrumbs derive from the same registry.** `Breadcrumbs.tsx` resolves
   path segments against navigation item labels.

6. **Always-visible items** (Onboarding, Auditoría) are `system` category with
   `alwaysVisible: true`. They bypass module-gating.

### Hot File Prevention

`sidebar.tsx` was the project's **#2 hot file** (19 commits, 14.0% of all commits).
The navigation decentralization eliminates this pattern.

| Before | After |
|--------|-------|
| sidebar.tsx owns: icons, routes, labels, visibility | Features own metadata; Sidebar renders only |
| Adding a feature edits sidebar.tsx | Adding a feature edits only navigation/{feature}.ts |
| Breadcrumbs have separate hardcoded map | Breadcrumbs resolve from the same registry |

---

## Filosofía

> **24 proyectos/año. Hecho bien desde el principio.**
>
> - No atajos. Cero technical debt consciente.
> - Invertir tiempo ahora para ahorrar decenas de horas después.
> - Cada solución debe ser mantenible, testeable, y auto-documentada.
> - Preferir generación de código sobre listas hardcodeadas.
> - CI debe detectar fallos antes de deploy.
> - Única fuente de verdad para metadata del schema: `schema.prisma`
