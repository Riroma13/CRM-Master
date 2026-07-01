# Spec 0006 — Portal del tenant: citas/calendario

**Spec ID:** `SPEC-0006`
**Estado:** `proposed`
**Autor:** @ricardo
**Fecha:** 2026-07-01
**Área:** `api` | `tenant-web` | `infra`

---

## 1. Contexto / Problema

Los clientes finales de los tenants necesitan agendar citas: consultas fiscales, revisiones, reuniones de seguimiento. Cada tenant necesita su propia configuración de calendario, slots disponibles y notificaciones.

Esta es la primera funcionalidad del portal del tenant que requiere lógica de scheduling, gestión de slots, bloqueo de horarios, y posiblemente integración con calendarios externos (Google Calendar, Outlook).

## 2. Objetivo

Permitir que los clientes finales agenden citas con el tenant a través del portal, con selección de fecha/hora, confirmación automática y notificaciones. El tenant admin configura su disponibilidad desde la configuración del portal.

---

## 3. Mini-ADR: Motor de calendario

### Contexto de la decisión

Necesitamos un motor que gestione:

- Disponibilidad por día/hora (slots configurables por tenant)
- Booking de citas con prevención de doble reserva
- Bloqueo de horarios (festivos, vacaciones, descansos)
- Notificaciones de recordatorio
- (Futuro) sincronización con calendarios externos

### Opciones consideradas

#### Opción A: Cal.com self-hosted

| Aspecto | Evaluación |
|---|---|
| **Madurez** | Muy maduro, usado en producción por miles |
| **Funcionalidades** | Slots, disponibilidad, videollamadas, recordatorios, calendarios externos |
| **Esfuerzo de integración** | Medio: requiere deploy separado, base de datos propia, webhooks para sincronizar con nuestra DB |
| **Multi-tenancy** | Soporte nativo de equipos/organizaciones |
| **Personalización UI** | Limitada a branding básico; embedding via booking widget |
| **Operación** | Un servicio más que mantener (otra DB, otro deploy) |
| **Overead para MVP** | Alto — cal.com es un producto entero; nosotros necesitamos una fracción |

#### Opción B: Motor propio sobre BullMQ + PostgreSQL

| Aspecto | Evaluación |
|---|---|
| **Esfuerzo inicial** | Medio-alto: slots, booking, disponibilidad, bloqueos |
| **Control** | Total — diseñado exactamente para nuestro modelo multi-tenant |
| **Multi-tenancy** | Nativo — mismo patrón `tenant_id` que el resto del sistema |
| **Personalización UI** | Total — componentes React propios |
| **Operación** | Sin dependencias externas nuevas (ya tenemos BullMQ + Redis) |
| **Recordatorios** | BullMQ jobs programados para notificaciones |
| **Sincronización externa** | Posible vía adaptador (Google Calendar API), pero no en v1 |
| **Peso en el codebase** | Módulo `Citas` auto-contenido en apps/api |

### Opción C: Híbrida — motor propio + puerta a cal.com en v2

Empezar con motor propio (Opción B) para v1, con una interfaz abstracta (`CalendarProvider`) que permita conectar cal.com como backend en v2 si el scheduling se vuelve complejo.

### Decisión

**✅ Opción C — Híbrida: motor propio en v1 con interfaz abstracta.**

**Razones:**
1. Cal.com es una sobrecarga operativa innecesaria para el MVP — otro deploy, otra DB, otro mantenimiento.
2. La funcionalidad que necesitamos en v1 es acotada: slots + booking + recordatorios.
3. Cohesión técnica: usamos el mismo stack (PostgreSQL, BullMQ, tenant_id) que el resto del sistema.
4. La interfaz `CalendarProvider` permite migrar a cal.com en v2 sin reescribir el módulo.
5. Si el modelo de citas se complejiza (recurrencia avanzada, disponibilidad compleja, integración external), evaluamos cal.com como backend.

