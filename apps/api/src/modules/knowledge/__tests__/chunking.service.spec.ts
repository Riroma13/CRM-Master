import { ChunkingService } from '../ingestion/chunking.service';

describe('ChunkingService', () => {
  let service: ChunkingService;

  beforeEach(() => {
    service = new ChunkingService(256, 0.2);
  });

  describe('chunkText', () => {
    it('should return empty array for empty text', async () => {
      const result = await service.chunkText('');
      expect(result).toEqual([]);
    });

    it('should return single chunk for short text', async () => {
      const result = await service.chunkText('Hello world');
      expect(result).toEqual(['Hello world']);
    });

    it('should return single chunk when text is shorter than chunk size', async () => {
      const shortText = 'A'.repeat(100);
      const result = await service.chunkText(shortText);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(shortText);
    });

    it('should split on double newline first', async () => {
      const line1 = 'X'.repeat(60);
      const line2 = 'Y'.repeat(60);
      const line3 = 'Z'.repeat(60);
      const text = `${line1}\n\n${line2}\n\n${line3}`;
      const result = await service.chunkText(text, { chunkSize: 20, overlap: 0 });

      expect(result.length).toBe(3);
      expect(result[0]).toContain('X');
      expect(result[1]).toContain('Y');
      expect(result[2]).toContain('Z');
    });

    it('should split on single newline when double newline not enough', async () => {
      const line1 = 'X'.repeat(120);
      const line2 = 'Y'.repeat(120);
      const text = `${line1}\n${line2}`;

      const result = await service.chunkText(text, { chunkSize: 10, overlap: 2 });
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should respect chunk size limit', async () => {
      const text = 'A'.repeat(2000);
      const result = await service.chunkText(text, { chunkSize: 10, overlap: 2 });

      for (const chunk of result) {
        const estimatedTokens = Math.ceil(chunk.length / 4);
        expect(estimatedTokens).toBeLessThanOrEqual(15);
      }
    });

    it('should apply 20% overlap', async () => {
      const chunkSize = 10;
      const text = 'Hello world. This is a test. Another sentence. Final one.';
      const result = await service.chunkText(text, {
        chunkSize,
        overlap: Math.round(chunkSize * 0.2),
      });

      if (result.length > 1) {
        const overlap = Math.round(chunkSize * 0.2);
        const overlapChars = overlap * 4;
        for (let i = 1; i < result.length; i++) {
          const prevEnd = result[i - 1].slice(-overlapChars);
          expect(result[i]).toContain(prevEnd);
        }
      }
    });
  });

  describe('recursive splitting order', () => {
    it('should split on double newline first', async () => {
      const text = 'A'.repeat(120) + '\n\n' + 'B'.repeat(120);
      const result = await service.chunkText(text, { chunkSize: 10, overlap: 0 });

      const hasSplit = result.some((chunk) => chunk.startsWith('B'));
      expect(hasSplit).toBe(true);
    });

    it('should split on period when newlines are not present', async () => {
      const sentence1 = 'A'.repeat(120);
      const sentence2 = 'B'.repeat(120);
      const text = `${sentence1}.${sentence2}.`;
      const result = await service.chunkText(text, { chunkSize: 10, overlap: 0 });

      expect(result.length).toBeGreaterThan(1);
    });

    it('should split on space as last resort', async () => {
      const word1 = 'A'.repeat(120);
      const word2 = 'B'.repeat(120);
      const text = `${word1} ${word2}`;
      const result = await service.chunkText(text, { chunkSize: 10, overlap: 0 });

      expect(result.length).toBeGreaterThan(1);
    });

    it('should hard-split single long word without separators', async () => {
      const longWord = 'A'.repeat(5000);
      const result = await service.chunkText(longWord, { chunkSize: 10, overlap: 0 });

      expect(result.length).toBeGreaterThan(1);
      const maxLength = Math.max(...result.map(c => c.length));
      expect(maxLength).toBeLessThanOrEqual(80);
    });
  });

  describe('generateContentHash', () => {
    it('should generate MD5 hash', () => {
      const hash = service.generateContentHash('hello world');
      expect(hash).toHaveLength(32);
      expect(hash).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should generate consistent hashes', () => {
      const hash1 = service.generateContentHash('same text');
      const hash2 = service.generateContentHash('same text');
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different text', () => {
      const hash1 = service.generateContentHash('text one');
      const hash2 = service.generateContentHash('text two');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('ChunkingStrategy interface compliance', () => {
    it('should have a name property', () => {
      expect(service.name).toBe('recursive-character');
    });

    it('should implement chunk method matching ChunkingStrategy', async () => {
      const chunks = await service.chunk('test text');
      expect(Array.isArray(chunks)).toBe(true);
    });
  });
});
