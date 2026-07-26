import { describe, it, expect } from 'vitest';
import type {
  JobStatus,
  JobPayload,
  JobDefinitionDto,
  JobRunDto,
  JobScheduleDto,
} from '../job.types';

describe('Types compile correctly', () => {
  it('JobStatus accepts all 6 valid values', () => {
    const statuses: JobStatus[] = [
      'queued',
      'active',
      'completed',
      'failed',
      'cancelled',
      'dead_lettered',
    ];
    expect(statuses).toHaveLength(6);
    expect(statuses).toContain('queued');
    expect(statuses).toContain('active');
    expect(statuses).toContain('completed');
    expect(statuses).toContain('failed');
    expect(statuses).toContain('cancelled');
    expect(statuses).toContain('dead_lettered');
  });
});

describe('JobPayload type', () => {
  it('accepts a Record<string, unknown>', () => {
    const payload: JobPayload = { tenantId: 't1', userId: 'u1' };
    expect(payload.tenantId).toBe('t1');
  });

  it('accepts empty object', () => {
    const payload: JobPayload = {};
    expect(Object.keys(payload)).toHaveLength(0);
  });
});

describe('JobDefinitionDto interface', () => {
  it('valid definition shape passes type check', () => {
    const def: JobDefinitionDto = {
      id: 'jd-1',
      tenantId: 't1',
      key: 'activity-timeline:ingestion',
      name: 'Activity Timeline Ingestion',
      maxRetries: 3,
      retryDelay: 5000,
      timeout: 30000,
      concurrency: 1,
      active: true,
      createdAt: '2026-07-21T00:00:00Z',
      updatedAt: '2026-07-21T00:00:00Z',
    };
    expect(def.key).toBe('activity-timeline:ingestion');
    expect(def.maxRetries).toBe(3);
    expect(def.concurrency).toBe(1);
    expect(def.active).toBe(true);
  });
});

describe('JobRunDto interface', () => {
  it('valid run shape with all fields', () => {
    const run: JobRunDto = {
      id: 'jr-1',
      tenantId: 't1',
      jobDefinitionId: 'jd-1',
      status: 'queued',
      payload: { source: 'manual' },
      result: { processed: true },
      error: undefined,
      attempts: 0,
      maxRetries: 3,
      scheduledAt: '2026-07-21T00:00:00Z',
      startedAt: '2026-07-21T00:00:05Z',
      completedAt: '2026-07-21T00:00:10Z',
      queueName: 'activity-timeline:ingestion',
      idempotencyKey: 'idem-1',
      createdAt: '2026-07-21T00:00:00Z',
    };
    expect(run.status).toBe('queued');
    expect(run.queueName).toBe('activity-timeline:ingestion');
  });

  it('accepts all 6 status values', () => {
    const statuses: JobStatus[] = [
      'queued', 'active', 'completed', 'failed', 'cancelled', 'dead_lettered',
    ];
    for (const s of statuses) {
      const run: JobRunDto = {
        id: 'jr-1',
        tenantId: 't1',
        jobDefinitionId: 'jd-1',
        status: s,
        payload: {},
        attempts: 0,
        maxRetries: 3,
        scheduledAt: '2026-07-21T00:00:00Z',
        queueName: 'test',
        createdAt: '2026-07-21T00:00:00Z',
      };
      expect(run.status).toBe(s);
    }
  });

  it('optional fields can be omitted', () => {
    const run: JobRunDto = {
      id: 'jr-1',
      tenantId: 't1',
      jobDefinitionId: 'jd-1',
      status: 'queued',
      payload: {},
      attempts: 0,
      maxRetries: 3,
      scheduledAt: '2026-07-21T00:00:00Z',
      queueName: 'test',
      createdAt: '2026-07-21T00:00:00Z',
    };
    expect(run.result).toBeUndefined();
    expect(run.error).toBeUndefined();
    expect(run.startedAt).toBeUndefined();
    expect(run.completedAt).toBeUndefined();
    expect(run.idempotencyKey).toBeUndefined();
  });
});

describe('JobScheduleDto interface', () => {
  it('valid schedule shape passes type check', () => {
    const schedule: JobScheduleDto = {
      id: 'js-1',
      tenantId: 't1',
      jobDefinitionId: 'jd-1',
      cron: '0 0 * * *',
      enabled: true,
      timezone: 'UTC',
      nextRunAt: '2026-07-22T00:00:00Z',
      createdAt: '2026-07-21T00:00:00Z',
    };
    expect(schedule.cron).toBe('0 0 * * *');
    expect(schedule.enabled).toBe(true);
    expect(schedule.timezone).toBe('UTC');
  });

  it('optional lastRunAt can be omitted', () => {
    const schedule: JobScheduleDto = {
      id: 'js-2',
      tenantId: 't1',
      jobDefinitionId: 'jd-1',
      cron: '*/5 * * * *',
      enabled: false,
      timezone: 'America/New_York',
      nextRunAt: '2026-07-21T00:05:00Z',
      createdAt: '2026-07-21T00:00:00Z',
    };
    expect(schedule.lastRunAt).toBeUndefined();
    expect(schedule.enabled).toBe(false);
    expect(schedule.timezone).toBe('America/New_York');
  });
});
