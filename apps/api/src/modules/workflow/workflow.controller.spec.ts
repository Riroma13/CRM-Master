jest.mock('../../common/auth-client.provider', () => ({
  AUTH_CLIENT: 'AUTH_CLIENT',
  providerHeaders: (headers: Pick<Headers, 'get'>) => headers,
}));
jest.mock('better-auth/plugins/access', () => ({
  createAccessControl: () => ({
    newRole: (permissions: Record<string, string[]>) => ({
      authorize: (requested: Record<string, string[]>) => ({
        success: Object.entries(requested).every(([resource, actions]) =>
          actions.every((action) => permissions[resource]?.includes(action)),
        ),
      }),
    }),
  }),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { APP_GUARD } from '@nestjs/core';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { DefinitionService } from './definition.service';
import { PrismaService } from '../../common/prisma.service';
import { AUTH_CLIENT } from '../../common/auth-client.provider';
import { AuditService } from '../audit/audit.service';
import { IdentityMembershipRepository } from '../identity/identity-membership.repository';
import { IdentityOrganizationGuard } from '../identity/identity-organization.guard';
import { TenantResolveMiddleware } from '../../common/middleware/tenant-resolve.middleware';
import { BetterAuthGuard } from '../../common/guards/better-auth.guard';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { WorkflowTenantContextGuard } from './guards/workflow-tenant-context.guard';
import { WorkflowDefinitionGuard } from './guards/workflow-definition.guard';
import { WorkflowExecutionGuard } from './guards/workflow-execution.guard';

const TENANT_A = 'tenant-1';
const ORGANIZATION_A = 'org-1';
const USER_A = 'user-1';
const UUID_DEF = '00000000-0000-0000-0000-000000000001';
const UUID_INST = '00000000-0000-0000-0000-000000000002';
const UUID_EXEC = '00000000-0000-0000-0000-000000000003';

describe('WorkflowController (production authorization sequence)', () => {
  let app: INestApplication;
  let mockWorkflowService: any;
  let mockDefinitionService: any;

  const mockPrisma = {
    admin: {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ id: TENANT_A, slug: 'tenant-a', isActive: true }),
      },
      legacyUser: {
        findFirst: jest.fn().mockResolvedValue({
          id: USER_A,
          betterAuthUserId: USER_A,
          email: 'owner@example.com',
          name: 'Owner',
          role: 'owner',
          tenantId: TENANT_A,
          isActive: true,
        }),
      },
    },
    forTenant: jest.fn(),
  };

  const tenantClient = {
    tenant: {
      findFirst: jest.fn().mockResolvedValue({ betterAuthOrganizationId: ORGANIZATION_A }),
    },
    member: {
      findFirst: jest.fn().mockResolvedValue({ organizationId: ORGANIZATION_A, userId: USER_A, role: 'owner' }),
    },
    workflowDefinition: {
      findFirst: jest.fn().mockResolvedValue({ id: UUID_DEF, tenantId: TENANT_A }),
    },
    workflowInstance: {
      findFirst: jest.fn().mockResolvedValue({ id: UUID_INST, tenantId: TENANT_A }),
    },
  };

  const provider = {
    getSession: jest.fn().mockResolvedValue({ userId: USER_A, activeOrganizationId: ORGANIZATION_A }),
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockPrisma.forTenant.mockReturnValue(tenantClient);

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
        { provide: AUTH_CLIENT, useValue: provider },
        { provide: AuditService, useValue: { log: jest.fn() } },
        {
          provide: IdentityMembershipRepository,
          useValue: { findMembership: tenantClient.member.findFirst },
        },
        IdentityOrganizationGuard,
        WorkflowTenantContextGuard,
        WorkflowDefinitionGuard,
        WorkflowExecutionGuard,
        { provide: APP_GUARD, useClass: BetterAuthGuard },
        { provide: APP_GUARD, useClass: TenantScopeGuard },
        { provide: APP_GUARD, useClass: RateLimitGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    const tenantMiddleware = new TenantResolveMiddleware(mockPrisma as any);
    app.use(tenantMiddleware.use.bind(tenantMiddleware));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.useRealTimers();
  });

  const authorized = (testRequest: request.Test) => testRequest.set('Host', 'tenant-a.crmmaster.com').set('Authorization', 'Bearer verified-session');

  it('keeps the public route contract while using Host/session/membership authority', async () => {
    const res = await authorized(
      request(app.getHttpServer())
        .post('/api/v1/workflow/definitions')
        .query({ tenantId: 'forged-tenant' })
        .send({ tenantId: 'forged-tenant', name: 'Test Workflow', nodes: [], startNode: 'start' }),
    ).expect(201);

    expect(res.body).toHaveProperty('id');
    expect(mockDefinitionService.create).toHaveBeenCalledWith(
      TENANT_A,
      expect.objectContaining({ tenantId: 'forged-tenant' }),
    );
    expect(provider.getSession).toHaveBeenCalled();
    expect(tenantClient.member.findFirst).toHaveBeenCalledWith(TENANT_A, USER_A, ORGANIZATION_A);
  });

  it('does not let forged query tenantId redirect a same-tenant definition read', async () => {
    await authorized(
      request(app.getHttpServer())
        .get(`/api/v1/workflow/definitions/${UUID_DEF}`)
        .query({ tenantId: 'forged-tenant' }),
    ).expect(200);

    expect(mockDefinitionService.findOne).toHaveBeenCalledWith(TENANT_A, UUID_DEF);
    expect(tenantClient.workflowDefinition.findFirst).toHaveBeenCalledWith({
      where: { id: UUID_DEF, tenantId: TENANT_A },
    });
  });

  it('uses Host authority for start and ignores forged body tenantId', async () => {
    await authorized(
      request(app.getHttpServer())
        .post('/api/v1/workflow/instances')
        .query({ tenantId: 'forged-tenant' })
        .send({ definitionId: UUID_DEF, tenantId: 'forged-tenant' }),
    ).expect(201);

    expect(mockWorkflowService.startWorkflow).toHaveBeenCalledWith(
      TENANT_A,
      UUID_DEF,
      undefined,
      undefined,
    );
    expect(tenantClient.workflowDefinition.findFirst).toHaveBeenCalledWith({
      where: { id: UUID_DEF, tenantId: TENANT_A },
    });
  });

  it('preserves instance route status expectations through the execution guard', async () => {
    const res = await authorized(
      request(app.getHttpServer())
        .post(`/api/v1/workflow/instances/${UUID_INST}/resume`)
        .query({ tenantId: 'forged-tenant' })
        .send({ tenantId: 'forged-tenant' }),
    ).expect(201);

    expect(res.body.status).toBe('running');
    expect(mockWorkflowService.resumeWorkflow).toHaveBeenCalledWith(TENANT_A, UUID_INST, {
      tenantId: 'forged-tenant',
    });
    expect(tenantClient.workflowInstance.findFirst).toHaveBeenCalledWith({
      where: { id: UUID_INST, tenantId: TENANT_A },
    });
  });

  it('denies the full route before local guards when no verified session is present', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/workflow/definitions')
      .set('Host', 'tenant-a.crmmaster.com')
      .send({ name: 'Anonymous', nodes: [], startNode: 'start' })
      .expect(403);

    expect(mockDefinitionService.create).not.toHaveBeenCalled();
    expect(tenantClient.member.findFirst).not.toHaveBeenCalled();
  });
});
