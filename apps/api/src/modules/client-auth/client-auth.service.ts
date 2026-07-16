import {
  Injectable, OnModuleDestroy, UnauthorizedException,
  BadRequestException, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import { ClientLoginDto, ClientAuthResponseDto, ClientMeDto, RegisterDto, RegisterResponseDto } from './dto/client-auth.dto';

const JWT_SECRET = process.env.CLIENT_JWT_SECRET || 'client-jwt-dev-secret-change-in-prod';
const COOKIE_NAME = '__Secure-client-session';
const TOKEN_EXPIRY = '7d';

const tokenBlacklist = new Set<string>();

const DUMMY_HASH = '$2b$12$R6MNQdkBAHvdF701lkwOdOTnXOc4FE/FINZfYkMdX82j76aYbknZ2';

interface ClientJwtPayload {
  sub: string;
  clienteId: string;
  tenantId: string;
  role: 'client';
  iat?: number;
  exp?: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class ClientAuthService implements OnModuleDestroy {
  private readonly logger = new Logger(ClientAuthService.name);
  private readonly rateLimitMap = new Map<string, RateLimitEntry>();
  private readonly RATE_LIMIT_MAX = 5;
  private readonly RATE_LIMIT_WINDOW = 60_000;
  private readonly CLEANUP_INTERVAL = 300_000;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly prisma: PrismaService) {
    this.cleanupTimer = setInterval(() => this.cleanupRateLimit(), this.CLEANUP_INTERVAL);
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.rateLimitMap.clear();
  }

  private cleanupRateLimit(): void {
    const now = Date.now();
    for (const [key, entry] of this.rateLimitMap.entries()) {
      if (entry.resetAt <= now) {
        this.rateLimitMap.delete(key);
      }
    }
  }

  private getRateLimitKey(ip: string, email: string): string {
    return `${ip}:${email}`;
  }

  private getCurrentAttempt(key: string): { blocked: boolean; attemptCount: number } {
    const now = Date.now();
    let entry = this.rateLimitMap.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + this.RATE_LIMIT_WINDOW };
      this.rateLimitMap.set(key, entry);
    }

    entry.count++;
    return { blocked: entry.count > this.RATE_LIMIT_MAX, attemptCount: entry.count };
  }

  private getProgressiveDelay(attemptCount: number): number {
    const delays = [0, 200, 500, 1000, 2000];
    return delays[Math.min(attemptCount - 1, delays.length - 1)] ?? 2000;
  }

  private hashEmail(email: string): string {
    return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 16);
  }

  async login(dto: ClientLoginDto, tenantId: string, ip: string): Promise<{ token: string; expiresAt: Date; clientUser: any; cliente: any }> {
    const rateLimitKey = this.getRateLimitKey(ip, dto.email);
    const { blocked, attemptCount } = this.getCurrentAttempt(rateLimitKey);

    if (blocked) {
      this.logger.warn(`[AUTH] client-login blocked email=<${this.hashEmail(dto.email)}> ip=${ip} attempts=${attemptCount}`);
      throw new HttpException('Demasiados intentos. Intente nuevamente en 1 minuto.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const delay = this.getProgressiveDelay(attemptCount);
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const clientUser = await this.prisma.admin.clientUser.findFirst({
      where: { email: dto.email, tenantId },
      include: { cliente: true },
    });

    if (!clientUser) {
      await bcrypt.compare(dto.password, DUMMY_HASH);
      this.logger.warn(`[AUTH] client-login failure email=<${this.hashEmail(dto.email)}> ip=${ip} attempts=${attemptCount}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!clientUser.isActive) {
      this.logger.warn(`[AUTH] client-login failure email=<${this.hashEmail(dto.email)}> ip=${ip} attempts=${attemptCount}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(dto.password, clientUser.passwordHash);
    if (!valid) {
      this.logger.warn(`[AUTH] client-login failure email=<${this.hashEmail(dto.email)}> ip=${ip} attempts=${attemptCount}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: ClientJwtPayload = {
      sub: clientUser.id,
      clienteId: clientUser.clienteId,
      tenantId: clientUser.tenantId,
      role: 'client',
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    this.logger.log(`[AUTH] client-login success email=<${this.hashEmail(dto.email)}> ip=${ip} attempts=${attemptCount}`);

    const { passwordHash, ...safeClientUser } = clientUser;
    return {
      token,
      expiresAt,
      clientUser: safeClientUser,
      cliente: clientUser.cliente,
    };
  }

  async register(dto: RegisterDto, tenantId: string, ip: string): Promise<RegisterResponseDto> {
    const rateLimitKey = `register:${ip}`;
    const { blocked, attemptCount } = this.getCurrentAttempt(rateLimitKey);

    if (blocked) {
      this.logger.warn(`[AUTH] client-register blocked ip=${ip} attempts=${attemptCount}`);
      throw new HttpException('Demasiados intentos. Intente nuevamente en 1 minuto.', HttpStatus.TOO_MANY_REQUESTS);
    }

    if (dto.password.length < 8) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
    }

    const existing = await this.prisma.admin.clientUser.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new HttpException('Este email ya está registrado', HttpStatus.CONFLICT);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const clienteId = crypto.randomUUID();
    const clientUserId = crypto.randomUUID();

    const [cliente, clientUser] = await this.prisma.admin.$transaction([
      this.prisma.admin.cliente.create({
        data: { id: clienteId, tenantId, nombre: dto.businessName || dto.nombre },
      }),
      this.prisma.admin.clientUser.create({
        data: {
          id: clientUserId, clienteId, tenantId,
          email: dto.email, passwordHash,
          nombre: dto.nombre, isActive: true,
        },
      }),
    ]);

    this.logger.log(`[AUTH] client-register success email=<${this.hashEmail(dto.email)}> clienteId=${clienteId}`);

    return { id: clientUser.id, nombre: clientUser.nombre!, email: clientUser.email };
  }

  async logout(token: string): Promise<void> {
    tokenBlacklist.add(token);
  }

  async getMe(clientUserId: string, requestTenantId: string): Promise<ClientMeDto | null> {
    const clientUser = await this.prisma.admin.clientUser.findUnique({
      where: { id: clientUserId, isActive: true, tenantId: requestTenantId },
      include: { cliente: true },
    });

    if (!clientUser) return null;

    const { passwordHash, ...safeClientUser } = clientUser;
    return {
      clientUser: safeClientUser,
      cliente: {
        id: clientUser.cliente.id,
        tenantId: clientUser.cliente.tenantId,
        nombre: clientUser.cliente.nombre,
      },
    };
  }

  static get COOKIE_NAME() { return COOKIE_NAME; }

  static verifyToken(token: string): ClientJwtPayload {
    if (tokenBlacklist.has(token)) {
      throw new UnauthorizedException('Token revocado');
    }
    try {
      return jwt.verify(token, JWT_SECRET) as ClientJwtPayload;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
