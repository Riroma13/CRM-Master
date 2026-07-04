import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateTenantDto, TenantResponseDto, TenantListDto } from './dto';
import { randomBytes } from 'crypto';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTenantDto): Promise<TenantResponseDto> {
    // 1. Verificar slug único
    const existing = await this.prisma.admin.tenant.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`El slug "${dto.slug}" ya está en uso`);
    }

    // 2. Crear tenant
    const tenant = await this.prisma.admin.tenant.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        config: { maxStorageMB: 500, maxUsers: 10 },
      },
    });

    // 3. Crear usuario admin del tenant
    const adminUser = await this.prisma.admin.user.create({
      data: {
        tenantId: tenant.id,
        email: dto.adminEmail,
        name: dto.adminName || dto.adminEmail.split('@')[0],
        role: 'admin',
      },
    });

    // 4. Generar token de invitación
    const inviteToken = `inv_${randomBytes(24).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    // TODO: almacenar token en tabla de invitaciones (cuando exista)
    // Por ahora se devuelve en la respuesta

    this.logger.log(`Tenant creado: ${tenant.slug} (${tenant.id})`);

    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: 'active',
      admin: {
        email: adminUser.email,
        name: adminUser.name || undefined,
        status: 'invited',
      },
      portalUrl: `https://${tenant.slug}.crmmaster.com`,
      inviteToken,
      clientCount: 0,
      health: '🟢',
      createdAt: tenant.createdAt.toISOString(),
    };
  }

  async findAll(query: TenantListDto) {
    const where: any = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [tenants, total] = await Promise.all([
      this.prisma.admin.tenant.findMany({
        where,
        include: {
          _count: { select: { clients: true } },
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.admin.tenant.count({ where }),
    ]);

    return {
      data: tenants.map((t: any) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        status: t.isActive ? 'active' : 'inactive',
        clientCount: t._count.clients,
        createdAt: t.createdAt.toISOString(),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string) {
    const tenant = await this.prisma.admin.tenant.findUnique({
      where: { id },
      include: { _count: { select: { clients: true, users: true } } },
    });
    if (!tenant) return null;

    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: tenant.isActive ? 'active' : 'inactive',
      config: tenant.config,
      clientCount: tenant._count.clients,
      userCount: tenant._count.users,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    };
  }
}
