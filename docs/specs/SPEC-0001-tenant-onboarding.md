# Spec 0001 — Tenant Onboarding

**Spec ID:** `SPEC-0001`
**Estado:** `proposed`
**Autor:** @ricardo
**Fecha:** 2026-07-01
**Área:** `api` | `database` | `auth`

---

## 1. Contexto / Problema

CRM-Master es una plataforma multi-tenant donde cada cliente (tenant) necesita su propio espacio aislado. Actualmente no existe flujo de alta: no hay forma de crear un tenant, asignarle un admin, ni aprovisionar su portal.

Sin este flujo no se puede incorporar al primer cliente real. El alta debe ser operativa desde el Mission Control y el tenant debe poder acceder a su portal inmediatamente después de la creación.

## 2. Objetivo

Permitir que un superadmin (Ricardo) cree un tenant desde Mission Control, lo que dispara: creación de la organización en Better-Auth, alta del usuario admin del tenant, y aprovisionamiento del subdominio `{slug}.crmmaster.com` con su portal funcional.

## 3. Alcance

### 3.1 In-scope

- [ ] Endpoint `POST /api/v1/admin/tenants` para crear tenant + admin + org
- [ ] Endpoint `GET /api/v1/admin/tenants` para listar tenants con indicadores de salud
- [ ] Endpoint `POST /api/v1/admin/tenants/:id/regenerate-invite` para regenerar token de invitación
- [ ] Flujo de invitación: email con magic link + set de password + primer login
- [ ] Provisión automática del subdominio `{slug}.crmmaster.com` routing al tenant-web
- [ ] Validación de slug: único, sin caracteres especiales, lista de palabras reservadas
- [ ] Creación del registro en tabla `tenants` + configuración inicial del tenant
- [ ] Tests de integración del flujo completo

### 3.2 Out-of-scope

- Página pública de registro de tenant (self-service) — en v2
- Personalización del portal por tenant (logo, colores) — spec separada
- Facturación / planes — fuera del MVP
- Migración de datos desde BeeHive existente — fase posterior

## 4. Diseño / Decisión técnica

### Flujo de alta

```text
[Superadmin en Mission Control]
        │
        ▼
POST /api/v1/admin/tenants
{
  "slug": "asesoria-garcia",
  "name": "Asesoría García S.L.",
  "adminEmail": "admin@garcia.com",
  "adminName": "Juan García"
}
        │
        ▼
[1] Validar slug → único, no reservado
[2] Crear Tenant en PostgreSQL (row-level)
[3] Crear organización en Better-Auth (org = tenant)
[4] Crear usuario admin en Better-Auth + asociarlo a la org
[5] Generar token de invitación único (expira en 7 días)
[6] Aprovisionar ruta en Caddy: {slug}.crmmaster.com → tenant-web
[7] Opcional: enviar email de invitación (si SMTP configurado)

        │
        ▼
201 Created
{
  "tenant": { "id", "slug", "name", "status": "active" },
  "admin": { "email", "status": "invited" },
  "portalUrl": "https://asesoria-garcia.crmmaster.com"
}
```

### Capas involucradas

- **admin-web** — formulario de alta en Mission Control (sección 4.1 del DESIGN.md)
- **api** — `TenantsAdminController` + `TenantOnboardingService`
- **database** — tabla `tenants` + Prisma Client Extension
- **auth** — Better-Auth Organizations API
- **infra** — Caddy (Docker) para wildcard TLS + routing por subdominio

### Consideraciones de seguridad multi-tenant

- El slug del tenant es único e inmutable tras creación
- El token de invitación expira automáticamente y es de un solo uso
- El superadmin es el único rol capaz de crear tenants
- Los usuarios admin de tenant NO pueden crear otros tenants
- El endpoint de listado de tenants solo es accesible por superadmin

## 5. API / Interfaces

### 5.1 Endpoints

#### `POST /api/v1/admin/tenants`

```http
POST /api/v1/admin/tenants
Authorization: Bearer <superadmin_token>
Content-Type: application/json

{
  "slug": "asesoria-garcia",
  "name": "Asesoría García S.L.",
  "adminEmail": "admin@garcia.com",
  "adminName": "Juan García"
}
```

```http
201 Created
{
  "id": "uuid",
  "slug": "asesoria-garcia",
  "name": "Asesoría García S.L.",
  "status": "active",
  "admin": {
    "email": "admin@garcia.com",
    "name": "Juan García",
    "status": "invited"
  },
  "portalUrl": "https://asesoria-garcia.crmmaster.com",
  "inviteToken": "tmp_abc123...",
  "createdAt": "2026-07-01T18:00:00Z"
}
```

Errores:
- `409` slug ya existe
- `422` slug inválido o en lista de reservados
- `400` validación de campos fallida

#### `GET /api/v1/admin/tenants`

```http
GET /api/v1/admin/tenants?page=1&limit=20
Authorization: Bearer <superadmin_token>
```

