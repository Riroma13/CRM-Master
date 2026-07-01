# Spec 0003 — Dashboard admin (Mission Control)

**Spec ID:** `SPEC-0003`
**Estado:** `proposed`
**Autor:** @ricardo
**Fecha:** 2026-07-01
**Área:** `api` | `admin-web`

---

## 1. Contexto / Problema

El operador de CRM-Master (Ricardo) necesita una vista rápida del estado de todos sus clientes. Sin un dashboard consolidado, la información está dispersa: cada tenant vive en una base de datos separada (BeeHive), en notas sueltas, o en la memoria.

La sección 4.1 del DESIGN.md describe el "Mapa de Clientes": una vista en tarjetas o tabla con indicadores visuales de salud, filtros y búsqueda.

## 2. Objetivo

Construir el dashboard principal de Mission Control con:

1. Vista de tarjetas de todos los clientes, cruzando tenants.
2. Indicador visual de salud (🟢🟡🔴) y estado técnico de sistemas.
3. Filtros y búsqueda rápida.
4. Métricas resumen en la cabecera.

## 3. Alcance

### 3.1 In-scope

- [ ] Endpoint `GET /api/v1/admin/dashboard` con datos agregados de todos los tenants
- [ ] Endpoint `GET /api/v1/admin/clientes` con filtros (cross-tenant para superadmin)
- [ ] Vista de tarjetas de clientes con: nombre, salud, sistema(s), última actividad
- [ ] Filtros: por tag, estado de relación, salud, tipo de sistema
- [ ] Buscador rápido por nombre de cliente
- [ ] Métricas resumen: clientes activos, con incidencias, tareas pendientes globales
- [ ] Responsive: grid adaptable de tarjetas
- [ ] Tests de integración del dashboard

### 3.2 Out-of-scope

- Vista de detalle de cliente (Spec 0004)
- Inventario global transversal (v1.5)
- Timeline / bitácora global en el dashboard (indicador sí, feed completo no)
- Alertas automáticas (v2)
- Edición directa desde tarjetas

## 4. Diseño / Decisión técnica

### Layout del dashboard

```text
┌─────────────────────────────────────────────────────┐
│  [CRM-Master] Mission Control           [Avatar]    │
├─────────────────────────────────────────────────────┤
│  📊 Resumen                                            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                  │
│  │ 12   │ │  3   │ │  8   │ │  5   │                  │
│  │Activos│ │🟡 Atn│ │🔴Crit│ │Tareas│                  │
│  └──────┘ └──────┘ └──────┘ └──────┘                  │
├─────────────────────────────────────────────────────┤
│  🔍 Buscar cliente...  [🟢 Todos] [🟡 Atención] [🔴]   │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐        │
│  │ 🟢 Asesoría García                        │        │
│  │ 📍 BeeHive · 🟢 Operativo                │        │
│  │ 🏷️ factura mensual, VPS propio            │        │
│  │ 📅 última actividad: ayer                 │        │
│  └──────────────────────────────────────────┘        │
│  ┌──────────────────────────────────────────┐        │
│  │ 🟡 Clínica Dental Masriera               │        │
│  │ 📍 BeeHive · 🟡 Incidencia abierta       │        │
│  │ 🏷️ alta prioridad                        │        │
│  │ 📅 última actividad: hace 3 días          │        │
│  └──────────────────────────────────────────┘        │
│  ... grid de tarjetas responsive ...                  │
└─────────────────────────────────────────────────────┘
```

### API endpoints para el dashboard

#### `GET /api/v1/admin/dashboard`

```http
GET /api/v1/admin/dashboard
Authorization: Bearer <superadmin_token>
```

```http
200 OK
{
  "metrics": {
    "totalClientes": 12,
    "activos": 12,
    "conIncidencias": 3,
    "criticos": 1,
    "tareasPendientesGlobales": 5,
    "tenantsActivos": 5
  },
  "ultimaActualizacion": "2026-07-01T18:00:00Z"
}
```

