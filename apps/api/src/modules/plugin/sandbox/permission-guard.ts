import type { Permission } from '@shared/plugin';

export class PermissionDeniedError extends Error {
  constructor(permission: Permission) {
    super(`Permission denied: ${permission}`);
    this.name = 'PermissionDeniedError';
  }
}

export class PermissionGuard {
  private readonly permissions: Set<Permission>;

  constructor(manifestPermissions: string[]) {
    this.permissions = new Set(manifestPermissions as Permission[]);
  }

  require(permission: Permission): void {
    if (!this.permissions.has(permission)) {
      throw new PermissionDeniedError(permission);
    }
  }

  check(permission: Permission): boolean {
    return this.permissions.has(permission);
  }
}
