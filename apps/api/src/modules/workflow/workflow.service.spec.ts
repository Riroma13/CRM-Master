import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { DefinitionService } from './definition.service';
import { PrismaService } from '../../common/prisma.service';
import { PinoLoggerService } from '../observability/logging/pino-logger.service';

describe('WorkflowService', () => {
  let service: WorkflowService;
  let mockPrisma: any;
  let mockDefinitionService: any;
  let mockExecutorRegistry: Map<string, any>;

  const mockNodeExecutor = {
    execute: jest.fn().mockResolvedValue({ success: true, nextNodes: [], status: 'completed' }),
  };

  beforeEach(async () => {
    mockPrisma = {
      forTenant: jest.fn().mockReturnThis(),
      workflowInstance: {
        create: jest.fn().mockResolvedValue({ id: 'instance-1', definitionId: 'def-1', tenantId: 'tenant-1', status: 'running', version: 1 }),
        findFirst: jest.fn().mockResolvedValue({ id: 'instance-1', definitionId: 'def-1', tenantId: 'tenant-1', status: 'running', version: 1, definitionVersion: 1, executions: [], variables: [], activeBranches: [], audits: [] }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      workflowDefinition: {
        findFirst: jest.fn().mockResolvedValue({ id: 'def-1', tenantId: 'tenant-1', name: 'Test Workflow' }),
      },
      workflowDefinitionVersion: {
        findFirst: jest.fn().mockResolvedValue({ id: 'v-1', version: 1, nodes: [{ id: 'start', type: 'start', name: 'Start' }, { id: 'end', type: 'end', name: 'End' }], startNode: 'start', isPublished: true }),
      },
      workflowExecution: {
        create: jest.fn().mockResolvedValue({ id: 'exec-1', instanceId: 'instance-1', nodeId: 'start', status: 'running' }),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      workflowVariable: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({}),
      },
      workflowAudit: {
        create: jest.fn().mockResolvedValue({}),
      },
      workflowActiveBranch: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      workflowUserTask: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      workflowTimer: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    mockDefinitionService = {
      getLatestPublished: jest.fn().mockResolvedValue({ id: 'v-1', version: 1, nodes: [{ id: 'start', type: 'start', name: 'Start' }, { id: 'end', type: 'end', name: 'End' }], startNode: 'start', isPublished: true }),
    };

    mockExecutorRegistry = new Map();
    mockExecutorRegistry.set('start', mockNodeExecutor);

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

  describe('startWorkflow', () => {
    it('should create an instance and return ids', async () => {
      const result = await service.startWorkflow('tenant-1', 'def-1', { key: 'value' }, 'corr-1');
      expect(result).toHaveProperty('instanceId');
      expect(result).toHaveProperty('executionId');
      expect(mockPrisma.workflowInstance.create).toHaveBeenCalled();
    });

    it('should fail when definition has no published version', async () => {
      mockDefinitionService.getLatestPublished.mockRejectedValueOnce(new NotFoundException('No published version'));
      await expect(service.startWorkflow('tenant-1', 'def-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('suspendWorkflow', () => {
    it('should suspend a running instance', async () => {
      const result = await service.suspendWorkflow('tenant-1', 'instance-1');
      expect(result.status).toBe('suspended');
    });

    it('should reject suspending a non-running instance', async () => {
      mockPrisma.workflowInstance.findFirst.mockResolvedValueOnce({ id: 'instance-1', tenantId: 'tenant-1', status: 'completed', version: 2 });
      await expect(service.suspendWorkflow('tenant-1', 'instance-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('cancelWorkflow', () => {
    it('should cancel a running instance', async () => {
      const result = await service.cancelWorkflow('tenant-1', 'instance-1');
      expect(result.status).toBe('cancelled');
    });
  });

  describe('completeWorkflow', () => {
    it('should complete a running instance', async () => {
      const result = await service.completeWorkflow('tenant-1', 'instance-1');
      expect(result.status).toBe('completed');
    });
  });

  describe('getInstance', () => {
    it('should return instance details', async () => {
      const result = await service.getInstance('tenant-1', 'instance-1');
      expect(result).toHaveProperty('id', 'instance-1');
    });
  });

  describe('listInstances', () => {
    it('should return paginated results', async () => {
      const result = await service.listInstances('tenant-1');
      expect(result).toHaveProperty('pagination');
      expect(result).toHaveProperty('data');
    });
  });
});
