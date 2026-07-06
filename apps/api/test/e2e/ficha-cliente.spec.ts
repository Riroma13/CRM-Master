import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  Module,
  Injectable,
  NestMiddleware,
  NestModule,
  MiddlewareConsumer,
  Catch,
  ArgumentsHost,
  ExceptionFilter,
} from '@nestjs/common';
import * as request from 'supertest';
import { ClientsController } from '../../src/modules/clients/clients.controller';
import { ClientsService } from '../../src/modules/clients/clients.service';
import { EventosController } from '../../src/modules/eventos/eventos.controller';
import { EventosService } from '../../src/modules/eventos/eventos.service';
import { TareasController } from '../../src/modules/tareas/tareas.controller';
import { TareasService } from '../../src/modules/tareas/tareas.service';
import { PrismaService } from '../../src/common/prisma.service';
import { SessionService } from '../../src/modules/auth/session.service';
import { AdminAuthGuard } from '../../src/common/guards/admin-auth.guard';
import { TenantScopeGuard } from '../../src/common/guards/tenant-scope.guard';
import { APP_FILTER } from '@nestjs/core';
import { Request, Response, NextFunction } from 'express';

// ─── Helpers ────────────────────────────────────────────────────

const mockClienteId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const mockClienteIdNaoExiste = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const mockSistemaId = 'cccccccc-cccc-4ccc-cccc-cccccccccccc';
const mockTenantId = 'dddddddd-dddd-4ddd-dddd-dddddddddddd';
const mockEventoId = 'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee';
const mockTareaId = 'ffffffff-ffff-4fff-ffff-ffffffffffff';

const mockCliente = {
  id: mockClienteId,
  nombre: 'Asesoría García',
  tipoNegocio: 'Asesoría Fiscal',
  contactoPrincipal: 'Juan García - juan@garcia.com',
  estadoRelacion: 'Activo',
  saludGeneral: '🟢',
  fechaInicio: new Date('2024-06-01'),
  notasGenerales: 'Cliente desde BeeHive v1',
  tags: ['factura mensual', 'VPS propio'],
  tenant: { id: mockTenantId, slug: 'asesoria-garcia', name: 'Asesoría García S.L.' },
  sistemas: [
    {
      id: mockSistemaId,
      nombreSistema: 'BeeHive producción',
      tipo: 'Gestor documental',
      entorno: 'Producción',
      version: '2.5.0',
      estadoTecnico: '🟢',
      fechaUltimoChequeo: new Date('2026-06-30'),
      items: [
        {
          id: 'item-1',
          categoria: 'Módulo funcional',
          nombre: 'Módulo de facturación',
          estado: 'Implementado',
          responsable: 'Ricardo',
        },
      ],
    },
  ],
  createdAt: new Date('2024-06-01T00:00:00Z'),
  updatedAt: new Date('2026-07-01T10:00:00Z'),
};

const mockEventos = [
  {
    id: mockEventoId,
    sistemaId: mockSistemaId,
    tenantId: mockTenantId,
    tipo: 'Decisión',
    titulo: 'Migrar a PostgreSQL 16',
    descripcion: 'Se acordó migrar la base de datos',
    siguienteAccion: 'Programar ventana de mantenimiento',
    fecha: new Date('2026-06-30T10:00:00Z'),
    sistema: { id: mockSistemaId, nombreSistema: 'BeeHive producción' },
  },
];

const mockTareas = [
  {
    id: mockTareaId,
    clienteId: mockClienteId,
    titulo: 'Revisar backup semanal',
    estado: 'Pendiente',
    prioridad: 'Media',
    fechaLimite: new Date('2026-08-01T00:00:00Z'),
    sistema: { id: mockSistemaId, nombreSistema: 'BeeHive producción' },
  },
];

// ─── Mock Prisma ─────────────────────────────────────────────────

const createMockPrisma = () => ({
  admin: {
    cliente: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    eventoBitacora: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    tarea: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    sistema: {
      findFirst: jest.fn(),
    },
  },
});

// ─── Middleware ──────────────────────────────────────────────────

@Injectable()
class MockTenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const url = req.url || req.originalUrl || '';
    if (url.includes('/api/v1/admin')) {
      (req as any).isAdminRequest = true;
    }
    next();
  }
}

// ─── ZodExceptionFilter (converts ZodErrors to 400) ──────────────

import { ZodError } from 'zod';

@Catch(ZodError)
class ZodExceptionFilter implements ExceptionFilter {
  catch(exception: ZodError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    response.status(400).json({
      statusCode: 400,
      message: 'Validation failed',
      errors: exception.errors,
    });
  }
}

