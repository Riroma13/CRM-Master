import { EmbeddingCache } from '../embeddings/embedding-cache';

describe('EmbeddingCache', () => {
  let cache: EmbeddingCache;

  beforeEach(() => {
    cache = new EmbeddingCache(3, 3_600_000);
  });

  describe('cache hit/miss', () => {
    it('should return undefined for uncached text', () => {
      const result = cache.get('unknown text');
      expect(result).toBeUndefined();
    });

    it('should return cached embedding for previously set text', () => {
      const embedding = new Array(384).fill(0.5);
      cache.set('test text', embedding);
      const result = cache.get('test text');
      expect(result).toEqual(embedding);
    });

    it('should distinguish between different texts', () => {
      cache.set('text a', [0.1, 0.2, 0.3]);
      cache.set('text b', [0.4, 0.5, 0.6]);

      expect(cache.get('text a')).toEqual([0.1, 0.2, 0.3]);
      expect(cache.get('text b')).toEqual([0.4, 0.5, 0.6]);
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortTtlCache = new EmbeddingCache(100, 10);
      shortTtlCache.set('text', [0.1, 0.2]);

      expect(shortTtlCache.get('text')).toBeDefined();

      await new Promise((r) => setTimeout(r, 20));

      expect(shortTtlCache.get('text')).toBeUndefined();
      shortTtlCache.clear();
    });

    it('should not expire entries before TTL', () => {
      const embedding = [0.1, 0.2, 0.3];
      cache.set('text', embedding);
      expect(cache.get('text')).toEqual(embedding);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when cache is full', () => {
      cache.set('a', [1]);
      cache.set('b', [2]);
      cache.set('c', [3]);
      cache.set('d', [4]);

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBeDefined();
      expect(cache.get('c')).toBeDefined();
      expect(cache.get('d')).toBeDefined();
    });

    it('should promote accessed entries to most-recent position', () => {
      cache.set('a', [1]);
      cache.set('b', [2]);
      cache.set('c', [3]);

      cache.get('a');
      cache.set('d', [4]);

      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('a')).toBeDefined();
      expect(cache.get('c')).toBeDefined();
      expect(cache.get('d')).toBeDefined();
    });
  });

  describe('invalidation', () => {
    it('should remove entry on invalidate', () => {
      cache.set('text', [0.5, 0.6]);
      expect(cache.get('text')).toBeDefined();

      cache.invalidate('text');
      expect(cache.get('text')).toBeUndefined();
    });

    it('should not affect other entries on invalidate', () => {
      cache.set('a', [1]);
      cache.set('b', [2]);

      cache.invalidate('a');

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toEqual([2]);
    });

    it('should not throw when invalidating non-existent key', () => {
      expect(() => cache.invalidate('nonexistent')).not.toThrow();
    });
  });

  describe('size tracking', () => {
    it('should track number of entries', () => {
      expect(cache.size).toBe(0);
      cache.set('a', [1]);
      expect(cache.size).toBe(1);
      cache.set('b', [2]);
      expect(cache.size).toBe(2);
    });

    it('should not increase size on update of existing key', () => {
      cache.set('a', [1]);
      cache.set('a', [2]);
      expect(cache.size).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('a', [1]);
      cache.set('b', [2]);
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBeUndefined();
    });
  });
});
