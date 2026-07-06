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
import { AUTH_CLIENT } from '../auth-client.provider';
import { Auth } from '../auth';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const ADMIN_ROUTE_PREFIX = '/api/v1/admin';

@Injectable()
export class BetterAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_CLIENT) private readonly auth: Auth,
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

    // Only enforce on admin routes (same boundary as AdminAuthGuard)
    if (!path.startsWith(ADMIN_ROUTE_PREFIX)) return true;

    // Extract Bearer token
    const authHeader = request.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Se requiere token de autenticación para acceder a rutas de administración',
      );
    }

    // Validate session via Better-Auth
    const headers = new Headers();
    headers.set('Authorization', authHeader);
    const session = await this.auth.api.getSession({ headers });

    if (!session) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    // Look up legacy User by betterAuthUserId
    const baUserId = session.user.id;
    const legacyUser = await this.prisma.admin.user.findFirst({
      where: { betterAuthUserId: baUserId },
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
        id: baUserId,
        email: session.user.email,
        name: session.user.name,
        role: 'superadmin',
        tenantId: legacyUser.tenantId,
      };
      return true;
    }

    // Non-superadmin on admin routes → 403 (same as AdminAuthGuard)
    throw new ForbiddenException(
      'Acceso denegado: se requiere rol de superadmin',
    );
  }
}
