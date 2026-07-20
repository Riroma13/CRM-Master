import { CitationExtractor } from '../generation/citation-extractor';
import type { KbChunkResult, KbChunk } from '@shared/knowledge';

function makeChunk(id: string, sourceType: string, sourceId: string): KbChunk {
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
  score: number,
): KbChunkResult {
  return {
    chunk: makeChunk(id, sourceType, sourceId),
    score,
  };
}

describe('CitationExtractor', () => {
  let extractor: CitationExtractor;

  beforeEach(() => {
    extractor = new CitationExtractor();
  });

  describe('extractCitations', () => {
    it('should extract single citation', () => {
      const chunks = [makeChunkResult('1', 'document', 'doc-1', 0.9)];
      const response = 'Según el documento [0], el total es correcto.';

      const citations = extractor.extractCitations(response, chunks);

      expect(citations).toHaveLength(1);
      expect(citations[0].sourceId).toBe('doc-1');
      expect(citations[0].sourceType).toBe('document');
      expect(citations[0].relevanceScore).toBe(0.9);
    });

    it('should extract multiple citations', () => {
      const chunks = [
        makeChunkResult('1', 'document', 'doc-1', 0.9),
        makeChunkResult('2', 'workflow', 'wf-1', 0.8),
      ];
      const response =
        'Según [0] y [1], los datos coinciden.';

      const citations = extractor.extractCitations(response, chunks);

      expect(citations).toHaveLength(2);
      expect(citations[0].sourceId).toBe('doc-1');
      expect(citations[1].sourceId).toBe('wf-1');
    });

    it('should skip invalid index', () => {
      const chunks = [makeChunkResult('1', 'document', 'doc-1', 0.9)];
      const response = 'Según [0] y [5], hay datos.';

      const citations = extractor.extractCitations(response, chunks);

      expect(citations).toHaveLength(1);
    });

    it('should deduplicate same source', () => {
      const chunks = [
        makeChunkResult('1', 'document', 'doc-1', 0.9),
        makeChunkResult('2', 'document', 'doc-1', 0.85),
      ];
      const response = 'Según [0] y [1], los datos coinciden.';

      const citations = extractor.extractCitations(response, chunks);

      expect(citations).toHaveLength(1);
    });

    it('should return empty array when no citations found', () => {
      const chunks = [makeChunkResult('1', 'document', 'doc-1', 0.9)];
      const response = 'No hay citas en esta respuesta.';

      const citations = extractor.extractCitations(response, chunks);

      expect(citations).toHaveLength(0);
    });

    it('should truncate content to 200 chars', () => {
      const longContent = 'A'.repeat(500);
      const chunk = makeChunk('1', 'document', 'doc-1');
      chunk.content = longContent;
      const chunks = [{ chunk, score: 0.9 }];
      const response = 'Según [0].';

      const citations = extractor.extractCitations(response, chunks);

      expect(citations[0].content.length).toBe(200);
    });
  });

  describe('validateCitations', () => {
    it('should keep valid citations', () => {
      const chunks = [makeChunkResult('1', 'document', 'doc-1', 0.9)];
      const citations = extractor.extractCitations('Según [0]', chunks);
      const valid = extractor.validateCitations(citations, chunks);
      expect(valid).toHaveLength(1);
    });

    it('should filter out citations with missing sourceId', () => {
      const chunks = [makeChunkResult('1', 'document', 'doc-1', 0.9)];
      const badCitation = {
        sourceType: 'workflow' as const,
        sourceId: 'wf-missing',
        content: 'missing',
        relevanceScore: 0.5,
      };

      const valid = extractor.validateCitations([badCitation], chunks);

      expect(valid).toHaveLength(0);
    });
  });
});
