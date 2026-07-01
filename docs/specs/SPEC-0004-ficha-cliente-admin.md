# Spec 0004 — Ficha de Cliente (admin)

**Spec ID:** `SPEC-0004`
**Estado:** `proposed`
**Autor:** @ricardo
**Fecha:** 2026-07-01
**Área:** `api` | `admin-web`

---

## 1. Contexto / Problema

El dashboard (Spec 0003) da una vista rápida de todos los clientes. Pero Ricardo necesita profundizar: ver el detalle completo de un cliente, sus sistemas, inventario, bitácora de decisiones y tareas pendientes, todo desde una sola pantalla.

La sección 4.2 del DESIGN.md describe la ficha de cliente con pestañas: Resumen, Sistema(s), Inventario, Bitácora, Tareas.

## 2. Objetivo

Construir la ficha de cliente en Mission Control con 5 pestañas funcionales, cada una con su endpoint y vista parcial, permitiendo navegar y gestionar la información completa de un cliente desde una sola pantalla.

## 3. Alcance

### 3.1 In-scope

- [ ] Endpoint `GET /api/v1/admin/clientes/:id` con detalle completo
- [ ] Endpoint `PATCH /api/v1/admin/clientes/:id` para actualizar campos
- [ ] Pestaña **Resumen** — notas generales + últimos eventos de bitácora + indicadores
- [ ] Pestaña **Sistema(s)** — lista de sistemas asociados con su estado técnico + acceso rápido
- [ ] Pestaña **Inventario** — items agrupados por categoría, filtrables por estado
- [ ] Pestaña **Bitácora** — timeline cronológico de eventos (tipo timeline vertical)
- [ ] Pestaña **Tareas** — lista de tareas pendientes/asociadas al cliente
- [ ] Navegación por pestañas con persistencia en URL (`?tab=resumen`)
- [ ] Endpoint para crear eventos de bitácora desde la ficha
- [ ] Tests de integración

### 3.2 Out-of-scope

- Vista de detalle de Sistema individual (propia vista, referenciada desde aquí)
- Edición inline de inventario
- Drag & drop de tareas (Kanban — v1.5)
- Filtros avanzados dentro de cada pestaña (solo filtro básico por estado)
- Adjuntar archivos a eventos de bitácora (v2)

## 4. Diseño / Decisión técnica

### Layout de la ficha

```text
┌───────────────────────────────────────────────────────────┐
│  ← Volver al Dashboard                                    │
│                                                           │
│  Asesoría García                        🟢 🟢 Editar      │
│  Asesoría Fiscal · desde jun 2024                         │
│  📍 garcia@asesoria.com · factura mensual, VPS propio      │
├───────────────────────────────────────────────────────────┤
│  [Resumen] [Sistemas] [Inventario] [Bitácora] [Tareas]   │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  (Contenido de la pestaña activa)                         │
│                                                           │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### API endpoints

#### `GET /api/v1/admin/clientes/:id`

```http
GET /api/v1/admin/clientes/uuid
Authorization: Bearer <superadmin_token>
```

```http
200 OK
{
  "id": "uuid",
  "nombre": "Asesoría García",
  "tipoNegocio": "Asesoría Fiscal",
  "contactoPrincipal": "Juan García - juan@garcia.com",
  "estadoRelacion": "Activo",
  "saludGeneral": "🟢",
  "fechaInicio": "2024-06-01",
  "notasGenerales": "Cliente desde la época de BeeHive v1...",
  "tags": ["factura mensual", "VPS propio"],
  "tenant": { "id": "uuid", "slug": "asesoria-garcia", "name": "Asesoría García S.L." },
  "createdAt": "2024-06-01T00:00:00Z",
  "updatedAt": "2026-07-01T10:00:00Z"
}
```

#### `PATCH /api/v1/admin/clientes/:id`

```http
PATCH /api/v1/admin/clientes/uuid
Authorization: Bearer <superadmin_token>
Content-Type: application/json

