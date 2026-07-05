import {
  Injectable, UnauthorizedException, NotFoundException,
  Logger, Inject,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../../common/prisma.service';
import { SessionService } from './session.service';
import { LoginDto, AuthResponseDto, MeDto } from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    @Inject(REQUEST) private readonly req: Request,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const tenantSlug = (this.req as any).tenantSlug;
    if (!tenantSlug) {
      throw new NotFoundException('Tenant no encontrado');
    }

    // Resolver tenant por slug
    const tenant = await this.prisma.admin.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }
    if (!tenant.isActive) {
      throw new UnauthorizedException('Tenant desactivado');
    }

    // Buscar usuario por email en el tenant
    const user = await this.prisma.admin.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || user.tenantId !== tenant.id) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // TODO: Integrar con Better-Auth para verificación real de password
    // Por ahora, mock de autenticación
    if (dto.password !== 'password') {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Crear sesión en el store en memoria
    const token = this.sessionService.createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      tenantId: tenant.id,
      role: user.role,
    });

    // Calcular expiresAt para la respuesta (7 días desde ahora)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    this.logger.log(`Login exitoso: ${user.email} en ${tenant.slug}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
      },
      session: {
        token,
        expiresAt: expiresAt.toISOString(),
      },
    };
  }

  async getMe(tenantId: string, userId: string): Promise<MeDto | null> {
    const user = await this.prisma.admin.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenant: {
        id: user.tenant.id,
        slug: user.tenant.slug,
        name: user.tenant.name,
      },
      createdAt: user.createdAt.toISOString(),
    };
  }
}
