import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowDefinitionGuard } from './guards/workflow-definition.guard';
import { WorkflowExecutionGuard } from './guards/workflow-execution.guard';
import { PrismaService } from '../../common/prisma.service';

describe('Workflow Cross-Tenant Isolation (Doorbell)', () => {
  let definitionGuard: WorkflowDefinitionGuard;
  let executionGuard: WorkflowExecutionGuard;

  const mockRequest = (tenantId: string, id?: string) => ({
    query: { tenantId },
    params: { id },
    headers: {},
  });

  beforeEach(async () => {
    const mockPrisma = {
      forTenant: jest.fn().mockImplementation((tenantId: string) => ({
        workflowDefinition: {
          findFirst: jest.fn().mockImplementation(({ where }: any) => {
            if (where.tenantId !== where.tenantId) return null;
            if (tenantId === 'tenant-a' && where.id === 'def-a') {
              return { id: 'def-a', tenantId: 'tenant-a', name: 'Tenant A Definition' };
            }
            return null;
          }),
        },
        workflowInstance: {
          findFirst: jest.fn().mockImplementation(({ where }: any) => {
            if (tenantId === 'tenant-a' && where.id === 'inst-a') {
              return { id: 'inst-a', tenantId: 'tenant-a', status: 'running' };
            }
            return null;
          }),
        },
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowDefinitionGuard,
        WorkflowExecutionGuard,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    definitionGuard = module.get<WorkflowDefinitionGuard>(WorkflowDefinitionGuard);
    executionGuard = module.get<WorkflowExecutionGuard>(WorkflowExecutionGuard);
  });

  it('Tenant B should be denied access to Tenant A definitions', async () => {
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => mockRequest('tenant-b', 'def-a'),
      }),
    };
    await expect(definitionGuard.canActivate(context)).rejects.toThrow();
  });

  it('Tenant A should access their own definitions', async () => {
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => mockRequest('tenant-a', 'def-a'),
      }),
    };
    await expect(definitionGuard.canActivate(context)).resolves.toBe(true);
  });

  it('Tenant B should be denied access to Tenant A instances', async () => {
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => mockRequest('tenant-b', 'inst-a'),
      }),
    };
    await expect(executionGuard.canActivate(context)).rejects.toThrow();
  });

  it('Tenant A should access their own instances', async () => {
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => mockRequest('tenant-a', 'inst-a'),
      }),
    };
    await expect(executionGuard.canActivate(context)).resolves.toBe(true);
  });

  it('should require tenantId', async () => {
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => ({ query: {}, params: {}, headers: {} }),
      }),
    };
    await expect(definitionGuard.canActivate(context)).rejects.toThrow('tenantId is required');
  });
});
