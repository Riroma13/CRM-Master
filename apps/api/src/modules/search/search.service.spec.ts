import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;
  let mockEngine: any;

  beforeEach(async () => {
    mockEngine = {
      search: jest.fn(),
      index: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: 'SEARCH_ENGINE', useValue: mockEngine },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  describe('search', () => {
    it('should delegate to engine.search', async () => {
      mockEngine.search.mockResolvedValueOnce([{ entityType: 'cliente', entityId: '1', title: 'Test', score: 0.5, url: '/admin/clientes/1', createdAt: '' }]);
      const results = await service.search({ q: 'test', tenantId: 't1' });
      expect(mockEngine.search).toHaveBeenCalledWith({ q: 'test', tenantId: 't1' });
      expect(results).toHaveLength(1);
    });

    it('should return empty array on engine error', async () => {
      mockEngine.search.mockRejectedValueOnce(new Error('engine error'));
      const results = await service.search({ q: 'test', tenantId: 't1' });
      expect(results).toEqual([]);
    });
  });

  describe('index', () => {
    it('should delegate to engine.index', async () => {
      const input = { entityType: 'cliente', entityId: '1', title: 'Test', tenantId: 't1' };
      await service.index(input);
      expect(mockEngine.index).toHaveBeenCalledWith(input);
    });

    it('should not throw on engine error', async () => {
      mockEngine.index.mockRejectedValueOnce(new Error('engine error'));
      await expect(service.index({ entityType: 'cliente', entityId: '1', title: 'Test', tenantId: 't1' })).resolves.toBeUndefined();
    });
  });

  describe('remove', () => {
    it('should delegate to engine.remove', async () => {
      await service.remove('cliente', '1', 't1');
      expect(mockEngine.remove).toHaveBeenCalledWith('cliente', '1', 't1');
    });

    it('should not throw on engine error', async () => {
      mockEngine.remove.mockRejectedValueOnce(new Error('engine error'));
      await expect(service.remove('cliente', '1', 't1')).resolves.toBeUndefined();
    });
  });
});
