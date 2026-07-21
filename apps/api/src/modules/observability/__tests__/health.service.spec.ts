import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from '../health/health.service';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('MUST be defined', () => {
    expect(service).toBeDefined();
  });

  it('MUST run all health checks and return results', async () => {
    const results = await service.runAllChecks();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(4);
  });

  it('MUST return a result with name, status, and latencyMs for each check', async () => {
    const results = await service.runAllChecks();
    for (const result of results) {
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('latencyMs');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('MUST include prometheus indicator', async () => {
    const results = await service.runAllChecks();
    const prometheus = results.find((r) => r.name === 'prometheus');
    expect(prometheus).toBeDefined();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(prometheus!.status);
  });

  it('MUST include bullmq indicator', async () => {
    const results = await service.runAllChecks();
    const bullmq = results.find((r) => r.name === 'bullmq');
    expect(bullmq).toBeDefined();
    expect(bullmq!.status).toBe('healthy');
  });

  it('MUST include stripe indicator', async () => {
    const results = await service.runAllChecks();
    const stripe = results.find((r) => r.name === 'stripe');
    expect(stripe).toBeDefined();
    expect(['healthy', 'degraded']).toContain(stripe!.status);
  });

  it('MUST include db_pool indicator', async () => {
    const results = await service.runAllChecks();
    const dbPool = results.find((r) => r.name === 'db_pool');
    expect(dbPool).toBeDefined();
    expect(dbPool!.status).toBe('healthy');
    expect(dbPool!.details).toBeDefined();
    expect(dbPool!.details!.poolSize).toBe(10);
  });

  it('MUST handle check timeouts gracefully', async () => {
    const results = await service.runAllChecks();
    for (const result of results) {
      expect(result.latencyMs).toBeLessThan(5000);
    }
  });

  it('MUST return degraded status when prometheus is not configured', async () => {
    const oldEnv = process.env.PROMETHEUS_ENABLED;
    delete process.env.PROMETHEUS_ENABLED;

    const results = await service.runAllChecks();
    const prometheus = results.find((r) => r.name === 'prometheus');
    expect(prometheus!.status).toBe('degraded');

    process.env.PROMETHEUS_ENABLED = oldEnv;
  });
});
