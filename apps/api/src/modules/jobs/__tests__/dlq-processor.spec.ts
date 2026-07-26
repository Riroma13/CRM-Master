import {
  calculateBackoff,
  parseDlqConfig,
  DlqJobDataSchema,
  DlqPair,
} from '../dlq-processor';

describe('calculateBackoff', () => {
  it('MUST return 5000 for attempt 0 with default delay', () => {
    expect(calculateBackoff(5000, 0)).toBe(5000);
  });

  it('MUST return 10000 for attempt 1', () => {
    expect(calculateBackoff(5000, 1)).toBe(10000);
  });

  it('MUST return 20000 for attempt 2', () => {
    expect(calculateBackoff(5000, 2)).toBe(20000);
  });

  it('MUST return 40000 for attempt 3', () => {
    expect(calculateBackoff(5000, 3)).toBe(40000);
  });

  it('MUST double each time: 5000→10000→20000→40000', () => {
    const results = [0, 1, 2, 3].map((a) => calculateBackoff(5000, a));
    expect(results).toEqual([5000, 10000, 20000, 40000]);
  });

  it('MUST work with non-standard retryDelay', () => {
    expect(calculateBackoff(1000, 0)).toBe(1000);
    expect(calculateBackoff(1000, 1)).toBe(2000);
    expect(calculateBackoff(1000, 2)).toBe(4000);
    expect(calculateBackoff(1000, 3)).toBe(8000);
  });
});

describe('parseDlqConfig', () => {
  it('MUST parse default DLQ pairs', () => {
    const config =
      'activity-timeline:dlq:activity-timeline:ingestion,' +
      'audit:dlq:audit:ingestion,' +
      'kb:ingestion-dlq:kb:ingestion,' +
      'reporting:dataset:dlq:reporting:dataset:ingestion';

    const pairs = parseDlqConfig(config);

    expect(pairs).toHaveLength(4);
    expect(pairs[0]).toEqual({
      dlqName: 'activity-timeline:dlq',
      sourceQueue: 'activity-timeline:ingestion',
    });
    expect(pairs[1]).toEqual({
      dlqName: 'audit:dlq',
      sourceQueue: 'audit:ingestion',
    });
    expect(pairs[2]).toEqual({
      dlqName: 'kb:ingestion-dlq',
      sourceQueue: 'kb:ingestion',
    });
    expect(pairs[3]).toEqual({
      dlqName: 'reporting:dataset:dlq',
      sourceQueue: 'reporting:dataset:ingestion',
    });
  });

  it('MUST return empty array for empty string', () => {
    expect(parseDlqConfig('')).toEqual([]);
    expect(parseDlqConfig('   ')).toEqual([]);
  });

  it('MUST throw for invalid format with odd segment count', () => {
    // 5 segments is odd — not divisible evenly between dlq and source
    expect(() => parseDlqConfig('a:b:c:d:e')).toThrow(
      'Invalid DLQ pair format',
    );
  });

  it('MUST parse simple dlq:source pairs correctly', () => {
    const pairs = parseDlqConfig('my-dlq:my-source');
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toEqual({ dlqName: 'my-dlq', sourceQueue: 'my-source' });
  });

  it('MUST handle single pair', () => {
    const pairs = parseDlqConfig('my:dlq:my:source');
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toEqual({ dlqName: 'my:dlq', sourceQueue: 'my:source' });
  });
});

describe('DlqJobDataSchema', () => {
  it('MUST accept valid job data', () => {
    const data = { tenantId: 't-1', runId: 'r-1', payload: { key: 'val' } };
    const result = DlqJobDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('MUST accept job data without payload (defaults to {})', () => {
    const data = { tenantId: 't-1', runId: 'r-1' };
    const result = DlqJobDataSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.payload).toEqual({});
    }
  });

  it('MUST reject invalid job data — missing tenantId', () => {
    const data = { runId: 'r-1' };
    const result = DlqJobDataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('MUST reject invalid job data — missing runId', () => {
    const data = { tenantId: 't-1' };
    const result = DlqJobDataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('MUST reject null payload', () => {
    const data = { tenantId: 't-1', runId: 'r-1', payload: null };
    const result = DlqJobDataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
