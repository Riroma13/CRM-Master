import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Admin requests (Mission Control) no requieren tenant scope
    if ((request as any).isAdminRequest) {
      return true;
    }

    const tenantId = request.tenantId;
    if (!tenantId) {
      throw new ForbiddenException(
        'Acceso denegado: no se pudo resolver el tenant',
      );
    }

    // Si hay token, verificar que el tenantId del token coincida
    if (request.user?.tenantId && request.user.tenantId !== tenantId) {
      throw new ForbiddenException(
        'Acceso denegado: discrepancia entre el token y el tenant',
      );
    }

    return true;
  }
}