**Trade-off:** más código inicial que integrar cal.com, pero menos operación a largo plazo mientras el modelo se mantenga simple.

### Consecuencias

- Crear módulo `CitasModule` con `CalendarProvider` como interfaz abstracta
- `LocalCalendarProvider` implementa la lógica de slots + booking sobre PostgreSQL
- BullMQ jobs: `cita-recordatorio` (N minutes antes), `cita-cancelacion-auto` (si no-confirma)
- La migración a cal.com implicaría implementar `CalDotComProvider` bajo la misma interfaz

---

## 4. Alcance

### 4.1 In-scope

- [ ] Modelo `Cita` + `Disponibilidad` en Prisma con tenant_id
- [ ] Interfaz abstracta `CalendarProvider`
- [ ] Implementación `LocalCalendarProvider` (slots + booking sobre PostgreSQL)
- [ ] Endpoint `GET /api/v1/tenant/calendario/slots` — slots disponibles para una fecha/rango
- [ ] Endpoint `POST /api/v1/tenant/calendario/citas` — agendar cita (cliente final)
- [ ] Endpoint `GET /api/v1/tenant/calendario/citas` — listar citas (admin tenant)
- [ ] Endpoint `PATCH /api/v1/tenant/calendario/citas/:id` — cancelar/confirmar cita
- [ ] Endpoint `GET /api/v1/tenant/calendario/disponibilidad` — config de disponibilidad (admin)
- [ ] Endpoint `PUT /api/v1/tenant/calendario/disponibilidad` — actualizar disponibilidad (admin)
- [ ] Slots configurables por tenant (días laborables, horas, duración de cita)
- [ ] Bloqueo manual de fechas/horarios (vacaciones, festivos)
- [ ] Prevención de doble reserva (transactional)
- [ ] UI en tenant-web: calendario visual para cliente final + panel de gestión para admin
- [ ] Tests de integración

### 4.2 Out-of-scope

- Recordatorios automáticos (BullMQ — Spec futura)
- Integración con Google Calendar / Outlook (v2, vía CalendarProvider)
- Videollamadas integradas (v2)
- Recurrencia avanzada (cada X semanas) — v1.5
- Zona horaria automática por tenant (configurable manual en v1)
- Cancelaciones con motivo

## 5. Diseño / Decisión técnica

### Modelo de datos

```prisma
model Disponibilidad {
  id        String   @id @default(uuid())
  tenantId  String   @unique @map("tenant_id")
  timezone  String   @default("Europe/Madrid")
  slotDuration Int   @default(30) @map("slot_duration") // minutos
  minNotice Int      @default(240) @map("min_notice") // minutos mínimo de antelación
  maxDays   Int      @default(30) @map("max_days") // máximo días vista
  dailySchedule Json  @default("[{\"day\":1,\"start\":\"09:00\",\"end\":\"14:00\"},{\"day\":1,\"start\":\"16:00\",\"end\":\"19:00\"},{\"day\":2,\"start\":\"09:00\",\"end\":\"14:00\"},{\"day\":3,\"start\":\"09:00\",\"end\":\"14:00\"},{\"day\":4,\"start\":\"09:00\",\"end\":\"14:00\"},{\"day\":5,\"start\":\"09:00\",\"end\":\"14:00\"}]") @map("daily_schedule")
  blockedDates Json? @default("[]") @map("blocked_dates") // ["2026-08-15", "2026-12-25"]
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@map("disponibilidad")
}

model Cita {
  id         String   @id @default(uuid())
  tenantId   String   @map("tenant_id")
  clienteId  String?  @map("cliente_id") // opcional: cliente final del tenant
  titulo     String   @default("Consulta")
  descripcion String?
  fecha      DateTime // inicio de la cita
  duracion   Int      @default(30) // minutos
  estado     String   @default("pendiente") // pendiente | confirmada | cancelada | completada
  clienteNombre  String?  @map("cliente_nombre")
  clienteEmail   String?  @map("cliente_email")
  clienteTelefono String? @map("cliente_telefono")
  notasInternas  String?  @map("notas_internas")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
  @@index([fecha])
  @@index([tenantId, estado])
  @@map("citas")
}
```

