import {
  Injectable, UnauthorizedException, NotFoundException,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma.service';
import { ActivityTimelineService } from '../activity-timeline/activity-timeline.service';
import { LoginDto, AuthResponseDto, MeDto } from './dto';

export const AUTH_SESSION_TOKEN = Symbol('auth-session-token');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityTimeline: ActivityTimelineService,
  ) {}

  async login(
    dto: LoginDto,
    hostTenantId?: string,
  ): Promise<Omit<AuthResponseDto, 'session'> & { session?: never }> {
    // Buscar usuario por email
    const user = await this.prisma.admin.legacyUser.findUnique({
      where: { email: dto.email },
      include: { tenant: true },
    });
    const invalidCredentials = () => new UnauthorizedException('Credenciales inválidas');
    if (!user) {
      await bcrypt.compare(dto.password, '$2b$10$7EqJtq98hPqEX7fNZaFWoOe8h9YqY7J2QY1m7N8o3fG9x6aP0lC2K');
      throw invalidCredentials();
    }

    const tenant = user.tenant;
    if (!hostTenantId || !tenant || !tenant.isActive || !user.isActive || user.tenantId !== hostTenantId) {
      await bcrypt.compare(dto.password, user.passwordHash || '$2b$10$7EqJtq98hPqEX7fNZaFWoOe8h9YqY7J2QY1m7N8o3fG9x6aP0lC2K');
      throw invalidCredentials();
    }

    // Check password hash (bcrypt)
    const storedHash: string | null = user.passwordHash;
    if (!storedHash || !(await bcrypt.compare(dto.password, storedHash))) {
      throw invalidCredentials();
    }

    // Crear sesión en ba_sessions (Better-Auth sessions table)
    const token = `sess_${randomBytes(32).toString('hex')}`;
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Buscar o crear ba_user
    let baUserId = user.betterAuthUserId;
    if (!baUserId) {
      const existing = await (this.prisma.admin as any).$queryRawUnsafe(
        'SELECT id FROM ba_users WHERE email = $1',
        user.email,
      );
      if (existing?.length) {
        baUserId = existing[0].id;
      } else {
        baUserId = crypto.randomUUID();
        await this.prisma.admin.$executeRawUnsafe(
          `INSERT INTO ba_users (id, email, "emailVerified", name, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          baUserId, user.email, true, user.name,
        );
      }
      await this.prisma.admin.legacyUser.update({
        where: { id: user.id },
        data: { betterAuthUserId: baUserId },
      });
    }

    // Create session in ba_sessions
    await this.prisma.admin.$executeRawUnsafe(
      `INSERT INTO ba_sessions (id, user_id, token, expires_at, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4::timestamp, NOW(), NOW())`,
      sessionId, baUserId, token, expiresAt.toISOString(),
    );

    this.logger.log(`Login exitoso: ${user.email} en ${tenant.slug}`);

    try {
      await this.activityTimeline.publish({
        eventType: 'login.realizado',
        tenantId: tenant.id,
        entityType: 'user',
        entityId: user.id,
        actor: user.email,
        sourceModule: 'auth',
        severity: 'info',
        category: 'auth',
        payload: { email: user.email, role: user.role },
      });
    } catch (e) {
      this.logger.warn(`Failed to publish login.realizado: ${(e as Error).message}`);
    }

    const response: Omit<AuthResponseDto, 'session'> & { session?: never; [AUTH_SESSION_TOKEN]?: string } = {
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
    };
    Object.defineProperty(response, AUTH_SESSION_TOKEN, {
      value: token,
      enumerable: false,
      configurable: false,
    });
    return response;
  }

  async logout(token: string | null): Promise<void> {
    if (!token) return;
    await this.prisma.admin.$executeRawUnsafe(
      'DELETE FROM ba_sessions WHERE token = $1',
      token,
    );
  }

  async checkUserExists(email: string) {
    const user = await this.prisma.admin.legacyUser.findUnique({
      where: { email },
      select: { id: true, email: true, tenantId: true },
    });
    return user;
  }

  async getMe(tenantId: string, userId: string): Promise<MeDto | null> {
    const user = await this.prisma.admin.legacyUser.findUnique({
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
