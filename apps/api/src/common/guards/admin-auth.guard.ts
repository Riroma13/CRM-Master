import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SessionService } from '../../modules/auth/session.service';

const ADMIN_ROUTE_PREFIX = '/api/v1/admin';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check @Public() decorator first
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const path: string = request.path ?? request.originalUrl ?? '';

    // Only enforce on admin routes
    if (!path.startsWith(ADMIN_ROUTE_PREFIX)) {
      return true;
    }

    // Extract Bearer token
    const authHeader = request.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Se requiere token de autenticación para acceder a rutas de administración',
      );
    }

    const token = authHeader.slice(7); // Remove 'Bearer '

    // Validate session
    const session = this.sessionService.validateSession(token);
    if (!session) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    // Double-check expiration (defense in depth — SessionService also handles this)
    if (Date.now() > session.expiresAt.getTime()) {
      throw new UnauthorizedException('Token expirado');
    }

    // Verify superadmin role
    if (session.role !== 'superadmin') {
      throw new ForbiddenException(
        'Acceso denegado: se requiere rol de superadmin',
      );
    }

    // Populate request.user
    (request as any).user = {
      id: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
      tenantId: session.tenantId,
    };

    return true;
  }
}