### Interfaz abstracta CalendarProvider

```typescript
export interface CalendarProvider {
  getSlots(tenantId: string, date: Date): Promise<Slot[]>;
  bookSlot(tenantId: string, input: BookSlotInput): Promise<Cita>;
  confirmCita(citaId: string): Promise<Cita>;
  cancelCita(citaId: string, motivo?: string): Promise<Cita>;
}

export interface Slot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface BookSlotInput {
  fecha: Date;
  duracion: number;
  clienteNombre?: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  descripcion?: string;
}
```

### Flujo de booking

```text
[Cliente final en portal del tenant]
        │
        ▼
GET /calendario → ve calendario con slots disponibles
        │
        ▼
Selecciona fecha/hora → POST /calendario/citas
{
  "fecha": "2026-07-05T10:00:00Z",
  "clienteNombre": "Pedro López",
  "clienteEmail": "pedro@email.com"
}
        │
        ▼
[1] Validar: fecha > minNotice (4h antes)
[2] Validar: slot disponible (no hay otra cita en ese horario)
[3] Validar: fecha no bloqueada (festivo/vacaciones)
[4] Validar: dentro del horario configurado para ese día
[5] Crear Cita con estado "pendiente"
[6] (Futuro) Programar recordatorio con BullMQ

        │
        ▼
201 Created
{
  "id": "uuid",
  "fecha": "2026-07-05T10:00:00Z",
  "duracion": 30,
  "estado": "pendiente",
  "confirmacionUrl": "https://asesoria-garcia.crmmaster.com/citas/uuid/confirmar"
}
```

### Prevención de doble reserva

```typescript
async bookSlot(tenantId: string, input: BookSlotInput): Promise<Cita> {
  return this.prisma.$transaction(async (tx) => {
    // Check doble reserva
    const existing = await tx.cita.findFirst({
      where: {
        tenantId,
        fecha: {
          gte: input.fecha,
          lt: new Date(input.fecha.getTime() + input.duracion * 60000),
        },
        estado: { in: ['pendiente', 'confirmada'] },
      },
    });

    if (existing) {
      throw new ConflictException('Slots no disponible');
    }

    return tx.cita.create({ data: { ...input, tenantId } });
  });
}
```

### UI en tenant-web

**Vista cliente final:**
```text
app/calendario/
├── page.tsx                 → Vista pública de calendario
├── components/
│   ├── CalendarPicker.tsx   → Selector de mes/día
│   ├── SlotList.tsx         → Slots disponibles para el día seleccionado
│   ├── BookingForm.tsx      → Formulario de datos del cliente
│   └── BookingConfirmation.tsx → Confirmación post-booking
```

**Vista admin (configuración del portal):**
```text
app/admin/calendario/
├── page.tsx                 → Gestión de disponibilidad
├── components/
│   ├── ScheduleEditor.tsx   → Editor de horarios por día
│   ├── BlockedDates.tsx     → Gestión de fechas bloqueadas
│   └── CitaList.tsx         → Lista de próximas citas
```

## 6. API / Interfaces

### 6.1 Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/v1/tenant/calendario/slots?fecha=2026-07-05` | Público | Slots disponibles para una fecha |
| `POST` | `/api/v1/tenant/calendario/citas` | Público | Agendar cita |
| `GET` | `/api/v1/tenant/calendario/citas` | Tenant admin | Listar citas del tenant |
| `PATCH` | `/api/v1/tenant/calendario/citas/:id` | Tenant admin | Confirmar/cancelar cita |
| `GET` | `/api/v1/tenant/calendario/disponibilidad` | Tenant admin | Ver config de disponibilidad |
| `PUT` | `/api/v1/tenant/calendario/disponibilidad` | Tenant admin | Actualizar disponibilidad |

