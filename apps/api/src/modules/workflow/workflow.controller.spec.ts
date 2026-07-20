import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { DefinitionService } from './definition.service';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../../common/prisma.service';

const UUID_DEF = '00000000-0000-0000-0000-000000000001';
const UUID_INST = '00000000-0000-0000-0000-000000000002';
const UUID_EXEC = '00000000-0000-0000-0000-000000000003';

describe('WorkflowController (integration)', () => {
  let app: INestApplication;
  let mockWorkflowService: any;
  let mockDefinitionService: any;

  const mockPrisma = {
    forTenant: jest.fn().mockReturnThis(),
    workflowDefinition: { findFirst: jest.fn().mockResolvedValue({ id: UUID_DEF, tenantId: 'tenant-1' }) },
    workflowInstance: { findFirst: jest.fn().mockResolvedValue({ id: UUID_INST, tenantId: 'tenant-1' }) },
  };

  beforeEach(async () => {
    mockDefinitionService = {
      create: jest.fn().mockResolvedValue({ id: UUID_DEF, name: 'Test', versions: [{ version: 1 }] }),
      findAll: jest.fn().mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0 } }),
      findOne: jest.fn().mockResolvedValue({ id: UUID_DEF, name: 'Test', versions: [] }),
      createVersion: jest.fn().mockResolvedValue({ id: 'v-2', version: 2 }),
      publish: jest.fn().mockResolvedValue({ id: 'v-1', isPublished: true }),
    };

    mockWorkflowService = {
      startWorkflow: jest.fn().mockResolvedValue({ instanceId: UUID_INST, executionId: UUID_EXEC }),
      listInstances: jest.fn().mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0 } }),
      getInstance: jest.fn().mockResolvedValue({ id: UUID_INST, status: 'running' }),
      resumeWorkflow: jest.fn().mockResolvedValue({ instanceId: UUID_INST, status: 'running' }),
      suspendWorkflow: jest.fn().mockResolvedValue({ instanceId: UUID_INST, status: 'suspended' }),
      cancelWorkflow: jest.fn().mockResolvedValue({ instanceId: UUID_INST, status: 'cancelled' }),
      retryStep: jest.fn().mockResolvedValue({ executionId: UUID_EXEC, status: 'pending' }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowController],
      providers: [
        { provide: WorkflowService, useValue: mockWorkflowService },
        { provide: DefinitionService, useValue: mockDefinitionService },
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: APP_GUARD,
          useValue: { canActivate: () => true },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/v1/workflow/definitions', () => {
    it('should create a definition', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/workflow/definitions')
        .query({ tenantId: 'tenant-1' })
        .send({ name: 'Test Workflow', nodes: [], startNode: 'start' })
        .expect(201);
      expect(res.body).toHaveProperty('id');
    });
  });

  describe('GET /api/v1/workflow/definitions', () => {
    it('should list definitions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/workflow/definitions')
        .query({ tenantId: 'tenant-1' })
        .expect(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('GET /api/v1/workflow/definitions/:id', () => {
    it('should get a definition', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/workflow/definitions/${UUID_DEF}`)
        .query({ tenantId: 'tenant-1' })
        .expect(200);
      expect(res.body).toHaveProperty('id', UUID_DEF);
    });
  });

  describe('POST /api/v1/workflow/definitions/:id/versions', () => {
    it('should create a new version', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/workflow/definitions/${UUID_DEF}/versions`)
        .query({ tenantId: 'tenant-1' })
        .send({ nodes: [{ id: 'start', type: 'start' }], startNode: 'start' })
        .expect(201);
      expect(res.body).toHaveProperty('version', 2);
    });
  });

  describe('POST /api/v1/workflow/definitions/:id/publish', () => {
    it('should publish a version', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/workflow/definitions/${UUID_DEF}/publish`)
        .query({ tenantId: 'tenant-1' })
        .expect(201);
      expect(res.body.isPublished).toBe(true);
    });
  });

  describe('POST /api/v1/workflow/instances', () => {
    it('should start a workflow', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/workflow/instances')
        .query({ tenantId: 'tenant-1' })
        .send({ definitionId: UUID_DEF })
        .expect(201);
      expect(res.body).toHaveProperty('instanceId');
    });
  });

  describe('GET /api/v1/workflow/instances', () => {
    it('should list instances', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/workflow/instances')
        .query({ tenantId: 'tenant-1' })
        .expect(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('POST /api/v1/workflow/instances/:id/suspend', () => {
    it('should suspend an instance', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/workflow/instances/${UUID_INST}/suspend`)
        .query({ tenantId: 'tenant-1' })
        .expect(201);
      expect(res.body.status).toBe('suspended');
    });
  });

  describe('POST /api/v1/workflow/instances/:id/cancel', () => {
    it('should cancel an instance', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/workflow/instances/${UUID_INST}/cancel`)
        .query({ tenantId: 'tenant-1' })
        .expect(201);
      expect(res.body.status).toBe('cancelled');
    });
  });

  describe('POST /api/v1/workflow/instances/:id/resume', () => {
    it('should resume an instance', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/workflow/instances/${UUID_INST}/resume`)
        .query({ tenantId: 'tenant-1' })
        .expect(201);
      expect(res.body.status).toBe('running');
    });
  });
});
