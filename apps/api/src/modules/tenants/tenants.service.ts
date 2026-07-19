import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateTenantDto, TenantResponseDto, TenantListDto } from './dto';
import { randomBytes, randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';

const ALL_MODULES = [
  'dashboard', 'clientes', 'documentos', 'tareas', 'calendario',
  'recursos', 'sistemas', 'notificaciones', 'incidencias', 'perfil',
];

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

    // 2. Crear Better-Auth organization
    const orgId = randomUUID();
    await this.prisma.admin.$executeRawUnsafe(
      `INSERT INTO ba_organizations (id, name, slug, "createdAt") VALUES ($1, $2, $3, NOW())`,
      orgId, dto.name, dto.slug,
    );

    // 3. Crear tenant con org vinculada + módulos por defecto
    const tenant = await this.prisma.admin.tenant.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        betterAuthOrganizationId: orgId,
        config: {
          maxStorageMB: 500,
          maxUsers: 10,
          modules: dto.modules ?? ALL_MODULES,
          notifications: { reminderHours: 24 },
        },
      },
    });

    // 4. Crear Better-Auth user
    const baUserId = randomUUID();
    await this.prisma.admin.$executeRawUnsafe(
      `INSERT INTO ba_users (id, email, "emailVerified", name, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      baUserId, dto.adminEmail, true, dto.adminName || dto.adminEmail.split('@')[0],
    );

    // 5. Vincular user a la org
    const memberId = randomUUID();
    await this.prisma.admin.$executeRawUnsafe(
      `INSERT INTO ba_members (id, "organization_id", "user_id", role, "createdAt") VALUES ($1, $2, $3, $4, NOW())`,
      memberId, orgId, baUserId, 'admin',
    );

    // 6. Crear usuario admin del tenant
    const defaultHash = bcrypt.hashSync('password', 10);
    const adminUser = await this.prisma.admin.user.create({
      data: {
        tenantId: tenant.id,
        email: dto.adminEmail,
        name: dto.adminName || dto.adminEmail.split('@')[0],
        role: 'owner',
        betterAuthUserId: baUserId,
      },
    });
    // Store password hash via raw SQL (field not in Prisma schema yet)
    await this.prisma.admin.$executeRawUnsafe(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      defaultHash, adminUser.id,
    );

    // 7. Crear disponibilidad por defecto
    const defaultDailySchedule = [
      { day: 1, start: '09:00', end: '14:00' },
      { day: 1, start: '16:00', end: '19:00' },
      { day: 2, start: '09:00', end: '14:00' },
      { day: 3, start: '09:00', end: '14:00' },
      { day: 4, start: '09:00', end: '14:00' },
      { day: 5, start: '09:00', end: '14:00' },
    ];

    await this.prisma.admin.disponibilidad.create({
      data: {
        tenantId: tenant.id,
        dailySchedule: defaultDailySchedule as any,
        blockedDates: [],
      },
    });

    // 8. Pre-cargar automatizaciones según vertical (detectada por slug o config)
    const defaultRules = {
      fiscal: [
        { nombre: 'Bienvenida nuevo cliente', trigger: 'cliente.creado', action: { type: 'email', config: { subject: 'Bienvenido a nuestra asesoría', to: dto.adminEmail } } },
        { nombre: 'Alerta incidencia sin resolver', trigger: 'incidencia.creada', action: { type: 'email', config: { subject: 'Nueva incidencia registrada', to: dto.adminEmail } } },
      ],
      salud: [
        { nombre: 'Recordatorio cita profesional', trigger: 'cita.confirmada', action: { type: 'email', config: { subject: 'Cita confirmada', to: dto.adminEmail } } },
        { nombre: 'Aviso cancelación', trigger: 'cita.cancelada', action: { type: 'email', config: { subject: 'Cita cancelada por cliente', to: dto.adminEmail } } },
      ],
      educacion: [
        { nombre: 'Nueva incidencia alumno', trigger: 'incidencia.creada', action: { type: 'email', config: { subject: 'Incidencia registrada', to: dto.adminEmail } } },
        { nombre: 'Tutoría confirmada', trigger: 'cita.confirmada', action: { type: 'email', config: { subject: 'Tutoría confirmada', to: dto.adminEmail } } },
      ],
    };
    // Store presets in tenant.config.automations
    const currentConfig = (tenant.config as any) ?? {};
    currentConfig.automations = defaultRules;
    await this.prisma.admin.tenant.update({
      where: { id: tenant.id },
      data: { config: currentConfig as any },
    });

    this.logger.log(`Tenant onboarded: ${tenant.slug} — admin: ${dto.adminEmail}`);

    // 8. Crear session token para acceso inmediato
    const sessionToken = `sess_${randomBytes(32).toString('hex')}`;
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.admin.$executeRawUnsafe(
      `INSERT INTO ba_sessions (id, user_id, token, expires_at, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4::timestamp, NOW(), NOW())`,
      sessionId, baUserId, sessionToken, expiresAt.toISOString(),
    );

    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: 'active',
      admin: {
        email: adminUser.email,
        name: adminUser.name || undefined,
        status: 'active',
      },
      portalUrl: `https://${tenant.slug}.crmmaster.com`,
      sessionToken,
      clientCount: 0,
      health: '🟢',
      createdAt: tenant.createdAt.toISOString(),
    };
  }

  async updatePassword(email: string, passwordHash: string) {
    await this.prisma.admin.$executeRawUnsafe(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      passwordHash, email,
    );
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
      portalUrl: `https://${tenant.slug}.crmmaster.com`,
      config: tenant.config,
      clientCount: tenant._count.clients,
      userCount: tenant._count.users,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    };
  }
}
