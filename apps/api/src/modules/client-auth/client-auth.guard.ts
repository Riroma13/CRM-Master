import {
  Injectable, CanActivate, ExecutionContext,
  UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClientAuthService } from './client-auth.service';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

function parseCookies(header: string): Record<string, string> {
  return Object.fromEntries(
    header.split(';').map(c => {
      const idx = c.indexOf('=');
      if (idx === -1) return [c.trim(), ''];
      return [c.slice(0, idx).trim(), c.slice(idx + 1).trim()];
    }),
  );
}

const ADMIN_SESSION_COOKIE = '__Secure-session';

@Injectable()
export class ClientAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const cookieHeader = request.headers?.cookie || '';
    const cookies = parseCookies(cookieHeader);

    const adminCookie = cookies[ADMIN_SESSION_COOKIE];
    if (adminCookie) {
      throw new UnauthorizedException('Token de administrador no válido para rutas de cliente');
    }

    const clientCookie = cookies[ClientAuthService.COOKIE_NAME];
    if (!clientCookie) {
      throw new UnauthorizedException('Se requiere cookie de sesión de cliente');
    }

    const payload = ClientAuthService.verifyToken(clientCookie);

    if (payload.role !== 'client') {
      throw new ForbiddenException('Rol inválido: se requiere rol de cliente');
    }

    (request as any).clientUserId = payload.sub;
    (request as any).tenantId = payload.tenantId;
    (request as any).clienteId = payload.clienteId;

    return true;
  }
}
