# AGENTS.md — CRM-Master

## Session Startup

Al inicio de cada sesión, el agente DEBE leer estos archivos en orden:
1. `.ai/context/PROJECT.md` — stack, arquitectura, reglas, filosofía
2. `.ai/context/SESSION.md` — estado actual, próximo paso
3. `.ai/context/DECISIONS.md` — ADRs y decisiones arquitectónicas
4. `.ai/context/KNOWN_ISSUES.md` — issues conocidos no bloqueantes
5. `.ai/context/ROADMAP.md` — próximos hitos

Esto evita tener que re-explicar el proyecto en cada sesión.

## Authority hierarchy

This document provides **repository-wide rules and pointers only**. It does not
override the SDD workflow. The SDD authority chain (highest to lowest) is:

1. Maintainer / User
2. Approved Design for the active SPEC
3. `docs/SDD-WORKFLOW.md` — canonical workflow lifecycle
4. `docs/sdd-workflow-guard.md` — transition authority
5. `.ai/context/*` — project context (including PROJECT.md)
6. `docs/templates/` and `docs/architecture/` guidance
7. Thin orchestrator and specialized `sdd-direct-*` agents
8. Validators and external tooling

SDD-Direct specifics (model roles, phase ownership, transition rules, artifact
formats) are governed by `docs/architecture/sdd-direct.md` and the Workflow
Guard. AGENTS.md points at them; it does not supersede them.

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
13. **Enterprise Design Standard**: todo nuevo Design SDD DEBE generarse usando el único template canónico `docs/templates/design-enterprise-template.md`. Ningún Design debe redactarse ad-hoc ni se debe crear o reintroducir un segundo Design prompt. El template es el estándar canónico de ingeniería del proyecto. Esta regla está sujeta a la política de Feature Freeze (ADR-0004): el template solo cambia con evidencia histórica recurrente, no por preferencias personales.
14. **Platform Baseline**: el baseline arquitectónico actual está definido en `docs/architecture/platform-baseline.md`. Este documento representa la referencia arquitectónica oficial desde la que comienza todo el desarrollo de producto futuro. La infraestructura se considera feature-frozen. Toda nueva implementación sigue el Enterprise Design Standard.

## SDD-Direct (opt-in)

Activated via `.opencode/commands/sdd-direct.md`. Artifacts live in
`openspec/changes/<change-name>/`. Uses the shared Workflow Guard and the
18-section Enterprise Design Standard. Stops at Repository Ready; Commit,
Push, Merge, Release, and Tag are maintainer-controlled. See
`docs/architecture/sdd-direct.md` and `docs/sdd-workflow-guard.md` for details.

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

## Model Roles

Model assignment uses ROLES, not hard-coded model names. Canonical role-to-phase
mapping lives in `docs/architecture/sdd-direct.md` (Agent Routing table).
Summary:

- **economical / fast reasoning** — orchestrator, Apply, Archive, deterministic phases
- **high reasoning** — Design, Architecture Review, Verify
- complex or critical implementation may temporarily escalate to high reasoning when justified

Concrete model mapping lives ONLY in OpenCode model configuration
(`~/.config/opencode/opencode.json`). Future model changes must NOT require
governance changes. If a configured model fails, fall back automatically;
never block the workflow for a missing model. No provider names appear in SDD
governance; they belong solely in OpenCode configuration.

## Apply Phase — Standard Execution Summary

Every Apply phase MUST conclude with the standard execution summary.
After three complete implementations (SPEC-0010, SPEC-0011, SPEC-0012)
this format is now mandatory engineering practice.

```markdown
=== PHASE X COMPLETE ===

Files created:
Files modified:

Working Set:
- Planned
- Actual
- Accuracy

Unexpected Files:
Unexpected Dependencies:

Acceptance Criteria:
(checklist)

Build:

Tests:

Ready for Phase X+1.
```

## Apply Summary

After all 5 Apply phases are complete, generate a consolidated Apply Summary
using `docs/templates/apply-summary-template.md`. This document does NOT
replace the individual phase summaries — it consolidates them into a single
overview.

---

## Antes de marcar una tarea como hecha
- [ ] Tests pasan (`pnpm test`)
- [ ] Lint limpio (`pnpm lint`)
- [ ] Spec correspondiente actualizada si hubo desviación del plan
- [ ] Si tocó aislamiento de tenant:
