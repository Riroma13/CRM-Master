import { IdentityAuditDispatcherService } from '../identity-audit-dispatcher.service';
import {
  IDENTITY_AUDIT_DLQ_QUEUE,
  IDENTITY_AUDIT_INGESTION_QUEUE,
} from '../../audit/audit-queue.constants';

describe('Identity audit outbox integration', () => {
  const event = {
    eventId: '550e8400-e29b-41d4-a716-446655440000',
    tenantId: 'tenant-a',
    mutationId: 'mutation-1',
    eventType: 'identity.member.removed',
    payload: { actorType: 'system', actorId: 'identity', resourceType: 'user', resourceId: 'user-1', action: 'revoke', outcome: 'success' },
  };

  function makeDispatcher() {
    const client = {
      identityAuditOutbox: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue({ ...event, status: 'LEASED', leaseOwner: 'worker-1' }),
      },
    };
    const prisma = { forTenant: jest.fn().mockReturnValue(client) };
    const ingestionQueue = { add: jest.fn().mockResolvedValue({ id: event.eventId }) };
    const dlqQueue = { add: jest.fn().mockResolvedValue({}) };
    const alert = { emit: jest.fn().mockResolvedValue(undefined) };
    return { dispatcher: new IdentityAuditDispatcherService(prisma as any, ingestionQueue as any, dlqQueue as any, alert as any), client, ingestionQueue, dlqQueue, alert };
  }

  it('uses BullMQ-safe audit queue identifiers consistently', () => {
    expect(IDENTITY_AUDIT_INGESTION_QUEUE).toBe('audit-ingestion');
    expect(IDENTITY_AUDIT_DLQ_QUEUE).toBe('audit-dlq');
    expect(IDENTITY_AUDIT_INGESTION_QUEUE).not.toContain(':');
    expect(IDENTITY_AUDIT_DLQ_QUEUE).not.toContain(':');
  });

  it('claims with a 60-second lease, enqueues by eventId, and conditionally completes', async () => {
    const { dispatcher, client, ingestionQueue } = makeDispatcher();
    const now = new Date('2026-07-28T00:00:00.000Z');
    await expect(dispatcher.dispatch(event, 'worker-1', now)).resolves.toMatchObject({ eventId: event.eventId });
    expect(client.identityAuditOutbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-a', eventId: event.eventId }),
      data: expect.objectContaining({ status: 'LEASED', leaseOwner: 'worker-1' }),
    }));
    expect(ingestionQueue.add).toHaveBeenCalledWith('identity-audit', event, { jobId: event.eventId });
  });

  it('writes one terminal redacted DLQ disposition and one alert on final failure', async () => {
    const { dispatcher, client, dlqQueue, alert } = makeDispatcher();
    await dispatcher.handleDeliveryFailure({ id: event.eventId, data: event, attemptsMade: 5, opts: { attempts: 5 } } as any, new Error('provider secret'));
    expect(client.identityAuditOutbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }));
    expect(dlqQueue.add).toHaveBeenCalledWith('identity-audit-failed', expect.objectContaining({
      eventId: event.eventId,
      tenantId: 'tenant-a',
      mutationId: 'mutation-1',
      eventType: event.eventType,
      jobId: event.eventId,
      errorCode: 'Error',
    }), expect.objectContaining({ jobId: `${event.eventId}:dlq` }));
    expect(JSON.stringify(dlqQueue.add.mock.calls[0][1])).not.toContain('provider secret');
    expect(alert.emit).toHaveBeenCalledTimes(1);
  });

  it('treats invalid payloads as terminal without queue retry', async () => {
    const { dispatcher, dlqQueue, ingestionQueue } = makeDispatcher();
    await expect(dispatcher.handleInvalidPayload({ id: event.eventId, data: { secret: 'value' } } as any, 'invalid payload')).resolves.toBeUndefined();
    expect(dlqQueue.add).toHaveBeenCalledTimes(1);
    expect(ingestionQueue.add).not.toHaveBeenCalled();
    expect(JSON.stringify(dlqQueue.add.mock.calls[0][1])).not.toContain('value');
  });
});
