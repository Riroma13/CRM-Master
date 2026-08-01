# SESSION — SPEC-0025 Identity Platform

> Fecha: 28 Jul 2026

## Estado

- **Branch**: `merge/spec-0025-identity` (at `d41f8de`, same as `main`)
- **Fase SDD visible actual**: `Apply` (pendiente; Tasks Review completado)
- **SPEC-0025 Identity Platform**:
  - Proposal: ✅ Creado (compatibilidad)
  - Design: ✅ APPROVED_WITH_CONDITIONS
  - Architecture Review: ✅ APPROVED_WITH_CONDITIONS (sin blockers)
  - Tasks: ✅ Creado
  - Tasks Review: ✅ APPROVED_WITH_CONDITIONS (sin blockers)

## Condiciones aprobadas (no bloqueantes)

1. Matriz exacta de rutas protegidas
2. Semántica fail-closed Host/session/membership/tenant/RBAC
3. `hostTenantId` inmutable
4. Exclusión de invitación-aceptación
5. Propiedad de retry solo BullMQ

## Execution gates (no bloqueantes)

- Better Auth catalog/declaration preflight
- Guard execution
- Route exclusions
- Tenant isolation
- Lease behavior
- BullMQ retry ownership
- Terminal DLQ behavior

## Exclusiones

SPEC-0027, SPEC-0028, frontend, client-portal RBAC, SSO/SCIM, Better Auth cleanup no relacionado, `c1a2f90` sin cambios.

## Condiciones de Tasks Review (no bloqueantes)

- Hacer explícitos en RED los casos RED-9 de Host: spoofed, malformed, multiple Host y proxy conflict.
- Verificar literalmente la matriz de rutas/permisos y todas las exclusiones.
- Vincular cada implementación a los paths concretos del Working Set.

## Próximo paso visible

1. Apply Phases 1–5
2. Apply Summary → Verify

## Para arrancar

```bash
cd /home/ubuntu/.openclaw/workspace/CRM-Master
opencode
# Decir: "leé .ai/context/SESSION.md y continuá"
```
