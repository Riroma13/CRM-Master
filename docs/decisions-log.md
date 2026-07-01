# Decisiones arquitectónicas — CRM-Master

Índice de Architectural Decision Records (ADRs) del proyecto.

| ADR | Título | Estado | Fecha |
|-----|--------|--------|-------|
| [ADR-0001](./architecture/adr/0001-multi-tenancy-strategy.md) | Estrategia de multi-tenancy y acceso por subdominio | accepted | 2026-06-30 |
| [SPEC-0001](../specs/SPEC-0001-tenant-onboarding.md) | Tenant onboarding — alta, invitación y aprovisionamiento | proposed | 2026-07-01 |
| [SPEC-0002](../specs/SPEC-0002-multi-tenant-isolation-auth.md) | Aislamiento multi-tenant y autenticación con Better-Auth | proposed | 2026-07-01 |

---

## Leyenda de estados

- **draft:** borrador, aún en discusión.
- **proposed:** propuesta formal, pendiente de aprobación.
- **accepted:** aprobada y vigente.
- **deprecated:** obsoleta, ya no aplica pero se conserva por historial.
- **superseded:** reemplazada por otra ADR más reciente.

## Cómo agregar una nueva ADR

1. Copiar la plantilla `docs/architecture/adr/TEMPLATE.md`.
2. Asignar el siguiente número secuencial.
3. Completar todas las secciones.
4. Actualizar esta tabla con el nuevo registro.
5. Si reemplaza una ADR anterior, marcar la anterior como `superseded` y referenciar la nueva.
