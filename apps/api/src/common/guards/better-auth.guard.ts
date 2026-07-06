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

    // Only enforce on admin routes (replaces AdminAuthGuard boundary)
    if (!path.startsWith(ADMIN_ROUTE_PREFIX)) return true;

    // Extract Bearer token
    const authHeader = request.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Se requiere token de autenticación para acceder a rutas de administración',
      );
    }

    const token = authHeader.slice(7);

    // Validate session against ba_sessions directly via raw SQL.
    // We bypass auth.api.getSession() because Better-Auth v1's getSession
    // requires HMAC-signed cookies (via the bearer plugin) and the Prisma
    // model name collision (model user vs model User) prevents the adapter
    // from functioning correctly on ba_users.
    const rows = await (this.prisma.admin as any).$queryRawUnsafe(
      `SELECT s.user_id as "userId", u.email, u.name
       FROM ba_sessions s
       JOIN ba_users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      token,
    );

    if (!rows || rows.length === 0) {
      throw new UnauthorizedException('Token inválido o expirado');
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

    // Superadmin has no org membership — allowed on admin routes
    if (legacyUser.role === 'superadmin') {
      (request as any).user = {
        id: sessionUser.userId,
        email: sessionUser.email,
        name: sessionUser.name,
        role: 'superadmin',
        tenantId: legacyUser.tenantId,
      };
      return true;
    }

    // Non-superadmin on admin routes → 403 (replaces AdminAuthGuard)
    throw new ForbiddenException(
      'Acceso denegado: se requiere rol de superadmin',
    );
  }
}
