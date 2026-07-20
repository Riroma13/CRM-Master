import { KpiEngine } from '../kpi/kpi-engine';
import { SafeEvalStrategy } from '../kpi/safe-eval-strategy';

describe('SafeEvalStrategy', () => {
  const strategy = new SafeEvalStrategy();

  it('evaluates basic arithmetic (2 + 3 * 4 = 14)', () => {
    expect(strategy.evaluate('2 + 3 * 4', {})).toBe(14);
  });

  it('evaluates with metric variables', () => {
    expect(strategy.evaluate('a + b', { a: 10, b: 20 })).toBe(30);
  });

  it('evaluates complex expressions', () => {
    expect(strategy.evaluate('(a + b) / c', { a: 5, b: 3, c: 2 })).toBe(4);
  });

  it('blocks constructor injection', () => {
    expect(() =>
      strategy.evaluate('constructor.constructor("return 1")()', {}),
    ).toThrow('constructor');
  });

  it('blocks __proto__ access', () => {
    expect(() => strategy.evaluate('__proto__', {})).toThrow('__proto__');
  });

  it('blocks require', () => {
    expect(() => strategy.evaluate('require("fs")', {})).toThrow('require');
  });

  it('blocks eval', () => {
    expect(() => strategy.evaluate('eval("1+1")', {})).toThrow('eval');
  });

  it('blocks Function constructor', () => {
    expect(() => strategy.evaluate('Function("return 1")', {})).toThrow('function');
  });

  it('blocks prototype access', () => {
    expect(() => strategy.evaluate('prototype', {})).toThrow('prototype');
  });

  it('blocks disallowed characters', () => {
    expect(() => strategy.evaluate('a + b;', { a: 1, b: 2 })).toThrow(
      'disallowed characters',
    );
  });

  it('throws on division by zero', () => {
    expect(() => strategy.evaluate('a / b', { a: 10, b: 0 })).toThrow(
      'finite number',
    );
  });
});

describe('KpiEngine', () => {
  let engine: KpiEngine;
  let mockPrisma: any;
  let scopedClient: any;

  beforeEach(() => {
    scopedClient = {
      kpi: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      analyticsDataset: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      reportExecution: {
        create: jest.fn(),
      },
    };

    mockPrisma = { forTenant: jest.fn().mockReturnValue(scopedClient) };
    engine = new KpiEngine(mockPrisma);
  });

  it('returns no_data for non-existent KPI', async () => {
    scopedClient.kpi.findUnique.mockResolvedValue(null);

    const result = await engine.computeKpi('tenant-1', 'nonexistent');

    expect(result.status).toBe('no_data');
    expect(result.value).toBeNull();
  });

  it('evaluates KPI formula correctly', async () => {
    scopedClient.kpi.findUnique.mockResolvedValue({
      name: 'test_kpi',
      displayName: 'Test KPI',
      formula: 'total / count * 100',
      target: 80,
      upperThreshold: 95,
      lowerThreshold: 50,
      ttl: 300,
    });

    scopedClient.analyticsDataset.findFirst
      .mockResolvedValueOnce({ value: 150 }) // total
      .mockResolvedValueOnce({ value: 200 }); // count

    const result = await engine.computeKpi('tenant-1', 'test_kpi');

    expect(result.value).toBe(75);
    expect(result.status).toBe('on_target');
    expect(result.displayName).toBe('Test KPI');
    expect(result.target).toBe(80);
  });

  it('returns error status when formula evaluation fails', async () => {
    scopedClient.kpi.findUnique.mockResolvedValue({
      name: 'bad_kpi',
      displayName: 'Bad KPI',
      formula: '__proto__',
      target: null,
      ttl: 300,
    });

    const result = await engine.computeKpi('tenant-1', 'bad_kpi');

    expect(result.status).toBe('error');
    expect(result.value).toBeNull();
  });

  it('returns critical status when above upper threshold', async () => {
    scopedClient.kpi.findUnique.mockResolvedValue({
      name: 'threshold_kpi',
      displayName: 'Threshold KPI',
      formula: 'value',
      target: 50,
      upperThreshold: 90,
      lowerThreshold: 10,
      ttl: 300,
    });

    scopedClient.analyticsDataset.findFirst.mockResolvedValue({ value: 95 });

    const result = await engine.computeKpi('tenant-1', 'threshold_kpi');

    expect(result.value).toBe(95);
    expect(result.status).toBe('critical');
  });

  it('returns warning status when near threshold', async () => {
    scopedClient.kpi.findUnique.mockResolvedValue({
      name: 'warning_kpi',
      displayName: 'Warning KPI',
      formula: 'value',
      target: 50,
      upperThreshold: 100,
      lowerThreshold: 0,
      ttl: 300,
    });

    scopedClient.analyticsDataset.findFirst.mockResolvedValue({ value: 68 });

    const result = await engine.computeKpi('tenant-1', 'warning_kpi');

    expect(result.status).toBe('warning');
  });

  it('caches KPI values and returns from cache', async () => {
    scopedClient.kpi.findUnique.mockResolvedValue({
      name: 'cached_kpi',
      displayName: 'Cached KPI',
      formula: 'value',
      target: null,
      ttl: 300,
    });

    scopedClient.analyticsDataset.findFirst.mockResolvedValue({ value: 42 });

    const first = await engine.computeKpi('tenant-1', 'cached_kpi');
    expect(first.value).toBe(42);

    scopedClient.analyticsDataset.findFirst.mockResolvedValue({ value: 99 });

    const second = await engine.getKpi('tenant-1', 'cached_kpi');
    expect(second.value).toBe(42);
  });

  it('lists all KPIs with values', async () => {
    const kpis = [
      { name: 'kpi_a', displayName: 'KPI A', formula: 'x', target: null, upperThreshold: null, lowerThreshold: null, unit: null, ttl: 300, evaluationStrategy: 'safe-eval' },
      { name: 'kpi_b', displayName: 'KPI B', formula: 'y', target: null, upperThreshold: null, lowerThreshold: null, unit: null, ttl: 300, evaluationStrategy: 'safe-eval' },
    ];

    scopedClient.kpi.findMany.mockResolvedValue(kpis);

    scopedClient.kpi.findUnique.mockImplementation(({ where }: any) =>
      Promise.resolve(kpis.find((k) => k.name === where.name)!),
    );

    scopedClient.analyticsDataset.findFirst
      .mockResolvedValue({ value: 10 });

    const results = await engine.listKpis('tenant-1');

    expect(results).toHaveLength(2);
  });

  it('returns history for a KPI', async () => {
    scopedClient.kpi.findUnique.mockResolvedValue({
      name: 'history_kpi',
      displayName: 'History KPI',
      formula: 'x + y',
      target: null,
      upperThreshold: null,
      lowerThreshold: null,
      unit: null,
      ttl: 300,
      evaluationStrategy: 'safe-eval',
    });

    scopedClient.analyticsDataset.findFirst.mockResolvedValue({ value: 5 });

    scopedClient.analyticsDataset.findMany.mockResolvedValue([
      { metricName: 'x', value: 1, windowStart: new Date('2026-07-18') },
      { metricName: 'y', value: 2, windowStart: new Date('2026-07-18') },
      { metricName: 'x', value: 3, windowStart: new Date('2026-07-19') },
      { metricName: 'y', value: 4, windowStart: new Date('2026-07-19') },
    ]);

    const result = await engine.getKpiHistory('tenant-1', 'history_kpi', 30);

    expect(result.history).toHaveLength(2);
    expect(result.history![0].value).toBe(3);
    expect(result.history![1].value).toBe(7);
  });
});