#### `GET /api/v1/admin/clientes`

Lista todos los clientes de todos los tenants (superadmin). Acepta filtros.

```http
GET /api/v1/admin/clientes?page=1&limit=20&search=garcia&salud=🟡&estado=Activo
Authorization: Bearer <superadmin_token>
```

```http
200 OK
{
  "data": [
    {
      "id": "uuid",
      "nombre": "Asesoría García",
      "tenant": { "id": "uuid", "slug": "asesoria-garcia", "name": "Asesoría García S.L." },
      "saludGeneral": "🟢",
      "estadoRelacion": "Activo",
      "tags": ["factura mensual", "VPS propio"],
      "sistemas": [
        {
          "id": "uuid",
          "nombreSistema": "BeeHive — instancia producción",
          "tipo": "BeeHive propio",
          "estadoTecnico": "🟢"
        }
      ],
      "ultimaActividad": "2026-06-30T10:00:00Z",
      "tareasPendientes": 2,
      "createdAt": "2026-06-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  }
}
```

### Consultas cross-tenant

El superadmin (rol `superadmin`) puede ver datos de todos los tenants. El endpoint omite el `tenant_id` del token porque el superadmin no tiene uno — ve la transversal completa.

```typescript
@Injectable()
export class AdminDashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    const [
      totalClientes,
      conIncidencias,
      criticos,
      tareasPendientes,
      tenantsActivos,
    ] = await Promise.all([
      this.prisma.cliente.count(),
      this.prisma.cliente.count({ where: { saludGeneral: '🟡' } }),
      this.prisma.cliente.count({ where: { saludGeneral: '🔴' } }),
      this.prisma.tarea.count({ where: { estado: { not: 'Hecho' } } }),
      this.prisma.tenant.count({ where: { isActive: true } }),
    ]);

    return {
      metrics: {
        totalClientes,
        activos: totalClientes,
        conIncidencias,
        criticos,
        tareasPendientesGlobales: tareasPendientes,
        tenantsActivos,
      },
      ultimaActualizacion: new Date().toISOString(),
    };
  }

  async listClientes(filters: ClienteFilters) {
    const where: any = {};

    if (filters.search) {
      where.nombre = { contains: filters.search, mode: 'insensitive' };
    }
    if (filters.salud) where.saludGeneral = filters.salud;
    if (filters.estado) where.estadoRelacion = filters.estado;
    if (filters.tag) where.tags = { has: filters.tag };

    const [data, total] = await Promise.all([
      this.prisma.cliente.findMany({
        where,
        include: {
          tenant: { select: { id: true, slug: true, name: true } },
          sistemas: {
            select: { id: true, nombreSistema: true, tipo: true, estadoTecnico: true },
          },
          tareas: {
            where: { estado: { not: 'Hecho' } },
            select: { id: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.cliente.count({ where }),
    ]);

    return {
      data: data.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        tenant: c.tenant,
        saludGeneral: c.saludGeneral,
        estadoRelacion: c.estadoRelacion,
        tags: c.tags,
        sistemas: c.sistemas,
        ultimaActividad: c.updatedAt,
        tareasPendientes: c.tareas.length,
        createdAt: c.createdAt,
      })),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }
}
```

### Componentes frontend (admin-web)

```text
app/
├── page.tsx                    → Dashboard principal (server component)
├── components/
│   ├── dashboard/
│   │   ├── MetricsBar.tsx       → 4 tarjetas de métricas resumen
│   │   ├── ClientCard.tsx       → Tarjeta individual de cliente
│   │   ├── ClientGrid.tsx       → Grid responsive de tarjetas
│   │   └── DashboardFilters.tsx → Barra de filtros + búsqueda
│   └── shared/
│       ├── HealthBadge.tsx      → 🟢🟡🔴 badge reusable
│       └── Pagination.tsx       → Paginación
└── lib/
    └── api.ts                   → Fetch wrapper con auth
```

## 5. API / Interfaces

