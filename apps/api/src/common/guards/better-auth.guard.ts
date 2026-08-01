import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../common/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AUTH_CLIENT } from '../auth-client.provider';
import { IdentityProvider } from '../../modules/identity/identity.contracts';

const ADMIN_ROUTE_PREFIX = '/api/v1/admin';

@Injectable()
export class BetterAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    @Inject(AUTH_CLIENT) private readonly provider: IdentityProvider,
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

    // Resolve the session through the canonical Better Auth provider boundary.
    const session = await this.provider.getSession(
      new Headers({ authorization: `Bearer ${token}` }),
    );

    if (!session) {
      if (path.startsWith(ADMIN_ROUTE_PREFIX)) {
        throw new UnauthorizedException('Token inválido o expirado');
      }
      return true; // Allow anonymous for non-admin routes even with bad token
    }

    // Look up legacy User by betterAuthUserId (which stores the ba_users.id)
    const legacyUser = await this.prisma.admin.legacyUser.findFirst({
      where: { betterAuthUserId: session.userId },
      include: { tenant: true },
    });

    if (!legacyUser) {
      throw new ForbiddenException('Usuario no encontrado en el sistema');
    }

    if (!legacyUser.isActive) {
      throw new ForbiddenException('Usuario desactivado');
    }

    // Set user on request (used by PermissionsGuard downstream)
    // Host-derived tenant authority is immutable; Identity authorization compares
    // the authenticated organization against hostTenantId independently.
    (request as any).user = {
      id: session.userId,
      email: legacyUser.email,
      name: legacyUser.name,
      role: legacyUser.role,
      tenantId: legacyUser.tenantId,
    };

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
