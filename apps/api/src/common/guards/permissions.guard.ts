import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ROLE_MAP } from '../auth/permissions';
import { AuditService } from '../../modules/audit/audit.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<{ resource: string; action: string } | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permission required, allow
    if (!permission) return true;

    const request = context.switchToHttp().getRequest();
    const user = (request as any).user;

    // Superadmin bypasses permission checks
    if (user?.role === 'superadmin') return true;

    // Resolve role from our role name (stored in user.role)
    const roleName = user?.role || 'lector';
    const role = ROLE_MAP[roleName];
    if (!role) {
      this.audit.log({
        tenantId: user?.tenantId || 'unknown',
        userId: user?.id,
        userEmail: user?.email,
        action: 'denied',
        resource: permission.resource,
        details: `Rol desconocido: ${roleName}`,
      });
      throw new ForbiddenException(`Acceso denegado: rol "${roleName}" no reconocido`);
    }

    const result = role.authorize({ [permission.resource]: [permission.action] });

    if (!result.success) {
      this.audit.log({
        tenantId: user?.tenantId || 'unknown',
        userId: user?.id,
        userEmail: user?.email,
        action: 'denied',
        resource: permission.resource,
        details: `Usuario con rol ${roleName} no tiene permiso ${permission.action} en ${permission.resource}`,
      });
      throw new ForbiddenException(
        `Acceso denegado: no tienes permiso para "${permission.action}" en "${permission.resource}"`,
      );
    }

    return true;
  }
}
