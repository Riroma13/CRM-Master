import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { PermissionResult } from '@shared/identity/permission.types';

interface RBACCacheEntry {
  permissions: string[];
  roleNames: string[];
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

function matchesPermission(userPerm: string, required: string): boolean {
  if (userPerm === required) return true;
  if (userPerm === '*:*') return true;

  const colonIdx = userPerm.indexOf(':');
  const reqColonIdx = required.indexOf(':');
  if (colonIdx === -1 || reqColonIdx === -1) return false;

  const userResource = userPerm.slice(0, colonIdx);
  const userAction = userPerm.slice(colonIdx + 1);
  const reqResource = required.slice(0, reqColonIdx);
  const reqAction = required.slice(reqColonIdx + 1);

  if (userResource === '*' && userAction === reqAction) return true;
  if (userAction === '*' && userResource === reqResource) return true;

  return false;
}

@Injectable()
export class RBACEngine {
  private readonly logger = new Logger(RBACEngine.name);
  private cache = new Map<string, RBACCacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  private cacheKey(tenantId: string, userId: string): string {
    return `${tenantId}:${userId}`;
  }

  private isCacheValid(entry: RBACCacheEntry): boolean {
    return Date.now() < entry.expiresAt;
  }

  private async loadUserPermissions(tenantId: string, userId: string): Promise<RBACCacheEntry> {
    const memberships = await this.prisma.admin.membership.findMany({
      where: { tenantId, userId },
    });

    const roleIds = [...new Set(memberships.map((m: { roleId: string }) => m.roleId))];

    let permissions: string[] = [];
    let roleNames: string[] = [];

    if (roleIds.length > 0) {
      const roles = await this.prisma.admin.role.findMany({
        where: { id: { in: roleIds }, tenantId },
      });

      permissions = [...new Set(roles.flatMap((r: { permissions: string[] }) => r.permissions as string[]))] as string[];
      roleNames = roles.map((r: { name: string }) => r.name);
    }

    const entry: RBACCacheEntry = {
      permissions,
      roleNames,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    this.cache.set(this.cacheKey(tenantId, userId), entry);
    return entry;
  }

  async checkPermission(tenantId: string, userId: string, permission: string): Promise<PermissionResult> {
    const key = this.cacheKey(tenantId, userId);
    let entry = this.cache.get(key);

    if (!entry || !this.isCacheValid(entry)) {
      entry = await this.loadUserPermissions(tenantId, userId);
    }

    for (const userPerm of entry.permissions) {
      if (matchesPermission(userPerm, permission)) {
        return {
          allowed: true,
          role: entry.roleNames[0],
          grantedBy: userPerm,
        };
      }
    }

    return { allowed: false };
  }

  async getUserPermissions(tenantId: string, userId: string): Promise<string[]> {
    const key = this.cacheKey(tenantId, userId);
    let entry = this.cache.get(key);

    if (!entry || !this.isCacheValid(entry)) {
      entry = await this.loadUserPermissions(tenantId, userId);
    }

    return [...entry.permissions];
  }

  async hasPermission(tenantId: string, userId: string, permission: string): Promise<boolean> {
    const result = await this.checkPermission(tenantId, userId, permission);
    return result.allowed;
  }

  invalidateCache(tenantId: string, userId?: string): void {
    if (userId) {
      this.cache.delete(this.cacheKey(tenantId, userId));
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${tenantId}:`)) {
        this.cache.delete(key);
      }
    }
  }
}