```http
200 OK
{
  "data": [
    {
      "id": "uuid",
      "slug": "asesoria-garcia",
      "name": "Asesoría García S.L.",
      "status": "active",
      "adminEmail": "admin@garcia.com",
      "portalUrl": "https://asesoria-garcia.crmmaster.com",
      "clientCount": 5,
      "health": "🟢",
      "createdAt": "2026-07-01T18:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

#### `POST /api/v1/admin/tenants/:id/regenerate-invite`

```http
POST /api/v1/admin/tenants/:id/regenerate-invite
Authorization: Bearer <superadmin_token>
```

```http
200 OK
{
  "inviteToken": "tmp_xyz789...",
  "expiresAt": "2026-07-08T18:00:00Z"
}
```

### 5.2 Tipos / DTOs / Schemas

```ts
// --- Zod schemas para SPEC-0001 ---

const RESERVED_SLUGS = [
  'www', 'api', 'admin', 'app', 'mail', 'ftp',
  'crmmaster', 'mission-control', 'help', 'support',
  'docs', 'status', 'billing', 'login', 'signup',
  'staging', 'dev', 'test',
] as const;

export const CreateTenantSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones')
    .refine((s) => !RESERVED_SLUGS.includes(s as any), {
      message: 'Slug reservado para el sistema',
    }),
  name: z.string().min(2).max(200),
  adminEmail: z.string().email(),
  adminName: z.string().min(2).max(100).optional(),
});

export const TenantListQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export interface TenantDto {
  id: string;
  slug: string;
  name: string;
  status: string;
  adminEmail?: string;
  portalUrl?: string;
  clientCount?: number;
  health?: string;
  createdAt: string;
}
```

### 5.3 Eventos

```ts
interface TenantCreatedEvent {
  tenantId: string;
  slug: string;
  name: string;
  adminEmail: string;
  occurredAt: string;
}
```

Este evento se emite para:
- Envío async de email de invitación (si SMTP configurado)
- Log en la bitácora global del sistema
- (Futuro) aprovisionamiento de recursos (DB schema, buckets)

## 6. Modelo de datos

Sin cambios en el modelo — la tabla `tenants` ya está definida en el esquema Prisma (`packages/database/prisma/schema.prisma`).

```prisma
model Tenant {
  id        String   @id @default(uuid())
  slug      String   @unique
  name      String
  logo      String?
  config    Json?    @default("{}")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  users     User[]
  clients   Cliente[]
  sistemas  Sistema[]
  items     ItemInventario[]
  eventos   EventoBitacora[]
  tareas    Tarea[]
}
```

## 7. Tests requeridos

### 7.1 Unitarios

- [ ] `CreateTenantSchema` rechaza slug inválidos (mayúsculas, caracteres especiales)
- [ ] `CreateTenantSchema` rechaza slugs reservados (www, admin, api…)
- [ ] `CreateTenantSchema` rechaza slug < 3 caracteres
- [ ] `CreateTenantSchema` rechaza email mal formado
- [ ] Validación de unicidad de slug

### 7.2 Integración

- [ ] `POST /api/v1/admin/tenants` con token superadmin → 201 + tenant creado
- [ ] `POST /api/v1/admin/tenants` sin token → 401
- [ ] `POST /api/v1/admin/tenants` con token de usuario normal → 403
- [ ] `POST /api/v1/admin/tenants` con slug duplicado → 409
- [ ] `GET /api/v1/admin/tenants` devuelve lista paginada
- [ ] Token de invitación expira tras 7 días
- [ ] Token de invitación es de un solo uso

### 7.3 Seguridad

- [ ] Usuario de tenant A no puede llamar a endpoints admin
- [ ] Slug no puede contener path traversal
- [ ] El token de invitación no puede ser reutilizado tras aceptación

## 8. Checklist de implementación

- [ ] Spec aprobada
- [ ] Tests escritos y fallando (red)
- [ ] `TenantsAdminController` + validación Zod
- [ ] `TenantOnboardingService` con flujo completo
- [ ] Integración con Better-Auth Organizations API
- [ ] Generación y validación de token de invitación
- [ ] Routing de subdominio en Caddy
- [ ] UI en admin-web (Mission Control) para el formulario de alta
- [ ] UI en tenant-web para el flujo de aceptación de invitación
- [ ] Refactor
- [ ] Lint y formato
- [ ] Cobertura ≥ 80%
- [ ] Commit con Conventional Commit
- [ ] Documentar en decisions-log.md

## 9. Notas / Preguntas abiertas

- **Email transaccional:** si no hay SMTP configurado en el VPS, el superadmin puede copiar manualmente el `inviteToken` y compartirlo con el admin del tenant.
- **Better-Auth Organizations:** verificar si la versión actual soporta orgs aisladas o necesita configuración adicional. Si Better-Auth no soporta orgs nativamente, usar el modelo de Tenant en nuestra DB + asociación manual.
- **Caddy routing:** el `docker-compose.yml` actual necesitará un ajuste para wildcard `*.crmmaster.com` → tenant-web con detección de slug.
- **Seed de desarrollo:** crear un script de seed que genere un tenant de prueba + admin para desarrollo local.

## 10. Referencias

- `docs/DESIGN.md` — modelo de datos, sección 5 (flujo 1: Alta de cliente)
- `docs/architecture/adr/0001-multi-tenancy-strategy.md` — resolución de tenant por subdominio
- `packages/database/prisma/schema.prisma` — modelo Tenant
- `packages/shared/src/index.ts` — Zod schemas base
