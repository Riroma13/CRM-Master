import { Test, TestingModule } from '@nestjs/testing';
import { GenerationEngine } from '../generation/generation-engine';
import { ProviderRegistry } from '../../automation/ai/provider-registry';
import type { KbQuery, KbChunkResult, KbChunk } from '@shared/knowledge';

function makeChunk(
  id: string,
  sourceType: string,
  sourceId: string,
): KbChunk {
  return {
    id,
    tenantId: 'tenant-1',
    sourceType: sourceType as any,
    sourceId,
    chunkIndex: 0,
    content: `Content of ${sourceId}`,
    contentHash: 'hash',
    metadata: {},
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };
}

function makeChunkResult(
  id: string,
  sourceType: string,
  sourceId: string,
  score = 0.9,
): KbChunkResult {
  return {
    chunk: makeChunk(id, sourceType, sourceId),
    score,
  };
}

describe('GenerationEngine', () => {
  let engine: GenerationEngine;
  let providerRegistry: ProviderRegistry;
  let mockProvider: any;

  beforeEach(async () => {
    mockProvider = {
      id: 'openai',
      generate: jest.fn(),
      summarize: jest.fn(),
      classify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerationEngine,
        {
          provide: ProviderRegistry,
          useValue: {
            getProvider: jest.fn().mockReturnValue(mockProvider),
            getAvailableProviders: jest.fn().mockReturnValue(['openai']),
          },
        },
      ],
    }).compile();

    engine = module.get<GenerationEngine>(GenerationEngine);
    providerRegistry = module.get<ProviderRegistry>(ProviderRegistry);
  });

  describe('answer', () => {
    it('should construct prompt and call AiProvider', async () => {
      const chunks = [makeChunkResult('1', 'document', 'doc-1')];
      const query: KbQuery = {
        query: '¿Cuántos documentos hay?',
        tenantId: 'tenant-1',
      };

      mockProvider.generate.mockResolvedValue({
        content: 'Hay 5 documentos [0].',
        model: 'gpt-4',
        durationMs: 500,
      });

      const result = await engine.answer(query, chunks, 'tenant-1');

      expect(result.answer).toBe('Hay 5 documentos [0].');
      expect(result.citations).toHaveLength(1);
      expect(result.citations[0].sourceId).toBe('doc-1');
      expect(result.model).toBe('gpt-4');
    });

    it('should return empty answer when context is empty', async () => {
      const query: KbQuery = {
        query: 'test',
        tenantId: 'tenant-1',
      };

      const result = await engine.answer(query, [], 'tenant-1');

      expect(result.answer).toContain('No tengo información');
      expect(result.citations).toHaveLength(0);
    });

    it('should include chunks when includeChunks is true', async () => {
      const chunks = [makeChunkResult('1', 'document', 'doc-1')];
      const query: KbQuery = {
        query: 'test',
        tenantId: 'tenant-1',
        includeChunks: true,
      };

      mockProvider.generate.mockResolvedValue({
        content: 'Respuesta [0].',
        model: 'gpt-4',
        durationMs: 100,
      });

      const result = await engine.answer(query, chunks, 'tenant-1');

      expect(result.chunks).toHaveLength(1);
    });

    it('should throw when provider not found', async () => {
      jest
        .spyOn(providerRegistry, 'getProvider')
        .mockReturnValue(undefined);

      const query: KbQuery = { query: 'test', tenantId: 'tenant-1' };

      await expect(
        engine.answer(query, [makeChunkResult('1', 'document', 'doc-1')], 'tenant-1'),
      ).rejects.toThrow('AI provider not found');
    });

    it('should use custom temperature and maxTokens', async () => {
      const chunks = [makeChunkResult('1', 'document', 'doc-1')];
      const query: KbQuery = { query: 'test', tenantId: 'tenant-1' };

      mockProvider.generate.mockResolvedValue({
        content: 'Respuesta.',
        model: 'gpt-4',
        durationMs: 100,
      });

      await engine.answer(query, chunks, 'tenant-1', {
        temperature: 0.7,
        maxTokens: 2048,
      });

      expect(mockProvider.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
          maxTokens: 2048,
        }),
        expect.anything(),
      );
    });

    it('should extract citations from response', async () => {
      const chunks = [
        makeChunkResult('1', 'document', 'doc-1', 0.95),
        makeChunkResult('2', 'workflow', 'wf-1', 0.88),
      ];
      const query: KbQuery = { query: 'test', tenantId: 'tenant-1' };

      mockProvider.generate.mockResolvedValue({
        content: 'Según [0] y [1], hay coincidencia.',
        model: 'gpt-4',
        durationMs: 100,
      });

      const result = await engine.answer(query, chunks, 'tenant-1');

      expect(result.citations).toHaveLength(2);
      expect(result.citations[0].sourceType).toBe('document');
      expect(result.citations[1].sourceType).toBe('workflow');
    });
  });
});
