# Guard Migration Plan — Dual Permission System

## Context

There is an existing `PermissionsGuard` global with `@RequirePermission(resource, action)` (e.g. `@RequirePermission('clientes', 'read')`) based on Better-Auth Access Control. The new Identity Platform uses `@RequirePermission('resource:action')` (e.g. `@RequirePermission('clientes:read')`) with the new RBACEngine.

## Phase 1 — Coexistence (current, MVP)

**Status:** ACTIVE

Both guards are active. The new `PermissionGuard` (`apps/api/src/modules/identity/rbac/permission.guard.ts`) coexists with the existing `PermissionsGuard` (`apps/api/src/common/guards/permissions.guard.ts`).

- Each decorator defines a distinct metadata key:
  - Old: `@RequirePermission(resource, action)` → `PERMISSIONS_KEY` (`'permissions'`)
  - New: `@RequirePermission('resource:action')` → `IDENTITY_PERMISSIONS_KEY` (`'identity_permissions'`)
- Each guard only reacts to its own metadata key; the other guard returns `true` (passthrough).
- New endpoints (identity, directory) use the new format.
- Existing controllers keep the old format.

## Phase 2 — Controller Migration (next SPEC)

**Status:** PENDING

Migrate 3 existing controllers from old `@RequirePermission(resource, action)` to new `@RequirePermission('resource:action')`.

### Migration order

| # | Controller | Usages | Old format | New format |
|---|-----------|--------|------------|------------|
| 1 | `tenant-clientes.controller.ts` | 4 | `@RequirePermission('clientes', 'read')` | `@RequirePermission('clientes:read')` |
|   |           |        | `@RequirePermission('clientes', 'create')` | `@RequirePermission('clientes:create')` |
|   |           |        | `@RequirePermission('clientes', 'update')` | `@RequirePermission('clientes:update')` |
|   |           |        | `@RequirePermission('clientes', 'delete')` | `@RequirePermission('clientes:delete')` |
| 2 | `tenant-presupuestos.controller.ts` | 5 | `@RequirePermission('clientes', 'read')` | `@RequirePermission('clientes:read')` |
|   |           |        | `@RequirePermission('clientes', 'create')` | `@RequirePermission('clientes:create')` |
|   |           |        | `@RequirePermission('clientes', 'update')` | `@RequirePermission('clientes:update')` |
|   |           |        | `@RequirePermission('clientes', 'delete')` | `@RequirePermission('clientes:delete')` |
| 3 | `communications.controller.ts` | 2 | `@RequirePermission('clientes', 'read')` | `@RequirePermission('clientes:read')` |
|   |           |        | `@RequirePermission('clientes', 'update')` | `@RequirePermission('clientes:update')` |

**Total:** 11 decorators across 3 files.

### Migration steps

1. Replace each old `@RequirePermission(resource, action)` with `@RequirePermission('resource:action')`.
2. Ensure RBACEngine has corresponding permissions for the `cliente` resource.
3. Run existing tests; they should pass because:
   - The new `PermissionGuard` evaluates the same permission semantics.
   - The old `PermissionsGuard` returns `true` for endpoints without its metadata key.
4. Remove the old `PermissionsGuard` from the controller or rely on the fact it won't fire.

### Required RBACEngine permissions for `cliente` resource

The BA Access Control already defines these actions for `cliente`: `['create', 'read', 'update', 'delete']`. The RBACEngine must evaluate `clientes:read`, `clientes:create`, `clientes:update`, `clientes:delete`.

Default roles should include:

| Role | `cliente` permissions |
|------|----------------------|
| admin | `clientes:create`, `clientes:read`, `clientes:update`, `clientes:delete` |
| manager | `clientes:read`, `clientes:update` |
| member | `clientes:read` |
| viewer | `clientes:read` |

## Phase 3 — Cleanup (post-migration)

**Status:** PENDING

Once all controllers use the new format:

1. Remove `PermissionsGuard` from `app.module.ts` (providers + exports).
2. Delete `apps/api/src/common/guards/permissions.guard.ts`.
3. Delete `apps/api/src/common/decorators/permissions.decorator.ts`.
4. Delete `apps/api/src/common/auth/permissions.ts` (ROLE_MAP, Access Control definitions).
5. Rename new `PermissionGuard` → `PermissionsGuard` if backward compatibility is desired.

## Rollback plan

If Phase 2 migration causes issues:

- Revert the changed decorators in each controller.
- Both guards remain active; old format continues to work.
- No data loss risk — permission check is read-only.
