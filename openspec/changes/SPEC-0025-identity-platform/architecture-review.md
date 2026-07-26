# Architecture Review — SPEC-0025: Identity & Organization Platform

**Verdict: REJECTED**

## Blocking Issues

| # | Finding |
|---|---------|
| 🔴 #1 | **`organizationId` bypasses tenant scoping** — `forTenant()` filtra por `tenantId`. `organizationId` es invisible. Data leak. |
| 🔴 #2 | **Dual permission system** — Ya existe `PermissionsGuard` + `@RequirePermission('clientes', 'read')`. El diseño crea un segundo sistema incompatible. |
| 🔴 #3 | **Sin mapping de usuarios existentes** — `User.role` (superadmin/admin/user), `ROLE_MAP` (owner/operador/lector), `ClientUser`. Ninguno mapeado a los nuevos roles. |

## High Severity

| # | Finding |
|---|---------|
| 🟡 #4 | `organizationId` vs `tenantId` — inconsistencia con las 40+ tablas existentes |
| 🟡 #5 | RBAC cache TTL 5min — permiso revocado sigue activo. Sin invalidación en mutate. |
| 🟡 #6 | Integración Better-Auth indefinida — modelos duplicados sin sync. |
| 🟡 #7 | Team depth no enforced — "max 3" sin CHECK constraint ni validación. |
| 🟡 #8 | Invitation token en plaintext en DB — leak expone todos los tokens. |
| 🟡 #9 | Admin role puede eliminarse — tenant lockout sin break-glass. |

## Conditions for re-submission

1. Renombrar `organizationId` → `tenantId` en todos los modelos
2. Plan de migración del PermissionGuard existente (deprecate → migrate → remove)
3. Role mapping de usuarios existentes + estrategia para ClientUser
4. Cache invalidation en mutate de roles (event-driven)
5. Token hashing en Invitation (SHA-256, no plaintext)
6. CHECK constraint `depth <= 3` + validación
7. `isSystem` flag en Role para evitar borrar admin
8. Gestión de signing key para invitation tokens