### 6.2 Tipos / DTOs

```ts
export const BookCitaSchema = z.object({
  fecha: z.string().datetime(),
  clienteNombre: z.string().min(2).optional(),
  clienteEmail: z.string().email().optional(),
  clienteTelefono: z.string().optional(),
  descripcion: z.string().max(500).optional(),
});

export const UpdateCitaSchema = z.object({
  estado: z.enum(['confirmada', 'cancelada', 'completada']),
  notasInternas: z.string().optional(),
});

export const DisponibilidadSchema = z.object({
  timezone: z.string().default('Europe/Madrid'),
  slotDuration: z.number().int().min(15).max(120).default(30),
  minNotice: z.number().int().min(60).max(4320).default(240),
  maxDays: z.number().int().min(7).max(90).default(30),
  dailySchedule: z.array(z.object({
    day: z.number().int().min(0).max(6),
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  })),
  blockedDates: z.array(z.string()).default([]),
});
```

## 7. Tests requeridos

### 7.1 Unitarios

- [ ] `DisponibilidadSchema` valida horarios correctamente
- [ ] Generación de slots respeta la configuración del tenant
- [ ] Slots no se generan en fechas bloqueadas
- [ ] Slots no se generan si falta minNotice
- [ ] Doble reserva es imposible en transacción
- [ ] `CalendarProvider` interfaz funciona con `LocalCalendarProvider`

### 7.2 Integración

- [ ] `GET /calendario/slots` → lista de slots correcta
- [ ] `POST /calendario/citas` → 201 + cita creada
- [ ] `POST /calendario/citas` con slot ocupado → 409
- [ ] `POST /calendario/citas` con minNotice incumplido → 422
- [ ] `PATCH /calendario/citas/:id` → estado actualizado
- [ ] `GET /calendario/citas` → solo citas del tenant (fuga test)

### 7.3 Seguridad

- [ ] Un tenant no ve citas de otro tenant
- [ ] Creación de cita no requiere auth (es público) pero lleva tenant_id del slug
- [ ] Admin de tenant A no puede modificar citas de tenant B

## 8. Checklist de implementación

- [ ] Spec aprobada
- [ ] Tests escritos y fallando (red)
- [ ] Migración Prisma: `disponibilidad` + `citas`
- [ ] Interfaz `CalendarProvider` + `LocalCalendarProvider`
- [ ] Servicio de disponibilidad (slots, bloqueos)
- [ ] Servicio de booking (prevención doble reserva)
- [ ] CalendarioController (público + admin)
- [ ] UI tenant-web: CalendarPicker, SlotList, BookingForm
- [ ] UI admin: ScheduleEditor, BlockedDates, CitaList
- [ ] Tests de integración
- [ ] Tests de fuga multi-tenant
- [ ] Refactor
- [ ] Cobertura ≥ 80%
- [ ] Commit

## 9. Notas / Preguntas abiertas

- **Recordatorios:** se implementarán en spec separada usando BullMQ. La interfaz `CalendarProvider` queda preparada.
- **Notificaciones al admin del tenant:** cuando alguien agenda una cita, el admin debería recibir algún aviso (email, notificación en la app). Para v1: basta con que aparezca en el listado de citas.
- **Zona horaria:** en v1, el tenant admin configura su timezone manualmente. El cliente final ve los slots en la timezone del tenant. No hay detección automática.
- **Límite de citas por día:** añadir a `Disponibilidad` un `maxCitasPerDay` opcional.

## 10. Referencias

- `docs/architecture/adr/0001-multi-tenancy-strategy.md` — resolución por subdominio
- `docs/specs/SPEC-0005-tenant-documentos.md` — primera funcionalidad del portal (patrón de referencia)
- `packages/database/prisma/schema.prisma` — modelos existentes
