import { Test, TestingModule } from '@nestjs/testing';
import { TsVectorSearchEngine } from './tsvector-engine';
import { PrismaService } from '../../../common/prisma.service';

describe('TsVectorSearchEngine', () => {
  let engine: TsVectorSearchEngine;
  let prisma: any;

  const mockPrisma = {
    admin: {
      $executeRawUnsafe: jest.fn(),
      $queryRawUnsafe: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TsVectorSearchEngine,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    engine = module.get<TsVectorSearchEngine>(TsVectorSearchEngine);
    prisma = module.get(PrismaService);
  });

  describe('index', () => {
    it('should insert a new search entry on conflict do update', async () => {
      mockPrisma.admin.$executeRawUnsafe.mockResolvedValueOnce(undefined);

      await engine.index({
        entityType: 'cliente',
        entityId: 'cliente-1',
        title: 'Test Cliente',
        description: 'Un cliente de prueba',
        tags: ['VIP', 'TECH'],
        tenantId: 'tenant-1',
        clienteId: 'cliente-1',
        payload: { email: 'test@test.com' },
      });

      expect(mockPrisma.admin.$executeRawUnsafe).toHaveBeenCalledTimes(1);
      const sql = mockPrisma.admin.$executeRawUnsafe.mock.calls[0][0];
      expect(sql).toContain('INSERT INTO search_entries');
      expect(sql).toContain('ON CONFLICT');
      expect(sql).toContain('DO UPDATE');
    });

    it('should handle missing optional fields', async () => {
      mockPrisma.admin.$executeRawUnsafe.mockResolvedValueOnce(undefined);

      await engine.index({
        entityType: 'sistema',
        entityId: 'sys-1',
        title: 'Sistema Test',
        tenantId: 'tenant-1',
      });

      expect(mockPrisma.admin.$executeRawUnsafe).toHaveBeenCalledTimes(1);
    });

    it('should not throw on database failure', async () => {
      mockPrisma.admin.$executeRawUnsafe.mockRejectedValueOnce(new Error('DB error'));

      await expect(engine.index({
        entityType: 'cliente',
        entityId: 'cliente-1',
        title: 'Test',
        tenantId: 'tenant-1',
      })).resolves.toBeUndefined();
    });
  });

  describe('search', () => {
    it('should return empty array for empty query', async () => {
      const results = await engine.search({ q: '', tenantId: 'tenant-1' });
      expect(results).toEqual([]);
      expect(mockPrisma.admin.$queryRawUnsafe).not.toHaveBeenCalled();
    });

    it('should search with tsquery and return mapped results', async () => {
      const mockRows = [
        {
          entity_type: 'cliente',
          entity_id: 'cliente-1',
          title: 'Test Cliente',
          description: 'Description',
          tags: ['VIP'],
          match_field: 'title',
          score: 0.5,
          payload: { email: 'test@test.com' },
          created_at: new Date('2026-07-19'),
        },
      ];
      mockPrisma.admin.$queryRawUnsafe.mockResolvedValueOnce(mockRows);

      const results = await engine.search({ q: 'test', tenantId: 'tenant-1' });
      expect(results).toHaveLength(1);
      expect(results[0].entityType).toBe('cliente');
      expect(results[0].entityId).toBe('cliente-1');
      expect(results[0].title).toBe('Test Cliente');
    });

    it('should filter by entity type when provided', async () => {
      mockPrisma.admin.$queryRawUnsafe.mockResolvedValueOnce([]);

      await engine.search({ q: 'test', tenantId: 'tenant-1', type: 'documento' });

      const sql = mockPrisma.admin.$queryRawUnsafe.mock.calls[0][0];
      expect(sql).toContain('AND entity_type = $2');
    });

    it('should return empty array on database error', async () => {
      mockPrisma.admin.$queryRawUnsafe.mockRejectedValueOnce(new Error('DB error'));

      const results = await engine.search({ q: 'test', tenantId: 'tenant-1' });
      expect(results).toEqual([]);
    });
  });

  describe('remove', () => {
    it('should delete search entry by entity type, id and tenant', async () => {
      mockPrisma.admin.$executeRawUnsafe.mockResolvedValueOnce(undefined);

      await engine.remove('cliente', 'cliente-1', 'tenant-1');

      expect(mockPrisma.admin.$executeRawUnsafe).toHaveBeenCalledTimes(1);
      const sql = mockPrisma.admin.$executeRawUnsafe.mock.calls[0][0];
      expect(sql).toContain('DELETE FROM search_entries');
    });

    it('should log warning and not throw on failure', async () => {
      mockPrisma.admin.$executeRawUnsafe.mockRejectedValueOnce(new Error('DB error'));

      await expect(engine.remove('cliente', 'cliente-1', 'tenant-1')).resolves.toBeUndefined();
    });
  });
});
