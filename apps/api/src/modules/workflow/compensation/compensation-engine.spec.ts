import { Test, TestingModule } from '@nestjs/testing';
import { CompensationEngine } from './compensation-engine';
import { PrismaService } from '../../../common/prisma.service';

describe('CompensationEngine', () => {
  let engine: CompensationEngine;
  let mockPrisma: any;
  const mockNow = new Date('2024-01-01T00:00:00Z');

  beforeEach(async () => {
    mockPrisma = {
      forTenant: jest.fn().mockReturnThis(),
      workflowExecution: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'exec-3', instanceId: 'inst-1', nodeId: 'step-3', status: 'completed', input: {}, completedAt: new Date(mockNow.getTime() + 3000) },
          { id: 'exec-2', instanceId: 'inst-1', nodeId: 'step-2', status: 'completed', input: {}, completedAt: new Date(mockNow.getTime() + 2000) },
          { id: 'exec-1', instanceId: 'inst-1', nodeId: 'step-1', status: 'completed', input: {}, completedAt: new Date(mockNow.getTime() + 1000) },
        ]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      workflowInstance: {
        findFirst: jest.fn().mockResolvedValue({ id: 'inst-1', definitionId: 'def-1', definitionVersion: 1, tenantId: 'tenant-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      workflowDefinitionVersion: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'v-1',
          nodes: [
            { id: 'step-1', type: 'service-task', compensation: 'comp-1' },
            { id: 'comp-1', type: 'compensation' },
            { id: 'step-2', type: 'service-task', compensation: 'comp-2' },
            { id: 'comp-2', type: 'compensation' },
            { id: 'step-3', type: 'service-task' },
          ],
        }),
      },
      workflowAudit: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompensationEngine,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    engine = module.get<CompensationEngine>(CompensationEngine);
  });

  it('should execute compensation in reverse order for steps with compensation', async () => {
    await engine.compensate('tenant-1', 'inst-1');

    expect(mockPrisma.workflowExecution.create).toHaveBeenCalledTimes(2);
    // step-3 has no compensation, step-2 and step-1 do
  });

  it('should skip already compensated steps (idempotent)', async () => {
    mockPrisma.workflowExecution.findFirst.mockResolvedValue({ id: 'existing-comp', status: 'completed' });

    await engine.compensate('tenant-1', 'inst-1');

    expect(mockPrisma.workflowAudit.create).not.toHaveBeenCalled();
  });

  it('should mark instance as compensated', async () => {
    await engine.compensate('tenant-1', 'inst-1');

    expect(mockPrisma.workflowInstance.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'compensated' }),
      }),
    );
  });

  it('should handle empty execution list gracefully', async () => {
    mockPrisma.workflowExecution.findMany.mockResolvedValue([]);

    await expect(engine.compensate('tenant-1', 'inst-1')).resolves.not.toThrow();
  });

  it('should only compensate steps that have compensation defined', async () => {
    await engine.compensate('tenant-1', 'inst-1');

    const createCalls = mockPrisma.workflowExecution.create.mock.calls;
    const compensatedNodeIds = createCalls.map((c: any) => c[0].data.nodeId);
    expect(compensatedNodeIds).toContain('comp-2');
    expect(compensatedNodeIds).toContain('comp-1');
    expect(compensatedNodeIds).not.toContain('step-3');
  });
});
