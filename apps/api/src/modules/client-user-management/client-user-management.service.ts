import {
  Injectable, ConflictException, ForbiddenException,
  NotFoundException, Logger, BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma.service';
import { CreateClientUserDto, ResetPasswordDto, ClientUserResponseDto } from './dto/client-user-management.dto';

const USER_SELECT = {
  id: true,
  email: true,
  isActive: true,
  clienteId: true,
  createdAt: true,
  updatedAt: true,
  cliente: {
    select: { id: true, nombre: true },
  },
};

@Injectable()
export class ClientUserManagementService {
  private readonly logger = new Logger(ClientUserManagementService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClientUserDto, tenantId?: string): Promise<ClientUserResponseDto> {
    if (!tenantId) {
      throw new ForbiddenException('No se pudo resolver el tenant');
    }

    const cliente = await this.prisma.admin.cliente.findUnique({
      where: { id: dto.clienteId },
      select: { id: true, tenantId: true },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    if (cliente.tenantId !== tenantId) {
      throw new ForbiddenException('El cliente no pertenece a este tenant');
    }

    const existing = await this.prisma.admin.clientUser.findFirst({
      where: { email: dto.email, tenantId },
    });

    if (existing) {
      throw new ConflictException('Ya existe un usuario con este email en este tenant');
    }

    const passwordHash = bcrypt.hashSync(dto.password, 12);

    const clientUser = await this.prisma.admin.clientUser.create({
      data: {
        email: dto.email,
        passwordHash,
        clienteId: dto.clienteId,
        tenantId,
        isActive: true,
      },
      select: USER_SELECT,
    });

    this.logger.log(`Created ClientUser: ${clientUser.email} for cliente ${dto.clienteId}`);

    return clientUser as any;
  }

  async disable(clientUserId: string, tenantId?: string): Promise<ClientUserResponseDto> {
    if (!tenantId) {
      throw new ForbiddenException('No se pudo resolver el tenant');
    }

    const clientUser = await this.prisma.admin.clientUser.findFirst({
      where: { id: clientUserId, tenantId },
    });

    if (!clientUser) {
      throw new NotFoundException('Usuario de cliente no encontrado');
    }

    const updated = await this.prisma.admin.clientUser.update({
      where: { id: clientUserId },
      data: { isActive: false },
      select: USER_SELECT,
    });

    this.logger.log(`Disabled ClientUser: ${updated.email}`);

    return updated as any;
  }

  async resetPassword(clientUserId: string, dto: ResetPasswordDto, tenantId?: string): Promise<ClientUserResponseDto> {
    if (!tenantId) {
      throw new ForbiddenException('No se pudo resolver el tenant');
    }

    const clientUser = await this.prisma.admin.clientUser.findFirst({
      where: { id: clientUserId, tenantId },
    });

    if (!clientUser) {
      throw new NotFoundException('Usuario de cliente no encontrado');
    }

    const passwordHash = bcrypt.hashSync(dto.password, 12);

    const updated = await this.prisma.admin.clientUser.update({
      where: { id: clientUserId },
      data: { passwordHash },
      select: USER_SELECT,
    });

    this.logger.log(`Reset password for ClientUser: ${updated.email}`);

    return updated as any;
  }
}
