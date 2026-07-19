# AGENTS.md — CRM-Master

## Session Startup

Al inicio de cada sesión, el agente DEBE leer estos archivos en orden:
1. `.ai/context/PROJECT.md` — stack, arquitectura, reglas, filosofía
2. `.ai/context/SESSION.md` — estado actual, próximo paso
3. `.ai/context/DECISIONS.md` — ADRs y decisiones arquitectónicas
4. `.ai/context/KNOWN_ISSUES.md` — issues conocidos no bloqueantes
5. `.ai/context/ROADMAP.md` — próximos hitos

Esto evita tener que re-explicar el proyecto en cada sesión.

## Qué es
CRM-Master es una plataforma SaaS multi-tenant de gestión. Cada cliente
(tenant) tiene su propio portal en `{slug}.crmmaster.com` para gestionar
documentos, citas y otras funcionalidades de su negocio. Ricardo opera una
capa de supervisión interna ("Mission Control") para ver salud, inventario
y bitácora de cada tenant — modelo de datos completo en docs/DESIGN.md.

## Stack
- Monorepo: Turborepo + pnpm
- Backend: NestJS + Prisma + PostgreSQL (multi-tenant row-level, `tenant_id`
 en toda tabla con datos de cliente)
- Colas: BullMQ
- Frontend: Next.js 14 + Tailwind + shadcn/ui
 - `apps/admin-web`: vista de Ricardo (Mission Control)
 - `apps/tenant-web`: vista del cliente (acceso por subdominio)
- Auth: Better-Auth con organizaciones (1 org = 1 tenant)
- Infra: Docker + Caddy, VPS, wildcard TLS `*.crmmaster.com`

## Reglas no negociables
1. **SDD primero**: ninguna feature se implementa sin spec aprobada en
 `docs/specs/`. Usa `docs/specs/TEMPLATE.md` como base.
2. **TDD estricto**: test primero (debe fallar), implementación mínima,
 test pasa, refactor. Nunca código sin test que lo cubra.
3. **Aislamiento de tenant es crítico**: toda query a tablas con datos de
 cliente DEBE pasar por el scoping automático de `tenant_id` (Prisma
 Client Extension central). Nunca queries crudas sin scope explícito.
 Toda spec que toque datos de tenant debe incluir un test de fuga de
 datos entre tenants.
4. **Resolución de tenant**: por header `Host` (subdominio), nunca por
 parámetro de URL adivinable ni por dato del body sin verificar contra
 la sesión autenticada.
5. **Secretos**: nunca loggear ni exponer credenciales, tokens, ni el
 campo `credenciales_ref` en texto plano. Usar variables de entorno o
 gestor de secretos, nunca hardcodear.
6. **Slugs de tenant**: únicos, inmutables una vez creados, validados
 contra lista de reservados (`www`, `api`, `admin`, `app`, etc.) antes
 de permitir el alta.
7. Conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`).
8. Cambios de schema Prisma requieren ADR o referencia a uno existente.
9. **Split de TenantModule obligatorio** si: (a) supera 25 feature modules, O (b) múltiples ramas concurrentes modifican `tenant/tenant.module.ts` frecuentemente por conflictos de merge. La estrategia de split está documentada en ADR-0003.
10. **Composition modules puros**: todo módulo NestJS que agregue otros módulos debe seguir `docs/architecture/module-composition.md`. Sin providers, controllers, ni lógica de negocio. Imports ordenados alfabéticamente.
11. **Regresión de app.module.ts**: si `app.module.ts` vuelve a aparecer entre los Top Hot Files del proyecto, se considera regresión arquitectónica y requiere acción correctiva inmediata.
12. **Sidebar es presentation-only**: la navegación pertenece a los features (`src/config/navigation/*.ts`). Sidebar solo renderiza. Nunca añadir rutas, iconos o labels hardcodeados en Sidebar.
13. **Enterprise Design Standard**: todo nuevo Design SDD DEBE generarse usando `docs/templates/design-master-prompt.md`, que sigue la estructura de `docs/templates/design-enterprise-template.md`. Ningún Design debe redactarse ad-hoc. El template es el estándar canónico de ingeniería del proyecto. Esta regla está sujeta a la política de Feature Freeze (ADR-0004): el template solo cambia con evidencia histórica recurrente, no por preferencias personales.
14. **Platform Baseline**: el baseline arquitectónico actual está definido en `docs/architecture/platform-baseline.md`. Este documento representa la referencia arquitectónica oficial desde la que comienza todo el desarrollo de producto futuro. La infraestructura se considera feature-frozen. Toda nueva implementación sigue el Enterprise Design Standard.

## Comandos
- Instalar: `pnpm install`
- Tests: `pnpm test`
- Lint: `pnpm lint`
- Build: `pnpm turbo build`
- Migración: `pnpm --filter database prisma migrate dev`
- Levantar local: `docker compose up -d`
- SDD Doctor: `/sdd-doctor` (audita el entorno SDD completo)

## Estructura de specs (docs/specs/NNNN-nombre.md)
- Contexto / problema que resuelve
- Contrato (input/output, entidades de datos afectadas)
- Casos de borde
- Criterios de aceptación (testables, no ambiguos)

## Exploration Optimization (Phase 2)
El flujo SDD ahora incluye medición de precisión del Working Set:

```
Design → Working Set + Read Order + Exploration Budget
Apply  → Consume Working Set antes de explorar
Verify → Validar Working Set vs cambios reales
Archive→ Learning + JSON artifact con métricas
```

Documentación completa en `docs/SDD-WORKFLOW.md` (sección "Exploration Optimization").

## Entidades core (detalle completo en docs/DESIGN.md)
Tenant (Cliente) → Sistema(s) → Inventario / Bitácora / Tareas

## Asignación de modelos por tipo de tarea

### Modelos por contexto

| Contexto | Sub-agente | Modelo | Razón |
|---|---|---|---|
| `sdd-apply` código general (CRUD, DTOs, servicios estándar) | `sdd-apply` (default) | `opencode-go/deepseek-v4-flash` | Barato, rápido, suficiente |
| `sdd-apply` aislamiento/seguridad (guards, scoping, auth, raw SQL, frontera entre tenants) | `sdd-apply-pro` | `opencode-go/kimi-k2.7-code` | Precisión crítica, revisión adversarial |
| `sdd-design`, `sdd-propose` | `sdd-design`, `sdd-propose` | `opencode-go/minimax-m3` | Razonamiento profundo para planificación |
| `sdd-spec`, `sdd-tasks` | `sdd-spec`, `sdd-tasks` | `opencode-go/glm-5.2` | Buen equilibrio coste/precisión |
| `sdd-verify` | `sdd-verify` | `opencode-go/deepseek-v4-pro` | Precisión en validación |
| `sdd-archive`, `sdd-explore`, `sdd-init`, `sdd-onboard` | respectivos | `opencode-go/deepseek-v4-flash` | Tareas ligeras |
| Conversación, orquestación | `gentle-orchestrator` | `opencode-go/deepseek-v4-flash` | Razonamiento general suficiente |

**Regla**: si el cambio toca `tenant_id`, guards, auth, o validación de frontera entre tenants, usar `sdd-apply-pro`. Si es lógica de negocio estándar sin implicación de aislamiento, `sdd-apply` es suficiente.

### Fallback policy

Si un sub-agente no puede cargar su modelo configurado:

1. El orquestador intenta el modelo configurado en `opencode.json`.
2. Si falla (`Model not found`), reintenta con `opencode-go/deepseek-v4-flash`.
3. Registra el fallback: `[WARN] sdd-<phase> fallback: configured=<model> → used=opencode-go/deepseek-v4-flash`.
4. Si deepseek-v4-flash también falla, el workflow se detiene con error.

La ejecución del SDD nunca debe fallar por un modelo no disponible. El fallback es automático y silencioso.

### Model verification

Antes de iniciar un workflow SDD, el orquestador verifica los modelos:

```bash
# Verificar que todos los modelos existen
opencode models | grep -E "opencode-go/(deepseek-v4-flash|deepseek-v4-pro|minimax-m3|glm-5.2|kimi-k2.7-code)" > /dev/null 2>&1
```

Si algún modelo falta, registrar advertencia pero continuar con fallback.

### Variantes de sub-agentes

| Sub-agente base | Variante pro | Cuándo usar la variante pro |
|---|---|---|
| `sdd-apply` | `sdd-apply-pro` | Cambios que tocan tenant_id, guards, auth, raw SQL, o frontera entre tenants |

## Antes de marcar una tarea como hecha
- [ ] Tests pasan (`pnpm test`)
- [ ] Lint limpio (`pnpm lint`)
- [ ] Spec correspondiente actualizada si hubo desviación del plan
- [ ] Si tocó aislamiento de tenant:
