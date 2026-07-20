import { Test, TestingModule } from '@nestjs/testing';
import { BatchingEngine } from './batching-engine';
import { PrismaService } from '../../../common/prisma.service';

describe('BatchingEngine', () => {
  let engine: BatchingEngine;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      admin: {
        notificationBatch: {
          findMany: jest.fn().mockResolvedValue([]),
          update: jest.fn().mockResolvedValue({}),
        },
        notificationInstance: {
          count: jest.fn().mockResolvedValue(0),
        },
      },
      forTenant: jest.fn().mockReturnThis(),
      notificationBatch: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }: any) => ({ id: 'batch-1', ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      notificationDigest: {
        create: jest.fn().mockResolvedValue({}),
      },
      notificationInstance: {
        count: jest.fn().mockResolvedValue(50),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchingEngine,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    engine = module.get<BatchingEngine>(BatchingEngine);
  });

  describe('shouldBatch', () => {
    it('should return false for critical severity', () => {
      expect(engine.shouldBatch({ id: '1', tenantId: 't1', userId: 'u1', severity: 'critical', digestFrequency: 'daily' })).toBe(false);
    });

    it('should return false when digest frequency is never', () => {
      expect(engine.shouldBatch({ id: '1', tenantId: 't1', userId: 'u1', severity: 'info', digestFrequency: 'never' })).toBe(false);
    });

    it('should return true for normal batching conditions', () => {
      expect(engine.shouldBatch({ id: '1', tenantId: 't1', userId: 'u1', severity: 'info', digestFrequency: 'daily' })).toBe(true);
    });
  });

  describe('getBatchKey', () => {
    it('should include tenantId prefix for isolation', () => {
      const key = engine.getBatchKey({ id: '1', tenantId: 'tenant-a', userId: 'user-1', category: 'task', severity: 'info' });
      expect(key).toBe('tenant-a:task:user-1');
    });

    it('should default to general category', () => {
      const key = engine.getBatchKey({ id: '1', tenantId: 'tenant-a', userId: 'user-1', severity: 'info' });
      expect(key).toBe('tenant-a:general:user-1');
    });
  });

  describe('addToBatch', () => {
    it('should create a new batch when none exists', async () => {
      const id = await engine.addToBatch({
        id: '1', tenantId: 't1', userId: 'u1', category: 'task', severity: 'info',
      });
      expect(id).toBe('batch-1');
      expect(mockPrisma.notificationBatch.create).toHaveBeenCalled();
    });

    it('should reuse existing open batch', async () => {
      mockPrisma.notificationBatch.findFirst.mockResolvedValue({
        id: 'existing-batch', status: 'open', batchKey: 't1:task:u1',
      });
      const id = await engine.addToBatch({
        id: '1', tenantId: 't1', userId: 'u1', category: 'task', severity: 'info',
      });
      expect(id).toBe('existing-batch');
      expect(mockPrisma.notificationBatch.create).not.toHaveBeenCalled();
    });
  });

  describe('digest window', () => {
    it('should close batches and create digests', async () => {
      mockPrisma.admin.notificationBatch.findMany.mockResolvedValue([
        { id: 'batch-1', tenantId: 't1', userId: 'u1', category: 'task', batchKey: 't1:task:u1', windowStart: new Date(), windowEnd: new Date(), status: 'closed' },
      ]);
      mockPrisma.forTenant().notificationInstance.count.mockResolvedValue(150);

      const processed = await engine.processDigests();

      expect(processed).toBe(1);
      expect(mockPrisma.notificationDigest.create).toHaveBeenCalledTimes(2);
    });

    it('should handle sub-batch when count exceeds 100', async () => {
      mockPrisma.admin.notificationBatch.findMany.mockResolvedValue([
        { id: 'batch-1', tenantId: 't1', userId: 'u1', category: 'task', batchKey: 't1:task:u1', windowStart: new Date(), windowEnd: new Date(), status: 'closed' },
      ]);
      mockPrisma.forTenant().notificationInstance.count.mockResolvedValue(250);

      await engine.processDigests();

      expect(mockPrisma.notificationDigest.create).toHaveBeenCalledTimes(3);
    });
  });
});
