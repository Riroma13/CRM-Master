import { Injectable, Logger } from '@nestjs/common';
import { Worker } from 'worker_threads';
import * as path from 'path';
import type { PluginManifest, ExtensionAPIV1 } from '@shared/plugin';

interface PoolEntry {
  worker: Worker;
  lastUsed: number;
  inUse: boolean;
}

const MAX_POOL_SIZE = 10;
const EXECUTION_TIMEOUT_MS = 10_000;
const MAX_MEMORY_MB = 50;

@Injectable()
export class WorkerPoolService {
  private readonly logger = new Logger(WorkerPoolService.name);
  private readonly pool: PoolEntry[] = [];
  private readonly workerPath: string;

  constructor() {
    this.workerPath = path.resolve(__dirname, 'plugin.worker.js');
  }

  acquire(): Worker {
    const now = Date.now();
    const idle = this.pool.filter(e => !e.inUse);

    if (idle.length > 0) {
      idle.sort((a, b) => b.lastUsed - a.lastUsed);
      const entry = idle[0];
      entry.inUse = true;
      entry.lastUsed = now;
      return entry.worker;
    }

    if (this.pool.length < MAX_POOL_SIZE) {
      const worker = this.createWorker();
      const entry: PoolEntry = { worker, lastUsed: now, inUse: true };
      this.pool.push(entry);
      return worker;
    }

    this.pool.sort((a, b) => a.lastUsed - b.lastUsed);
    const lru = this.pool[0];
    lru.worker.terminate();
    const newWorker = this.createWorker();
    lru.worker = newWorker;
    lru.lastUsed = now;
    lru.inUse = true;
    return newWorker;
  }

  release(worker: Worker): void {
    const entry = this.pool.find(e => e.worker === worker);
    if (entry) {
      entry.inUse = false;
      entry.lastUsed = Date.now();
    }
  }

  async execute(
    pluginId: string,
    handler: string,
    payload: unknown,
  ): Promise<unknown> {
    const worker = this.acquire();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.handleTimeout(worker);
        reject(new Error(`Plugin execution timed out after ${EXECUTION_TIMEOUT_MS}ms`));
      }, EXECUTION_TIMEOUT_MS);

      worker.once('message', (result: { type: string; data?: unknown; message?: string }) => {
        clearTimeout(timeout);
        this.release(worker);

        if (result.type === 'error') {
          reject(new Error(String(result.message)));
        } else {
          resolve(result.data);
        }
      });

      worker.once('error', (err: Error) => {
        clearTimeout(timeout);
        this.logger.error(`Worker error for plugin ${pluginId}: ${err.message}`);
        this.release(worker);
        reject(err);
      });

      worker.postMessage({ pluginId, handler, payload });
    });
  }

  get poolSize(): number {
    return this.pool.length;
  }

  get activeCount(): number {
    return this.pool.filter(e => e.inUse).length;
  }

  async shutdown(): Promise<void> {
    for (const entry of this.pool) {
      await entry.worker.terminate();
    }
    this.pool.length = 0;
  }

  private handleTimeout(worker: Worker): void {
    const entry = this.pool.find(e => e.worker === worker);
    worker.terminate();
    const newWorker = this.createWorker();
    if (entry) {
      entry.worker = newWorker;
      entry.inUse = false;
      entry.lastUsed = Date.now();
    }
  }

  private createWorker(): Worker {
    const worker = new Worker(this.workerPath, {
      resourceLimits: {
        maxOldGenerationSizeMb: MAX_MEMORY_MB,
      },
    });
    return worker;
  }
}
