import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../common/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const ADMIN_ROUTE_PREFIX = '/api/v1/admin';

@Injectable()
export class BetterAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check @Public() decorator first
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const path: string = request.path ?? request.originalUrl ?? '';

    // Extract Bearer token if present
    const authHeader = request.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    // For admin routes, token is required
    if (path.startsWith(ADMIN_ROUTE_PREFIX)) {
      if (!token) {
        throw new UnauthorizedException(
          'Se requiere token de autenticación para acceder a rutas de administración',
        );
      }
    }

    // If no token on non-admin routes, allow anonymous (PermissionsGuard handles restrictions)
    if (!token) return true;

    // Validate session against ba_sessions directly via raw SQL.
    const rows = await (this.prisma.admin as any).$queryRawUnsafe(
      `SELECT s.user_id as "userId", u.email, u.name
       FROM ba_sessions s
       JOIN ba_users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      token,
    );

    if (!rows || rows.length === 0) {
      if (path.startsWith(ADMIN_ROUTE_PREFIX)) {
        throw new UnauthorizedException('Token inválido o expirado');
      }
      return true; // Allow anonymous for non-admin routes even with bad token
    }

    const sessionUser = rows[0];

    // Look up legacy User by betterAuthUserId (which stores the ba_users.id)
    const legacyUser = await this.prisma.admin.user.findFirst({
      where: { betterAuthUserId: sessionUser.userId },
      include: { tenant: true },
    });

    if (!legacyUser) {
      throw new ForbiddenException('Usuario no encontrado en el sistema');
    }

    if (!legacyUser.isActive) {
      throw new ForbiddenException('Usuario desactivado');
    }

    // Set user on request (used by PermissionsGuard downstream)
    // Also override tenantId to match the user's actual tenant
    (request as any).user = {
      id: sessionUser.userId,
      email: sessionUser.email,
      name: sessionUser.name,
      role: legacyUser.role,
      tenantId: legacyUser.tenantId,
    };
    (request as any).tenantId = legacyUser.tenantId;
    (request as any).tenantSlug = legacyUser.tenant?.slug;

    // Superadmin has no org membership — allowed on admin routes
    if (legacyUser.role === 'superadmin') return true;

    // Non-superadmin on admin routes → 403
    if (path.startsWith(ADMIN_ROUTE_PREFIX)) {
      throw new ForbiddenException(
        'Acceso denegado: se requiere rol de superadmin',
      );
    }

    return true;
  }
}