// ─── Mock holder (shared reference for test access) ─────────────

type MockPrisma = ReturnType<typeof createMockPrisma>;
const mockPrismaRef: { current: MockPrisma | null } = { current: null };

// ─── Test Module ─────────────────────────────────────────────────

@Module({
  controllers: [ClientsController, EventosController, TareasController],
  providers: [
    ClientsService,
    EventosService,
    TareasService,
    SessionService,
    MockTenantMiddleware,
    AdminAuthGuard,
    TenantScopeGuard,
    {
      provide: PrismaService,
      useFactory: () => {
        const m = createMockPrisma();
        mockPrismaRef.current = m;
        return m;
      },
    },
    {
      provide: APP_FILTER,
      useClass: ZodExceptionFilter,
    },
  ],
})
class TestFichaClienteModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MockTenantMiddleware).forRoutes('*');
  }
}

// ─── Tests ───────────────────────────────────────────────────────

describe('Ficha Cliente — Integration (tasks 4.3–4.6)', () => {
  let app: INestApplication;
  let sessionService: SessionService;
  let mockPrisma: MockPrisma;
  let superadminToken: string;
  let tenantAdminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestFichaClienteModule],
    }).compile();

    mockPrisma = mockPrismaRef.current!;

    app = moduleFixture.createNestApplication();
    await app.init();

    sessionService = app.get(SessionService);

    superadminToken = sessionService.createSession({
      userId: 'super-1',
      tenantId: mockTenantId,
      role: 'superadmin',
      email: 'ricardo@crmmaster.com',
      name: 'Ricardo',
    });

    tenantAdminToken = sessionService.createSession({
      userId: 'tenant-1',
      tenantId: mockTenantId,
      role: 'viewer',
      email: 'admin@tenant.com',
      name: 'Tenant Admin',
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 4.3 GET /:id ───────────────────────────────────────────

  describe('4.3 — GET /api/v1/admin/clientes/:id', () => {
    it('returns 200 + ClienteDetail shape for existing cliente', async () => {
      mockPrisma.admin.cliente.findUnique.mockResolvedValue(mockCliente);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/admin/clientes/${mockClienteId}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', mockClienteId);
      expect(response.body).toHaveProperty('nombre', 'Asesoría García');
      expect(response.body).toHaveProperty('saludGeneral', '🟢');
      expect(response.body).toHaveProperty('tenant');
      expect(response.body.tenant).toHaveProperty('slug', 'asesoria-garcia');
      expect(response.body).toHaveProperty('sistemas');
      expect(response.body.sistemas).toHaveLength(1);
      expect(response.body.sistemas[0]).toHaveProperty('items');
      expect(response.body.sistemas[0].items).toHaveLength(1);
      expect(response.body).toHaveProperty('tags');
      expect(response.body.tags).toContain('VPS propio');
    });

    it('returns 404 for non-existent cliente', async () => {
      mockPrisma.admin.cliente.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/admin/clientes/${mockClienteIdNaoExiste}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
    });
  });

  // ── 4.3 PATCH /:id ──────────────────────────────────────────

  describe('4.3 — PATCH /api/v1/admin/clientes/:id', () => {
    const updatePayload = {
      nombre: 'Asesoría García Actualizado',
      saludGeneral: '🟡',
      notasGenerales: 'Nota actualizada',
      tags: ['factura mensual', 'VPS propio', 'migración'],
    };

    it('returns 200 + updated fields', async () => {
      // For findOneOrFail check:
      mockPrisma.admin.cliente.findUnique.mockResolvedValue(mockCliente);

      const updatedCliente = {
        ...mockCliente,
        nombre: updatePayload.nombre,
        saludGeneral: updatePayload.saludGeneral,
        notasGenerales: updatePayload.notasGenerales,
        tags: updatePayload.tags,
      };
      mockPrisma.admin.cliente.update.mockResolvedValue(updatedCliente);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/admin/clientes/${mockClienteId}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(updatePayload)
        .expect(200);

      expect(response.body.nombre).toBe(updatePayload.nombre);
      expect(response.body.saludGeneral).toBe(updatePayload.saludGeneral);
      expect(response.body.notasGenerales).toBe(updatePayload.notasGenerales);
      expect(response.body.tags).toHaveLength(3);
    });

    it('returns 404 for non-existent cliente', async () => {
      mockPrisma.admin.cliente.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/admin/clientes/${mockClienteIdNaoExiste}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(updatePayload)
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
    });
  });

  // ── 4.4 GET /:id/eventos ───────────────────────────────────

  describe('4.4 — GET /api/v1/admin/clientes/:id/eventos', () => {
    it('returns 200 + paginated list', async () => {
      mockPrisma.admin.eventoBitacora.findMany.mockResolvedValue(mockEventos);
      mockPrisma.admin.eventoBitacora.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/admin/clientes/${mockClienteId}/eventos`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .query({ limit: 20, page: 1 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 20);
      expect(response.body.pagination).toHaveProperty('total', 1);
    });

    it('supports pagination query params', async () => {
      mockPrisma.admin.eventoBitacora.findMany.mockResolvedValue([]);
      mockPrisma.admin.eventoBitacora.count.mockResolvedValue(0);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/admin/clientes/${mockClienteId}/eventos`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .query({ limit: 5, page: 2 })
        .expect(200);

      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.pagination.page).toBe(2);
    });

    it('can filter by tipo', async () => {
      mockPrisma.admin.eventoBitacora.findMany.mockResolvedValue(mockEventos);
      mockPrisma.admin.eventoBitacora.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/admin/clientes/${mockClienteId}/eventos`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .query({ tipo: 'Decisión' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });
  });

  // ── 4.4 POST /:id/eventos ──────────────────────────────────

  describe('4.4 — POST /api/v1/admin/clientes/:id/eventos', () => {
    const validEventoPayload = {
      sistemaId: mockSistemaId,
      tipo: 'Decisión',
      titulo: 'Nueva integración con FacturaDirecta',
      descripcion: 'Se aprobó la integración',
      siguienteAccion: 'Contactar con soporte',
    };

    it('returns 201 + created evento', async () => {
      mockPrisma.admin.sistema.findFirst.mockResolvedValue({
        id: mockSistemaId,
        tenantId: mockTenantId,
        clienteId: mockClienteId,
      });
      mockPrisma.admin.eventoBitacora.create.mockResolvedValue({
        id: mockEventoId,
        ...validEventoPayload,
        tenantId: mockTenantId,
        fecha: new Date('2026-06-30T10:00:00Z'),
        sistema: { id: mockSistemaId, nombreSistema: 'BeeHive producción' },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/clientes/${mockClienteId}/eventos`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(validEventoPayload)
        .expect(201);

      expect(response.body).toHaveProperty('id', mockEventoId);
      expect(response.body).toHaveProperty('titulo', validEventoPayload.titulo);
      expect(response.body).toHaveProperty('tipo', 'Decisión');
    });

    it('returns 400 for empty titulo', async () => {
      const invalidPayload = {
        sistemaId: mockSistemaId,
        tipo: 'Decisión',
        titulo: '',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/clientes/${mockClienteId}/eventos`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(invalidPayload)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('returns 400 for missing sistemaId', async () => {
      const invalidPayload = {
        tipo: 'Decisión',
        titulo: 'Valid title',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/clientes/${mockClienteId}/eventos`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(invalidPayload)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });
  });

  // ── 4.5 GET /:id/tareas ────────────────────────────────────

  describe('4.5 — GET /api/v1/admin/clientes/:id/tareas', () => {
    it('returns 200 + filtered task list', async () => {
      mockPrisma.admin.tarea.findMany.mockResolvedValue(mockTareas);
      mockPrisma.admin.tarea.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/admin/clientes/${mockClienteId}/tareas`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .query({ estado: 'Pendiente' })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('titulo');
      expect(response.body.data[0]).toHaveProperty('prioridad');
      expect(response.body.data[0]).toHaveProperty('estado');
    });

    it('returns all tasks when no estado filter', async () => {
      mockPrisma.admin.tarea.findMany.mockResolvedValue(mockTareas);
      mockPrisma.admin.tarea.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/admin/clientes/${mockClienteId}/tareas`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });

    it('includes sistema info in response', async () => {
      mockPrisma.admin.tarea.findMany.mockResolvedValue(mockTareas);
      mockPrisma.admin.tarea.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/admin/clientes/${mockClienteId}/tareas`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(response.body.data[0].sistema).toHaveProperty('nombreSistema');
    });
  });

  // ── 4.5 POST /:id/tareas ───────────────────────────────────

  describe('4.5 — POST /api/v1/admin/clientes/:id/tareas', () => {
    const validTareaPayload = {
      titulo: 'Revisar backup semanal',
      prioridad: 'Alta',
      sistemaId: mockSistemaId,
    };

    it('returns 201 + created tarea', async () => {
      const createdTarea = {
        id: mockTareaId,
        clienteId: mockClienteId,
        titulo: validTareaPayload.titulo,
        estado: 'Pendiente',
        prioridad: validTareaPayload.prioridad,
        fechaLimite: null,
        sistema: { id: mockSistemaId, nombreSistema: 'BeeHive producción' },
      };
      mockPrisma.admin.tarea.create.mockResolvedValue(createdTarea);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/clientes/${mockClienteId}/tareas`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(validTareaPayload)
        .expect(201);

      expect(response.body).toHaveProperty('id', mockTareaId);
      expect(response.body).toHaveProperty('titulo', validTareaPayload.titulo);
      expect(response.body).toHaveProperty('estado', 'Pendiente');
    });

    it('assigns default priority Media when not provided', async () => {
      const payloadNoPriority = {
        titulo: 'Tarea sin prioridad',
      };
      const createdTarea = {
        id: mockTareaId,
        clienteId: mockClienteId,
        titulo: 'Tarea sin prioridad',
        estado: 'Pendiente',
        prioridad: 'Media',
        fechaLimite: null,
        sistema: null,
      };
      mockPrisma.admin.tarea.create.mockResolvedValue(createdTarea);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/clientes/${mockClienteId}/tareas`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(payloadNoPriority)
        .expect(201);

      expect(response.body.prioridad).toBe('Media');
    });

    it('returns 400 for empty titulo', async () => {
      const invalidPayload = { titulo: '' };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/clientes/${mockClienteId}/tareas`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(invalidPayload)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });
  });

  // ── 4.6 Security ───────────────────────────────────────────

  describe('4.6 — Security: tenant admin 403 on all endpoints', () => {
    beforeEach(() => {
      // Prisma calls are not reached since guards reject before controller
      // But we provide mock defaults to avoid accidental failures
      mockPrisma.admin.cliente.findUnique.mockResolvedValue(mockCliente);
      mockPrisma.admin.eventoBitacora.findMany.mockResolvedValue(mockEventos);
      mockPrisma.admin.eventoBitacora.count.mockResolvedValue(1);
      mockPrisma.admin.tarea.findMany.mockResolvedValue(mockTareas);
      mockPrisma.admin.tarea.count.mockResolvedValue(1);
    });

    it('GET /clientes/:id → 403 for tenant admin', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/admin/clientes/${mockClienteId}`)
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .expect(403);
    });

    it('PATCH /clientes/:id → 403 for tenant admin', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/clientes/${mockClienteId}`)
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .send({ nombre: 'test' })
        .expect(403);
    });

    it('GET /clientes/:id/eventos → 403 for tenant admin', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/admin/clientes/${mockClienteId}/eventos`)
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .expect(403);
    });

    it('POST /clientes/:id/eventos → 403 for tenant admin', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/admin/clientes/${mockClienteId}/eventos`)
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .send({ sistemaId: mockSistemaId, tipo: 'Decisión', titulo: 'Test' })
        .expect(403);
    });

    it('GET /clientes/:id/tareas → 403 for tenant admin', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/admin/clientes/${mockClienteId}/tareas`)
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .expect(403);
    });

    it('POST /clientes/:id/tareas → 403 for tenant admin', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/admin/clientes/${mockClienteId}/tareas`)
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .send({ titulo: 'Test' })
        .expect(403);
    });

    it('returns 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/admin/clientes/${mockClienteId}`)
        .expect(401);
    });
  });

  // ── 4.6 Tenant ID chain ─────────────────────────────────────

  describe('4.6 — Evento tenant_id matches cliente tenant via FK chain', () => {
    it('creates evento with tenant_id from sistema FK chain', async () => {
      mockPrisma.admin.sistema.findFirst.mockResolvedValue({
        id: mockSistemaId,
        tenantId: mockTenantId,
        clienteId: mockClienteId,
      });

      let capturedCreateData: any;
      mockPrisma.admin.eventoBitacora.create.mockImplementation(
        (args: any) => {
          capturedCreateData = args.data;
          return Promise.resolve({
            id: mockEventoId,
            ...args.data,
            fecha: new Date(),
            sistema: { id: mockSistemaId, nombreSistema: 'BeeHive producción' },
          });
        },
      );

      await request(app.getHttpServer())
        .post(`/api/v1/admin/clientes/${mockClienteId}/eventos`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          sistemaId: mockSistemaId,
          tipo: 'Decisión',
          titulo: 'Test FK chain',
        })
        .expect(201);

      expect(capturedCreateData).toBeDefined();
      expect(capturedCreateData.tenantId).toBe(mockTenantId);
    });
  });
});
