import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class TenantScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check @Public() decorator first — allows bypass for health, login, etc.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

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
