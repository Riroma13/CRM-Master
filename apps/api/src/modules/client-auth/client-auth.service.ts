import {
  Injectable, UnauthorizedException, NotFoundException,
  ForbiddenException, Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../common/prisma.service';
import { ClientLoginDto, ClientAuthResponseDto, ClientMeDto } from './dto/client-auth.dto';

const JWT_SECRET = process.env.CLIENT_JWT_SECRET || 'client-jwt-dev-secret-change-in-prod';
const COOKIE_NAME = '__Secure-client-session';
const TOKEN_EXPIRY = '7d';

interface ClientJwtPayload {
  sub: string;
  clienteId: string;
  tenantId: string;
  role: 'client';
  iat?: number;
  exp?: number;
}

@Injectable()
export class ClientAuthService {
  private readonly logger = new Logger(ClientAuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async login(dto: ClientLoginDto, tenantId?: string): Promise<{ token: string; expiresAt: Date; clientUser: any; cliente: any }> {
    const clientUser = tenantId
      ? await this.prisma.admin.clientUser.findFirst({
          where: { email: dto.email, tenantId },
          include: { cliente: true },
        })
      : await this.prisma.admin.clientUser.findFirst({
          where: { email: dto.email },
          include: { cliente: true },
        });

    if (!clientUser) {
      throw new NotFoundException('Credenciales inválidas');
    }

    if (!clientUser.isActive) {
      throw new ForbiddenException('Usuario desactivado');
    }

    const valid = bcrypt.compareSync(dto.password, clientUser.passwordHash);
    if (!valid) {
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

    this.logger.log(`Client login: ${clientUser.email} for cliente ${clientUser.clienteId}`);

    const { passwordHash, ...safeClientUser } = clientUser;
    return {
      token,
      expiresAt,
      clientUser: safeClientUser,
      cliente: clientUser.cliente,
    };
  }

  async getMe(clientUserId: string): Promise<ClientMeDto | null> {
    const clientUser = await this.prisma.admin.clientUser.findUnique({
      where: { id: clientUserId },
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
    try {
      return jwt.verify(token, JWT_SECRET) as ClientJwtPayload;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
