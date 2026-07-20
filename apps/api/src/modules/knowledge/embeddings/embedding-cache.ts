import { createHash } from 'crypto';

interface CacheEntry {
  embedding: number[];
  expiresAt: number;
}

export class EmbeddingCache {
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private cache: Map<string, CacheEntry>;

  constructor(maxSize = 1000, ttlMs = 3_600_000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  get(text: string): number[] | undefined {
    const key = this.hashKey(text);
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.embedding;
  }

  set(text: string, embedding: number[]): void {
    const key = this.hashKey(text);

    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next();
      if (!oldest.done) {
        this.cache.delete(oldest.value);
      }
    }

    this.cache.set(key, {
      embedding,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  invalidate(text: string): void {
    const key = this.hashKey(text);
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  private hashKey(text: string): string {
    return createHash('md5').update(text).digest('hex');
  }
}
