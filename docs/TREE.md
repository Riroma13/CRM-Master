# CRM-Master — Árbol del Repositorio (Comentado)

> `tree -L 3` comentado con la responsabilidad de cada directorio/archivo.
> Generado: Julio 2026 | Proyecto: ~28K LOC, 39 módulos backend, 3 apps, 4 packages.

```
CRM-Master/
│
├── .ai/                              ← Contexto para asistentes IA (sesión, decisiones, roadmap)
│   ├── context/                      ←   Estado actual del proyecto para retomar sesiones
│   │   ├── PROJECT.md                ←   Stack, reglas, filosofía del proyecto
│   │   ├── SESSION.md                ←   Última sesión, próximo paso
│   │   ├── DECISIONS.md              ←   ADRs activos (6 decisiones)
│   │   ├── ROADMAP.md                ←   Próximos hitos y pendientes
│   │   └── KNOWN_ISSUES.md           ←   Issues conocidos no bloqueantes
│   └── prompts/                      ←   Prompts de sistema para agentes
│
├── .atl/                             ← Skill registry de OpenCode (autogenerado)
│
├── .github/workflows/
│   └── ci.yml                        ← CI pipeline: verify scope → test db → lint
│
├── apps/                             ← Aplicaciones desplegables (3)
│   │
│   ├── admin-web/                    ★ Misión Control (Ricardo) — Next.js 15
│   │   ├── Dockerfile                ←   Multistage build, node:20-alpine
│   │   ├── src/                      ←   6 páginas: dashboard, clients, systems, inventory
│   │   └── vitest.config.ts          ←   Vitest + jsdom (9 test files)
│   │
│   ├── api/                          ★ Backend — NestJS 11 (~9.200 LOC)
│   │   ├── Dockerfile                ←   node:20-alpine, 19 líneas
│   │   ├── src/
│   │   │   ├── main.ts               ←   Bootstrap: CORS, Helmet, Swagger, ValidationPipe
│   │   │   ├── app.module.ts         ←   Módulo raíz (importa los 39 feature modules)
│   │   │   ├── common/               ←   Guards (5), decorators, middleware, prisma.service
│   │   │   └── modules/              ←   39 módulos por dominio (~120 endpoints)
│   │   ├── test/
│   │   │   ├── e2e/                  ←   9 tests E2E con supertest
│   │   │   └── doorbell/             ←   Test de aislamiento multi-tenant
│   │   ├── jest.config.js            ←   Jest con ts-jest
│   │   └── scripts/                  ←   Utilidades (seed, backups)
│   │
│   └── tenant-web/                   ★ Portal del tenant — Next.js 15 (~12.500 LOC)
│       ├── Dockerfile                ←   Multistage build, node:20-alpine
│       ├── src/
│       │   ├── app/
│       │   │   ├── (admin)/          ←   30 rutas admin (dashboard, clientes, docs, etc.)
│       │   │   ├── (client)/         ←   4 rutas portal cliente (dashboard, docs, perfil)
│       │   │   ├── calendario/       ←   Página pública de agenda
│       │   │   ├── login/            ←   Login con dispatch admin/cliente
│       │   │   └── registro/         ←   Auto-registro de clientes
│       │   ├── components/
│       │   │   ├── forms/            ←   5 form components (cita, cliente, tarea, etc.)
│       │   │   ├── layout/           ←   Sidebar + layout con test
│       │   │   ├── notifications/    ←   Notification bell
│       │   │   └── ui/               ←   8 UI components locales (Button, Card, Input, etc.)
│       │   └── middleware.ts         ←   Edge middleware: ruteo por cookie role
│       ├── e2e/                      ←   Playwright E2E (login, register)
│       ├── vitest.config.ts          ←   Vitest + jsdom (25 test files)
│       └── playwright.config.ts      ←   Playwright config
│
├── docker/
│   └── Caddyfile                     ←   Reverse proxy con TLS wildcard *.crmmaster.com
│
├── docker-compose.yml                ←   Stack completo: Postgres, Redis, Caddy, API, frontends
│
├── docs/                             ← Documentación técnica
│   ├── AUDITORIA.md                  ←   Auditoría técnica completa (hallazgos, deuda)
│   ├── CRM_MASTER_ARCHITECTURE_OVERVIEW.md  ←   Architecture overview para staff engineer
│   ├── DESIGN.md                     ←   Diseño completo del modelo de datos
│   ├── TREE.md                       ★   Este archivo
│   ├── DECISIONS.md                  ★   ADRs detallados
│   ├── tenant-scope-generator.md     ←   Documentación del generator
│   ├── SDD-WORKFLOW.md               ←   Flujo SDD
│   ├── SDD-MODEL-ASSIGNMENTS.md      ←   Asignación de modelos por fase
│   ├── adr/
│   │   └── 0001-clientuser-schema.md ←   ADR individual
│   ├── specs/                        ←   7 specs SDD (SPEC-0001 a SPEC-0007)
│   └── design-reference/             ←   Referencias de diseño (imagen SuperAdmin panel)
│
├── openspec/                         ← Artefactos SDD (Spec-Driven Development)
│   ├── config.yaml                   ←   Configuración de OpenSpec
│   ├── changes/                      ←   Cambios activos SDD
│   │   ├── client-platform/          ←   Plataforma cliente (completado)
│   │   ├── client-self-registration/ ←   Auto-registro (completado)
│   │   ├── SPEC-0003.../             ←   Dashboard Mission Control
│   │   ├── SPEC-0004.../             ←   Ficha cliente admin
│   │   ├── SPEC-0005.../             ←   Auth tenant
│   │   ├── SPEC-0006.../             ←   Citas calendario
│   │   ├── SPEC-0008.../             ←   Dashboard tenant
│   │   └── archive/                  ←   Cambios archivados
│   └── specs/                        ←   Especificaciones SDD
│       ├── client-auth/              ←   Auth de cliente (login + register)
│       ├── client-user-management/   ←   Gestión de usuarios cliente
│       ├── client-self-service/      ←   Autogestión del cliente
│       ├── data-leak-detection/      ←   Tests de fuga de datos
│       ├── shared-ui/                ←   UI compartida
│       ├── tenant-isolation/         ←   Aislamiento multi-tenant
│       ├── admin-clients-list/       ←   Lista de clientes admin
│       └── admin-dashboard/          ←   Dashboard admin
│
├── packages/                         ← Paquetes compartidos (4)
│   │
│   ├── config/                       ← tsconfig.base.json compartido
│   │
│   ├── database/                     ★ Single source of truth de datos
│   │   ├── prisma/
│   │   │   ├── schema.prisma         ←   29 modelos, 37 índices, fuente única de verdad
│   │   │   ├── generators/
│   │   │   │   └── tenant-scope/     ←   Generator: lee schema → genera listas tipadas
│   │   │   │       ├── generator.ts  ←   Parseador + clasificador + writer (~310 LOC)
│   │   │   │       ├── integrity.spec.ts  ←   Test que cruza generated vs schema
│   │   │   │       └── generated/    ←   Output: tenant-models.ts, metadata.json, spec.ts
│   │   │   └── migrations/           ←   2 migraciones versionadas
│   │   └── src/
│   │       └── index.ts              ←   createPrismaClient() con $extends scoping
│   │
│   ├── shared/                       ← Zod schemas + tipos compartidos API/frontend
│   │
│   └── ui/                           ★ @crm-master/ui — Componentes ESM tree-shakeable
│       └── src/
│           ├── button.tsx            ←   Button compartido (extraído de admin-web)
│           ├── card.tsx              ←   Card compartido
│           ├── badge.tsx             ←   Badge compartido
│           ├── layout.tsx            ←   Layout system
│           └── __tests__/            ←   Tests de primitivas
│
├── package.json                      ← Root monorepo (Turborepo + pnpm)
├── pnpm-workspace.yaml               ← Workspace definition
├── turbo.json                        ← Task orchestration (build, test, dev, lint)
├── tsconfig.base.json                ← TypeScript base config
├── .env                              ← Variables de entorno compartidas
├── .env.example                      ← Template de env vars documentado
├── seed-demo.ts                      ← Seed data para desarrollo
│
└── AGENTS.md                         ← Instrucciones para asistentes IA
```

## Leyenda

| Símbolo | Significado |
|---------|-------------|
| ★ | Componente arquitectónico central |
| ← | Comentario / responsabilidad |
| (~N LOC) | Líneas de código estimadas |
| (N) | Cantidad de elementos |

## Métricas rápidas

| Dimensión | Cantidad |
|-----------|----------|
| Apps | 3 (admin-web, api, tenant-web) |
| Paquetes compartidos | 4 (config, database, shared, ui) |
| Módulos backend | 39 |
| Endpoints API | ~120 |
| Modelos Prisma | 29 |
| Tests | ~380 (68 archivos) |
| Archivos documentación docs/ | 12 |
| Artefactos SDD openspec/ | 8 cambios + 8 specs |
| LOC total (apps) | ~26.100 |
| LOC total (packages) | ~1.600 |
