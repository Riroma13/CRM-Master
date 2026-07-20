import { Worker } from 'worker_threads';

jest.mock('worker_threads', () => {
  const mockWorker = {
    postMessage: jest.fn(),
    terminate: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    once: jest.fn(),
  };
  return {
    Worker: jest.fn(() => ({
      ...mockWorker,
      resourceLimits: {},
    })),
  };
});

import { WorkerPoolService } from '../worker-pool.service';

describe('WorkerPoolService', () => {
  let pool: WorkerPoolService;

  beforeEach(() => {
    jest.clearAllMocks();
    pool = new WorkerPoolService();
  });

  afterEach(async () => {
    await pool.shutdown();
  });

  describe('acquire', () => {
    it('returns a Worker on first call', () => {
      const worker = pool.acquire();
      expect(worker).toBeDefined();
      expect(Worker).toHaveBeenCalledTimes(1);
    });

    it('reuses idle workers', () => {
      const w1 = pool.acquire();
      pool.release(w1);
      const w2 = pool.acquire();
      expect(w2).toBe(w1);
    });

    it('creates new workers up to max pool size', () => {
      const workers: Worker[] = [];
      for (let i = 0; i < 10; i++) {
        workers.push(pool.acquire());
      }
      expect(Worker).toHaveBeenCalledTimes(10);
      expect(pool.poolSize).toBe(10);

      workers.forEach(w => pool.release(w));
    });

    it('evicts LRU worker when all workers are busy', () => {
      const workers: Worker[] = [];
      for (let i = 0; i < 10; i++) {
        workers.push(pool.acquire());
      }

      const w11 = pool.acquire();
      expect(Worker).toHaveBeenCalledTimes(11);
      expect(w11).toBeDefined();
      expect(pool.poolSize).toBe(10);
    });
  });

  describe('release', () => {
    it('marks worker as available for reuse', () => {
      const w1 = pool.acquire();
      expect(pool.activeCount).toBe(1);
      pool.release(w1);
      expect(pool.activeCount).toBe(0);
    });
  });

  describe('execute', () => {
    it('rejects on timeout', async () => {
      const w1 = pool.acquire();
      const mockOnce = jest.spyOn(w1, 'once');

      mockOnce.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
        if (event === 'message') {
          setTimeout(() => cb({ type: 'result', data: 'done' }), 20000);
        }
        return w1;
      });

      jest.useFakeTimers();
      const execPromise = pool.execute('plg-1', 'onEvent', {});
      jest.advanceTimersByTime(10001);

      await expect(execPromise).rejects.toThrow('timed out');
      jest.useRealTimers();
    });
  });

  describe('shutdown', () => {
    it('terminates all workers', async () => {
      const workers: Worker[] = [];
      for (let i = 0; i < 3; i++) {
        workers.push(pool.acquire());
      }

      await pool.shutdown();
      expect(pool.poolSize).toBe(0);
    });
  });
});
