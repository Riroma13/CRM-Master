import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Worker } from 'worker_threads';
import { join } from 'path';
import { EmbeddingCache } from './embedding-cache';

interface PendingRequest {
  resolve: (value: number[][]) => void;
  reject: (error: Error) => void;
}

@Injectable()
export class EmbeddingService implements OnModuleDestroy {
  private worker: Worker | null = null;
  private pending = new Map<string, PendingRequest>();
  private messageId = 0;

  constructor(private readonly cache: EmbeddingCache) {}

  async generateEmbedding(text: string): Promise<number[]> {
    const cached = this.cache.get(text);
    if (cached) return cached;

    const embeddings = await this.generateEmbeddings([text], 1);
    return embeddings[0];
  }

  async generateEmbeddings(
    texts: string[],
    batchSize = 32,
  ): Promise<number[][]> {
    const results: (number[] | undefined)[] = new Array(texts.length);
    const uncachedIndices: number[] = [];
    const uncachedTexts: string[] = [];

    texts.forEach((text, i) => {
      const cached = this.cache.get(text);
      if (cached) {
        results[i] = cached;
      } else {
        uncachedIndices.push(i);
        uncachedTexts.push(text);
      }
    });

    for (let i = 0; i < uncachedTexts.length; i += batchSize) {
      const batch = uncachedTexts.slice(i, i + batchSize);
      const batchEmbeddings = await this.runInWorker(batch);

      batch.forEach((text, j) => {
        const embedding = batchEmbeddings[j];
        this.cache.set(text, embedding);
        results[uncachedIndices[i + j]] = embedding;
      });
    }

    return results as number[][];
  }

  private async runInWorker(texts: string[]): Promise<number[][]> {
    const worker = this.getWorker();
    const id = String(++this.messageId);

    return new Promise<number[][]>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      worker.postMessage({ id, type: 'embed', texts });
    });
  }

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(join(__dirname, 'embedding.worker.js'));

      this.worker.on('message', (msg: any) => {
        const pending = this.pending.get(msg.id);
        if (!pending) return;

        this.pending.delete(msg.id);
        if (msg.type === 'error') {
          pending.reject(new Error(msg.error));
        } else {
          pending.resolve(msg.embeddings);
        }
      });

      this.worker.on('error', (err) => {
        for (const [, p] of this.pending) {
          p.reject(err);
        }
        this.pending.clear();
        this.worker = null;
      });

      this.worker.on('exit', (code) => {
        if (code !== 0) {
          for (const [, p] of this.pending) {
            p.reject(new Error(`Worker exited with code ${code}`));
          }
          this.pending.clear();
        }
        this.worker = null;
      });
    }

    return this.worker;
  }

  onModuleDestroy(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'terminate' });
      setTimeout(() => {
        if (this.worker) {
          this.worker.terminate();
          this.worker = null;
        }
      }, 1000).unref();
    }
  }
}
