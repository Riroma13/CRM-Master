import { describe, it, expect } from 'vitest';
import type { ApiKeyScope, ApiKeyPayload, CreateTokenResult } from '../public-api.types';
import type { WebhookSubscription, WebhookEvent, WebhookDelivery } from '../webhook.types';
import type { RateLimitResult, QuotaResult } from '../rate-limit.types';
import type { PublicApiResponse } from '../response.types';

describe('Public API types compile correctly', () => {
  it('ApiKeyScope accepts string values', () => {
    const scopes: ApiKeyScope[] = [
      'workflows:read',
      'documents:write',
      '*:admin',
      'workflows:write',
    ];
    expect(scopes).toHaveLength(4);
  });

  it('ApiKeyPayload valid shape', () => {
    const payload: ApiKeyPayload = {
      id: 'key-1',
      tenantId: 'tenant-1',
      name: 'Production API Key',
      scopes: ['workflows:read', 'documents:read'],
      expiresAt: '2026-10-20T00:00:00Z',
    };
    expect(payload.tenantId).toBe('tenant-1');
    expect(payload.scopes).toContain('workflows:read');
  });

  it('CreateTokenResult valid shape', () => {
    const result: CreateTokenResult = {
      id: 'key-1',
      token: 'crm_live_abc123def456',
      scopes: ['workflows:read'],
      expiresAt: '2026-10-20T00:00:00Z',
    };
    expect(result.token).toMatch(/^crm_live_/);
  });
});

describe('Webhook types', () => {
  it('WebhookSubscription valid shape', () => {
    const sub: WebhookSubscription = {
      id: 'wh-1',
      tenantId: 'tenant-1',
      url: 'https://example.com/webhook',
      eventTypes: ['workflow.completed', 'document.created'],
      active: true,
    };
    expect(sub.eventTypes).toHaveLength(2);
    expect(sub.url).toContain('https://');
  });

  it('WebhookEvent valid shape', () => {
    const event: WebhookEvent = {
      id: 'evt-1',
      deliveryId: 'del-abc-123',
      eventType: 'workflow.completed',
      tenantId: 'tenant-1',
      data: { workflowId: 'wf-1', status: 'completed' },
      timestamp: '2026-07-20T12:00:00Z',
    };
    expect(event.deliveryId).toBeDefined();
    expect(event.data.workflowId).toBe('wf-1');
  });

  it('WebhookDelivery valid shape', () => {
    const delivery: WebhookDelivery = {
      id: 'del-1',
      subscriptionId: 'wh-1',
      eventId: 'evt-1',
      deliveryId: 'del-abc-123',
      status: 'delivered',
      responseCode: 200,
      createdAt: '2026-07-20T12:00:00Z',
    };
    expect(delivery.status).toBe('delivered');
    expect(delivery.responseCode).toBe(200);
  });

  it('WebhookDelivery optional responseCode', () => {
    const delivery: WebhookDelivery = {
      id: 'del-2',
      subscriptionId: 'wh-1',
      eventId: 'evt-2',
      deliveryId: 'del-xyz-456',
      status: 'pending',
      createdAt: '2026-07-20T12:00:00Z',
    };
    expect(delivery.responseCode).toBeUndefined();
  });
});

describe('Rate limit types', () => {
  it('RateLimitResult valid shape', () => {
    const result: RateLimitResult = {
      allowed: true,
      remaining: 95,
      resetAt: 1721491200,
    };
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(95);
  });

  it('RateLimitResult with retryAfter', () => {
    const result: RateLimitResult = {
      allowed: false,
      remaining: 0,
      resetAt: 1721491200,
      retryAfter: 30,
    };
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(30);
  });

  it('QuotaResult valid shape', () => {
    const result: QuotaResult = {
      allowed: true,
      used: 500,
      limit: 10000,
      resetAt: '2026-08-01T00:00:00Z',
    };
    expect(result.used).toBeLessThan(result.limit);
    expect(result.allowed).toBe(true);
  });
});

describe('Response types', () => {
  it('PublicApiResponse with data', () => {
    const response: PublicApiResponse<{ id: string }> = {
      data: { id: 'abc' },
    };
    expect(response.data.id).toBe('abc');
  });

  it('PublicApiResponse with meta', () => {
    const response: PublicApiResponse<string[]> = {
      data: ['a', 'b'],
      meta: { page: 1, limit: 10, total: 2 },
    };
    expect(response.meta?.total).toBe(2);
  });

  it('PublicApiResponse with error', () => {
    const response: PublicApiResponse<null> = {
      data: null,
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    };
    expect(response.error?.code).toBe('NOT_FOUND');
  });
});