### 5.1 Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/admin/dashboard` | Métricas agregadas del sistema |
| `GET` | `/api/v1/admin/clientes` | Lista paginada de clientes (cross-tenant) |

### 5.2 Tipos / DTOs / Schemas

```ts
export const DashboardFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  salud: SaludGeneral.optional(),
  estado: EstadoRelacion.optional(),
  tag: z.string().optional(),
});

export interface DashboardMetrics {
  totalClientes: number;
  activos: number;
  conIncidencias: number;
  criticos: number;
  tareasPendientesGlobales: number;
  tenantsActivos: number;
}

export interface ClienteCardDto {
  id: string;
  nombre: string;
  tenant: { id: string; slug: string; name: string };
  saludGeneral: string;
  estadoRelacion: string;
  tags: string[];
  sistemas: Array<{ id: string; nombreSistema: string; tipo: string; estadoTecnico: string }>;
  ultimaActividad: string;
  tareasPendientes: number;
  createdAt: string;
}
```

## 6. Modelo de datos

Sin cambios en el modelo de datos. Los datos ya existen en las tablas `cliente`, `sistema`, `tarea` y `tenant` del esquema Prisma.

## 7. Tests requeridos

### 7.1 Unitarios

- [ ] `DashboardFiltersSchema` valida filtros correctamente
- [ ] `AdminDashboardService.getDashboard()` calcula métricas correctas
- [ ] Formateo de fechas y estados

### 7.2 Integración

- [ ] `GET /api/v1/admin/dashboard` con token superadmin → 200 + métricas
- [ ] `GET /api/v1/admin/dashboard` sin token → 401
- [ ] `GET /api/v1/admin/dashboard` con token de tenant admin → 403
- [ ] `GET /api/v1/admin/clientes` sin filtros → lista completa paginada
- [ ] `GET /api/v1/admin/clientes?search=garcia` → filtra por nombre
- [ ] `GET /api/v1/admin/clientes?salud=🔴` → solo críticos
- [ ] `GET /api/v1/admin/clientes?tag=fiscal` → filtra por tag

### 7.3 Seguridad

- [ ] Test de fuga cross-tenant en datos del dashboard
- [ ] Usuario admin de tenant NO puede acceder a `/admin/*` endpoints

## 8. Checklist de implementación

- [ ] Spec aprobada
- [ ] Tests escritos y fallando (red)
- [ ] `AdminDashboardService` con métricas + listado
- [ ] `AdminDashboardController` con endpoints
- [ ] `AdminRoleGuard` para restringir endpoints a superadmin
- [ ] `MetricsBar` componente
- [ ] `ClientCard` + `ClientGrid` componentes
- [ ] `DashboardFilters` con búsqueda y filtros
- [ ] Tests de integración
- [ ] Refactor
- [ ] Lint y formato
- [ ] Cobertura ≥ 80%
- [ ] Commit con Conventional Commit

## 9. Notas / Preguntas abiertas

- **Rendimiento de métricas:** para decenas de clientes no hay problema. Para cientos, convendrá cachear las métricas (Redis, 5 min).
- **Ordenamiento:** por defecto por `updatedAt` descendente (última actividad). Futuro: ordenamiento configurable.
- **Tags como filtro:** los tags son un array nativo de PostgreSQL. La query `has` usa GIN index implícito para arrays en Prisma. Verificar performance con muchos tags.
- **Ultima actividad:** actualmente usa `updatedAt` del cliente. Considerar si debería reflejar la fecha del último evento de bitácora asociado.

## 10. Referencias

- `docs/DESIGN.md` — sección 4.1 (Dashboard general / Mapa de Clientes) y sección 3 (Modelo de datos)
- `docs/specs/SPEC-0002-multi-tenant-isolation-auth.md` — autenticación y guards
- `packages/database/prisma/schema.prisma` — modelos Cliente, Sistema, Tarea
- `packages/shared/src/index.ts` — Zod enums compartidos
