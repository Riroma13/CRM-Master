import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_BOUNDARY_KEY, IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class TenantScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // @Public() bypasses authentication in BetterAuthGuard, but it does not
    // disable scope checks when an authenticated principal is present.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const authBoundary = this.reflector.getAllAndOverride<string | undefined>(AUTH_BOUNDARY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (authBoundary) return true;

    const request = context.switchToHttp().getRequest();

    // Admin requests (Mission Control) requieren auth verificada primero
    // BetterAuthGuard already verified superadmin role for admin routes
    if ((request as any).isAdminRequest || request.user?.role === 'superadmin') {
      if (!request.user) {
        throw new UnauthorizedException(
          'Acceso denegado: autenticación requerida para rutas de administración',
        );
      }
      if (request.user.role !== 'superadmin') {
        throw new ForbiddenException(
          'Acceso denegado: se requiere rol de superadmin',
        );
      }
      return true;
    }

    const tenantId = request.hostTenantId ?? request.tenantId;
    if (!tenantId) {
      if (isPublic && !request.user) return true;
      throw new ForbiddenException(
        'Acceso denegado: no se pudo resolver el tenant',
      );
    }

    // Si hay token, verificar que el tenantId del token coincida
    if (!request.user) {
      if (isPublic) return true;
      throw new UnauthorizedException('Se requiere autenticación');
    }

    if (request.user.tenantId && request.user.tenantId !== tenantId) {
      throw new ForbiddenException(
        'Acceso denegado: discrepancia entre el token y el tenant',
      );
    }

    return true;
  }
}
