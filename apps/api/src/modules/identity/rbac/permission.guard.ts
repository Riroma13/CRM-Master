import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RBACEngine } from './rbac-engine';
import { IDENTITY_PERMISSIONS_KEY } from './permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacEngine: RBACEngine,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<string>(
      IDENTITY_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permission) return true;

    const request = context.switchToHttp().getRequest();
    const tenantId = (request as any).tenantId;
    const userId = (request as any).user?.id;

    if (!tenantId || !userId) {
      throw new ForbiddenException('Authentication required');
    }

    const result = await this.rbacEngine.checkPermission(tenantId, userId, permission);

    if (!result.allowed) {
      throw new ForbiddenException(`Access denied: missing permission "${permission}"`);
    }

    return true;
  }
}
