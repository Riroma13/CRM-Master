import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowService } from './workflow.service';
import { DefinitionService } from './definition.service';
import { PrismaService } from '../../common/prisma.service';
import { PinoLoggerService } from '../observability/logging/pino-logger.service';

describe('Workflow Cross-Tenant Execution Isolation (Doorbell)', () => {
  let service: WorkflowService;
  let mockPrisma: any;
  let mockDefinitionService: any;
  let mockExecutorRegistry: Map<string, any>;

  beforeEach(async () => {
    const tenantAData = {
      executions: [
        { id: 'exec-a1', instanceId: 'inst-a', nodeId: 'step-1', tenantId: 'tenant-a', status: 'completed' },
      ],
      timers: [
        { id: 'timer-a1', instanceId: 'inst-a', nodeId: 'timer-1', tenantId: 'tenant-a', fireAt: new Date(), fired: false },
      ],
      audits: [
        { id: 'audit-a1', instanceId: 'inst-a', nodeId: 'step-1', tenantId: 'tenant-a', eventType: 'started' },
      ],
      variables: [
        { id: 'var-a1', instanceId: 'inst-a', key: 'status', value: 'active', tenantId: 'tenant-a' },
      ],
    };

    const emptyForTenantB = {
      executions: [],
      timers: [],
      audits: [],
      variables: [],
    };

    mockPrisma = {
      forTenant: jest.fn().mockImplementation((tenantId: string) => {
        const data = tenantId === 'tenant-a' ? tenantAData : emptyForTenantB;
        return {
          workflowExecution: {
            findMany: jest.fn().mockResolvedValue(data.executions),
            findFirst: jest.fn().mockImplementation(({ where }: any) => {
              const found = data.executions.find((e: any) => e.id === where?.id && e.tenantId === tenantId);
              return Promise.resolve(found || null);
            }),
            create: jest.fn().mockResolvedValue({}),
          },
          workflowTimer: {
            findMany: jest.fn().mockResolvedValue(data.timers),
            findFirst: jest.fn().mockResolvedValue(null),
          },
          workflowAudit: {
            findMany: jest.fn().mockResolvedValue(data.audits),
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
          },
          workflowVariable: {
            findMany: jest.fn().mockResolvedValue(data.variables),
            create: jest.fn().mockResolvedValue({}),
            upsert: jest.fn().mockResolvedValue({}),
          },
          workflowInstance: {
            findFirst: jest.fn().mockImplementation(({ where }: any) => {
              if (where.tenantId !== tenantId) return Promise.resolve(null);
              if (tenantId === 'tenant-a' && where.id === 'inst-a') {
                return Promise.resolve({ id: 'inst-a', tenantId: 'tenant-a', status: 'running', version: 1, definitionVersion: 1, definitionId: 'def-a', ...data });
              }
              if (where.id === 'new-inst') {
                return Promise.resolve({ id: 'new-inst', tenantId, status: 'running', version: 1, definitionVersion: 1, definitionId: 'def-b', executions: [], variables: [], activeBranches: [], audits: [] });
              }
              return Promise.resolve(null);
            }),
            findMany: jest.fn().mockResolvedValue([]),
            count: jest.fn().mockResolvedValue(0),
            update: jest.fn().mockResolvedValue({}),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            create: jest.fn().mockResolvedValue({ id: 'new-inst', tenantId }),
          },
          workflowDefinitionVersion: {
            findFirst: jest.fn().mockResolvedValue({ id: 'v-1', version: 1, nodes: [{ id: 'start', type: 'start' }], startNode: 'start', isPublished: true }),
          },
          workflowActiveBranch: {
            findMany: jest.fn().mockResolvedValue([]),
          },
          workflowUserTask: {
            findMany: jest.fn().mockResolvedValue([]),
          },
          $transaction: jest.fn(),
        };
      }),
    };

    mockDefinitionService = {
      getLatestPublished: jest.fn().mockResolvedValue({ id: 'v-1', version: 1, nodes: [{ id: 'start', type: 'start', name: 'Start' }, { id: 'end', type: 'end', name: 'End' }], startNode: 'start', isPublished: true }),
    };

    mockExecutorRegistry = new Map();
    mockExecutorRegistry.set('start', {
      execute: jest.fn().mockResolvedValue({ success: true, nextNodes: ['end'], status: 'completed' }),
    });
    mockExecutorRegistry.set('end', {
      execute: jest.fn().mockResolvedValue({ success: true, nextNodes: [], status: 'completed' }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DefinitionService, useValue: mockDefinitionService },
        { provide: 'NODE_EXECUTOR_REGISTRY', useValue: mockExecutorRegistry },
        { provide: PinoLoggerService, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), verbose: jest.fn() } },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
  });

  it('Tenant B should not see Tenant A executions via getInstance', async () => {
    await expect(service.getInstance('tenant-b', 'inst-a')).rejects.toThrow('Workflow instance not found');
  });

  it('Tenant B should not be able to suspend Tenant A instances', async () => {
    await expect(service.suspendWorkflow('tenant-b', 'inst-a')).rejects.toThrow('Workflow instance not found');
  });

  it('Tenant B should not be able to cancel Tenant A instances', async () => {
    await expect(service.cancelWorkflow('tenant-b', 'inst-a')).rejects.toThrow('Workflow instance not found');
  });

  it('Tenant B should not see Tenant A instances in listing', async () => {
    const result = await service.listInstances('tenant-b');
    expect(result.data).toHaveLength(0);
  });

  it('Tenant B should be able to start their own workflow', async () => {
    const result = await service.startWorkflow('tenant-b', 'def-b', {});
    expect(result).toHaveProperty('instanceId');
  });
});
