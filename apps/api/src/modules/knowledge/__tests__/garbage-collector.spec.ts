import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma.service';
import { GarbageCollectorService } from '../ingestion/garbage-collector.service';

describe('GarbageCollectorService', () => {
  let service: GarbageCollectorService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      admin: {
        kbChunk: {
          findMany: jest.fn(),
          deleteMany: jest.fn(),
        },
        kbSourceIndex: {
          findFirst: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GarbageCollectorService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<GarbageCollectorService>(GarbageCollectorService);
  });

  describe('process with dryRun=true', () => {
    it('should detect orphans but not delete them in dry-run mode', async () => {
      prisma.admin.kbChunk.findMany
        .mockResolvedValueOnce([
          { id: 'c1', tenantId: 't1', sourceType: 'document', sourceId: 'orphan-doc' },
        ])
        .mockResolvedValueOnce([
          { id: 'c1', tenantId: 't1', sourceType: 'document', sourceId: 'orphan-doc' },
        ]);
      prisma.admin.kbSourceIndex.findFirst.mockResolvedValue(null);

      const job = {
        id: 'gc-1',
        data: { dryRun: true },
      } as any;

      const result = await service.process(job);

      expect(result.dryRun).toBe(true);
      expect(result.orphans).toBe(1);
      expect(result.deleted).toBe(0);
      expect(prisma.admin.kbChunk.deleteMany).not.toHaveBeenCalled();
    });

    it('should default to dry-run when no data provided', async () => {
      prisma.admin.kbChunk.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const job = {
        id: 'gc-default',
        data: {},
      } as any;

      const result = await service.process(job);

      expect(result.dryRun).toBe(true);
    });
  });

  describe('process with dryRun=false', () => {
    it('should delete detected orphans', async () => {
      prisma.admin.kbChunk.findMany
        .mockResolvedValueOnce([
          { id: 'c1', tenantId: 't1', sourceType: 'document', sourceId: 'orphan-doc' },
        ])
        .mockResolvedValueOnce([
          { id: 'c1', tenantId: 't1', sourceType: 'document', sourceId: 'orphan-doc' },
        ]);
      prisma.admin.kbSourceIndex.findFirst.mockResolvedValue(null);
      prisma.admin.kbChunk.deleteMany.mockResolvedValue({ count: 1 });

      const job = {
        id: 'gc-delete',
        data: { dryRun: false },
      } as any;

      const result = await service.process(job);

      expect(result.dryRun).toBe(false);
      expect(result.deleted).toBe(1);
      expect(result.orphans).toBe(1);
      expect(prisma.admin.kbChunk.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['c1'] } },
      });
    });
  });

  describe('orphan detection', () => {
    it('should not report chunks with existing source index as orphans', async () => {
      prisma.admin.kbChunk.findMany
        .mockResolvedValueOnce([
          { id: 'c1', tenantId: 't1', sourceType: 'document', sourceId: 'active-doc' },
        ])
        .mockResolvedValueOnce([]);
      prisma.admin.kbSourceIndex.findFirst.mockResolvedValue({
        id: 'si-1',
        tenantId: 't1',
        sourceType: 'document',
        sourceId: 'active-doc',
      });

      const job = {
        id: 'gc-no-orphans',
        data: { dryRun: false },
      } as any;

      const result = await service.process(job);

      expect(result.orphans).toBe(0);
      expect(result.deleted).toBe(0);
    });

    it('should handle multiple orphan sources', async () => {
      prisma.admin.kbChunk.findMany
        .mockResolvedValueOnce([
          { id: 'c1', tenantId: 't1', sourceType: 'document', sourceId: 'orphan-1' },
          { id: 'c2', tenantId: 't1', sourceType: 'document', sourceId: 'orphan-2' },
        ])
        .mockResolvedValueOnce([{ id: 'c1', tenantId: 't1', sourceType: 'document', sourceId: 'orphan-1' }])
        .mockResolvedValueOnce([{ id: 'c2', tenantId: 't1', sourceType: 'document', sourceId: 'orphan-2' }]);
      prisma.admin.kbSourceIndex.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.admin.kbChunk.deleteMany.mockResolvedValue({ count: 2 });

      const job = {
        id: 'gc-multi',
        data: { dryRun: false },
      } as any;

      const result = await service.process(job);

      expect(result.orphans).toBe(2);
      expect(result.deleted).toBe(2);
    });
  });
});
