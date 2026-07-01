# CRM-Master

> SaaS multi-tenant de gestión empresarial.

CRM-Master permite a cada cliente (tenant) operar su propio portal web para gestionar documentos, citas e inventario. El operador de la plataforma dispone de **Mission Control**, una capa de supervisión para monitorear la salud, actividad y bitácora de cada tenant.

---

## Visión

Construir una plataforma modular, segura y escalable sobre un monorepo unificado, con prácticas de ingeniería exigentes: Spec-Driven Development, TDD obligatorio y cobertura mínima del 80%.

---

## Stack

| Capa | Tecnología |
|------|------------|
| Orquestación | Turborepo + pnpm workspaces |
| Backend API | NestJS + Prisma ORM |
| Base de datos | PostgreSQL (multi-tenant row-level) |
| Colas | BullMQ sobre Redis |
| Admin Web (Mission Control) | Next.js 14 + Tailwind + shadcn/ui |
| Tenant Web (portales de clientes) | Next.js 14 + Tailwind + shadcn/ui |
| Auth | Better-Auth con organizaciones |
| Paquetes compartidos | Zod schemas, Prisma client, config |
| Infra / deploy | Docker + Caddy |

---

## Requisitos locales

- **Node.js** ≥ 20
- **pnpm** ≥ 9
- **Docker** + Docker Compose
- (Opcional) **Git** ≥ 2.40

---

## Setup paso a paso

### 1. Clonar el repositorio

```bash
git clone <repo-url> crm-master
cd crm-master
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con los valores de tu entorno local
```

### 4. Levantar servicios de infraestructura

```bash
docker compose up -d
```

Esto inicia PostgreSQL, Redis y Caddy según la configuración de `docker-compose.yml`.

### 5. Aplicar migraciones y seed (cuando estén disponibles)

```bash
pnpm db:migrate
pnpm db:seed
```

### 6. Iniciar entorno de desarrollo

```bash
pnpm dev
```

Turborepo levantará las apps en paralelo:

- API: `http://localhost:3001`
- Admin Web (Mission Control): `http://localhost:3002`
- Tenant Web: `http://localhost:3000`

> Los puertos pueden ajustarse en las variables de entorno de cada app.

---

## Scripts principales

```bash
pnpm dev      # Inicia todas las apps en modo desarrollo
pnpm build    # Compila todo el monorepo
pnpm test     # Ejecuta tests en todo el monorepo
pnpm lint     # Ejecuta linters
pnpm format   # Formatea con Prettier
pnpm clean    # Limpia artefactos de build
```

---

## Estructura del monorepo

```text
crm-master/
├── apps/
│   ├── api/              # NestJS — API, auth, lógica de negocio
│   ├── admin-web/        # Next.js — Mission Control (operador)
│   └── tenant-web/       # Next.js — Portal de cada cliente
├── packages/
│   ├── database/         # Prisma schema, cliente tipado, migraciones, seeds
│   ├── shared/           # Zod schemas, tipos, utilidades, constants
│   └── config/           # Configs compartidas (ESLint, TS, Tailwind, etc.)
├── docs/
│   ├── DESIGN.md         # Modelo de datos y visión
│   ├── decisions-log.md  # Índice de ADRs
│   ├── specs/            # Specs de features
│   └── architecture/
│       └── adr/          # Decisiones arquitectónicas
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .prettierrc
├── .gitignore
└── .env.example
```

---

## Documentación

- [`docs/DESIGN.md`](./docs/DESIGN.md) — Modelo de datos, entidades, enums y principios de arquitectura.
- [`docs/specs/TEMPLATE.md`](./docs/specs/TEMPLATE.md) — Plantilla para especificaciones de features.
- [`docs/architecture/adr/TEMPLATE.md`](./docs/architecture/adr/TEMPLATE.md) — Plantilla para Decisiones Arquitectónicas (ADRs).
- [`docs/decisions-log.md`](./docs/decisions-log.md) — Índice de ADRs aprobadas.
- [`docs/architecture/adr/0001-multi-tenancy-strategy.md`](./docs/architecture/adr/0001-multi-tenancy-strategy.md) — Estrategia de multi-tenancy row-level.
- [`AGENTS.md`](./AGENTS.md) — Reglas del proyecto para la IA.

---

## Convenciones

- **SDD**: ninguna feature sin spec en `docs/specs/`.
- **TDD**: test → falla → implementa → pasa → refactoriza.
- **Commits**: Conventional Commits (`feat(api): ...`, `fix(auth): ...`).
- **Cobertura mínima**: 80%.
- **Multi-tenancy**: row-level con `tenant_id` en todas las tablas de negocio.

---

## Licencia

[Propietaria / Por definir]
