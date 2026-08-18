import * as fs from 'fs';
import * as path from 'path';
import { WorkerPoolService } from '../worker-pool.service';

describe('WorkerPoolService', () => {
  it('fails closed without creating workers or posting messages', async () => {
    const pool = new WorkerPoolService();
    await expect(pool.execute('plugin', 'onEvent', {})).rejects.toMatchObject({
      response: { code: 'PLUGIN_EXECUTION_DISABLED' },
      status: 409,
    });
    expect(pool.poolSize).toBe(0);
    expect(pool.activeCount).toBe(0);
  });

  it('has no dynamic execution, Worker construction, source loader, or worker path', () => {
    const servicePath = path.resolve(__dirname, '../worker-pool.service.ts');
    const workerPath = path.resolve(__dirname, '../plugin.worker.ts');
    const source = fs.readFileSync(servicePath, 'utf8');
    expect(source).not.toMatch(/new\s+Function|\beval\s*\(|vm\.(run|compile)/);
    expect(source).not.toMatch(/new\s+Worker\s*\(|require\s*\(|import\s*\(/);
    expect(fs.existsSync(workerPath)).toBe(false);
  });
});
