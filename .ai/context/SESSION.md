# SESSION — SPEC-0025 Identity & Organization Platform

> Fecha: 8 Ago 2026

## Estado

- **Branch**: `main`
- **SPEC-0025 Identity & Organization Platform**: ✅ **COMPLETED** — archivado y mergeado a `main` mediante PR #18
- **Fase SDD visible actual**: `Archive` completado; PR #18 mergeado
- **SPEC-0025**:
  - Proposal: ✅ Creado (compatibilidad)
  - Design: ✅ APPROVED_WITH_CONDITIONS
  - Architecture Review: ✅ APPROVED_WITH_CONDITIONS (sin blockers)
  - Tasks: ✅ Creado
  - Tasks Review: ✅ APPROVED_WITH_CONDITIONS (sin blockers)
  - Apply: ✅ Completado
  - Verify: ✅ Completado
  - Archive: ✅ Completado

## Final CI

- Database tests: ✅ PASS
- Lint: ✅ PASS
- Generated scope verification: ✅ PASS

## Deudas técnicas

- **API ESLint configuration**: ✅ Deuda de configuración resuelta
- **Rate limiter service-side double check redundancy**: ⏳ Sigue sin resolverse; conservar como pendiente

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

- **OAuth social login** — siguiente candidato del roadmap
- No se ha creado un SPEC nuevo todavía

## Para arrancar

```bash
cd /home/ubuntu/.openclaw/workspace/CRM-Master
opencode
# No iniciar un SPEC nuevo todavía; el siguiente candidato es OAuth social login.
```