{
  "nombre": "Asesoría García Actualizado",
  "saludGeneral": "🟡",
  "notasGenerales": "Nueva nota…",
  "tags": ["factura mensual", "VPS propio", "migración pendiente"]
}
```

```http
200 OK
{ /* cliente actualizado */ }
```

#### `GET /api/v1/admin/clientes/:id/eventos`

```http
GET /api/v1/admin/clientes/uuid/eventos?limit=20
Authorization: Bearer <superadmin_token>
```

```http
200 OK
{
  "data": [
    {
      "id": "uuid",
      "sistema": { "id": "uuid", "nombreSistema": "BeeHive producción" },
      "fecha": "2026-06-30T10:00:00Z",
      "tipo": "Decisión",
      "titulo": "Migrar a PostgreSQL 16",
      "descripcion": "Se acordó migrar...",
      "siguienteAccion": "Programar ventana de mantenimiento"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 45 }
}
```

#### `POST /api/v1/admin/clientes/:id/eventos`

```http
POST /api/v1/admin/clientes/uuid/eventos
Authorization: Bearer <superadmin_token>
Content-Type: application/json

{
  "sistemaId": "uuid",
  "tipo": "Decisión",
  "titulo": "Nueva integración con FacturaDirecta",
  "descripcion": "Se aprobó la integración...",
  "siguienteAccion": "Contactar con soporte de FacturaDirecta"
}
```

```http
201 Created
{ /* evento creado */ }
```

#### `GET /api/v1/admin/clientes/:id/tareas`

```http
GET /api/v1/admin/clientes/uuid/tareas?estado=Pendiente
Authorization: Bearer <superadmin_token>
```

### Pestañas

**Resumen:**
- Notas generales del cliente (markdown, editable inline)
- Últimos 5 eventos de bitácora
- Indicadores rápidos: nº sistemas, items inventario, tareas pendientes

**Sistemas:**
- Lista de sistemas asociados, cada uno con:
  - Nombre, tipo, entorno (enlace clickable), versión
  - Estado técnico 🟢🟡🔴⚪
  - Acceso rápido a vista de detalle del sistema
  - Fecha del último chequeo

**Inventario:**
- Items agrupados por categoría (Módulo funcional / Integración / Automatización / Dato sensible)
- Cada item: nombre, estado (Implementado/Parcial/Planeado/Obsoleto), responsable
- Filtro por estado

**Bitácora:**
- Timeline vertical cronológico
- Cada entrada: fecha, tipo (con icono/color), título, descripción, siguiente acción
- Paginación infinita (scroll o load more)
- Botón "+ Nuevo evento" que abre modal con formulario

**Tareas:**
- Lista filtrable por estado (Pendiente / En curso / Hecho)
- Cada tarea: título, prioridad (Alta/Media/Baja), fecha límite, sistema asociado
- Botón para crear tarea rápida

### Componentes frontend

```text
app/clientes/[id]/
├── page.tsx                       → Ficha de cliente (layout + tabs)
├── components/
│   ├── ClientHeader.tsx           → Cabecera con nombre, salud, tags, editar
│   ├── ClientTabs.tsx             → Navegación por pestañas
│   ├── TabResumen.tsx             → Notas + últimos eventos
│   ├── TabSistemas.tsx            → Lista de sistemas
│   ├── TabInventario.tsx          → Items agrupados por categoría
│   ├── TabBitacora.tsx            → Timeline vertical
│   ├── TabTareas.tsx              → Lista de tareas
│   └── EventoForm.tsx             → Modal para crear evento
```

## 5. API / Interfaces

### 5.1 Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/admin/clientes/:id` | Detalle completo del cliente |
| `PATCH` | `/api/v1/admin/clientes/:id` | Actualizar campos del cliente |
| `GET` | `/api/v1/admin/clientes/:id/eventos` | Eventos de bitácora del cliente |
| `POST` | `/api/v1/admin/clientes/:id/eventos` | Crear nuevo evento |
| `GET` | `/api/v1/admin/clientes/:id/tareas` | Tareas del cliente |
| `POST` | `/api/v1/admin/clientes/:id/tareas` | Crear tarea rápida |

### 5.2 Tipos / DTOs / Schemas

```ts
export const UpdateClienteSchema = z.object({
  nombre: z.string().min(2).optional(),
  tipoNegocio: z.string().optional(),
  contactoPrincipal: z.string().optional(),
  estadoRelacion: EstadoRelacion.optional(),
  saludGeneral: SaludGeneral.optional(),
  notasGenerales: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const CreateEventoSchema = z.object({
  sistemaId: z.string().uuid(),
  tipo: TipoEvento,
  titulo: z.string().min(2),
  descripcion: z.string().optional(),
  siguienteAccion: z.string().optional(),
});

export const CreateTareaRapidaSchema = z.object({
  sistemaId: z.string().uuid().optional(),
  titulo: z.string().min(2),
  prioridad: PrioridadTarea.default('Media'),
  fechaLimite: z.string().datetime().optional(),
});
```

## 6. Modelo de datos

Sin cambios en el modelo. Los datos ya existen en `cliente`, `sistema`, `item_inventario`, `evento_bitacora`, `tarea`.

## 7. Tests requeridos

### 7.1 Unitarios

- [ ] `UpdateClienteSchema` valida actualización parcial
- [ ] `CreateEventoSchema` rechaza título vacío
- [ ] `CreateTareaRapidaSchema` asigna prioridad por defecto

### 7.2 Integración

- [ ] `GET /api/v1/admin/clientes/:id` → 200 + datos completos
- [ ] `GET /api/v1/admin/clientes/:id` con id inexistente → 404
- [ ] `PATCH /api/v1/admin/clientes/:id` → 200 + campos actualizados
- [ ] `GET /api/v1/admin/clientes/:id/eventos` → lista paginada
- [ ] `POST /api/v1/admin/clientes/:id/eventos` → 201 + evento creado
- [ ] `GET /api/v1/admin/clientes/:id/tareas` → lista filtrable
- [ ] `POST /api/v1/admin/clientes/:id/tareas` → 201 + tarea creada

### 7.3 Seguridad

- [ ] Superadmin puede ver cualquier cliente
- [ ] Admin de tenant NO puede acceder a `/admin/*`
- [ ] Eventos creados tienen tenant_id del cliente asociado

## 8. Checklist de implementación

- [ ] Spec aprobada
- [ ] Tests escritos y fallando (red)
- [ ] Controllers para cliente, eventos, tareas
- [ ] ClientHeader, ClientTabs componentes
- [ ] TabResumen, TabSistemas, TabInventario, TabBitacora, TabTareas
- [ ] Modal EventoForm
- [ ] Tests de integración
- [ ] Refactor
- [ ] Cobertura ≥ 80%
- [ ] Commit

## 9. Referencias

- `docs/DESIGN.md` — sección 4.2 (Ficha de Cliente)
- `docs/specs/SPEC-0003-dashboard-mission-control.md` — dashboard padre
- `packages/database/prisma/schema.prisma` — modelos
