import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { deriveAuditEventId } from './identity.contracts';

export interface AuthorizationOperation {
  id: string;
  tenantId: string;
  subjectId: string;
  mutationId: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  leaseOwner: string | null;
  leaseExpiresAt: Date | null;
  terminalAt: Date | null;
  terminalReason: string | null;
  purgeConfirmedAt: Date | null;
}

export interface AuthorizationMutation {
  tenantId: string;
  subjectId: string;
  operation: string;
  resourceId: string;
  idempotencyKey: string;
  mutationId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class IdentityAuthorizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async mutate(input: AuthorizationMutation) {
    const client = this.prisma.forTenant(input.tenantId) as any;
    return client.$transaction(async (tx: any) => {
      const existing = await tx.identityAuthorizationOperation.findFirst({
        where: {
          tenantId: input.tenantId,
          subjectId: input.subjectId,
          mutationId: input.mutationId,
        },
      });
      if (existing) return { operation: existing, outbox: null, duplicate: true, denied: existing.status !== 'PURGED' };

      const active = await tx.identityAuthorizationOperation.findFirst({
        where: { tenantId: input.tenantId, subjectId: input.subjectId, status: { in: ['PENDING', 'PURGING'] } },
      });
      if (active) return { operation: active, outbox: null, duplicate: false, denied: true };

      const operation = await tx.identityAuthorizationOperation.create({
        data: {
          tenantId: input.tenantId,
          subjectId: input.subjectId,
          mutationId: input.mutationId,
        },
      });
      const eventId = deriveAuditEventId(input.tenantId, input.eventType, input.resourceId, input.mutationId);
      const outbox = await tx.identityAuditOutbox.create({
        data: {
          eventId,
          tenantId: input.tenantId,
          mutationId: input.mutationId,
          eventType: input.eventType,
          payload: input.payload,
        },
      });
      return { operation, outbox, duplicate: false, denied: false };
    });
  }

  async claim(tenantId: string, operationId: string, owner: string, now: Date) {
    const client = this.prisma.forTenant(tenantId) as any;
    const leaseExpiresAt = new Date(now.getTime() + 60_000);
    const claimed = await client.identityAuthorizationOperation.updateMany({
      where: {
        id: operationId,
        OR: [
          { status: 'PENDING', nextAttemptAt: { lte: now } },
          { status: 'PURGING', leaseExpiresAt: { lte: now } },
        ],
      },
      data: { status: 'PURGING', attempts: { increment: 1 }, leaseOwner: owner, leaseExpiresAt },
    });
    if (claimed.count !== 1) return null;
    return client.identityAuthorizationOperation.findFirst({
      where: { id: operationId, status: 'PURGING', leaseOwner: owner },
    });
  }

  async complete(tenantId: string, operationId: string, owner: string, now: Date) {
    const client = this.prisma.forTenant(tenantId) as any;
    const updated = await client.identityAuthorizationOperation.updateMany({
      where: {
        id: operationId,
        status: 'PURGING',
        leaseOwner: owner,
        leaseExpiresAt: { gt: now },
      },
      data: { status: 'PURGED', purgeConfirmedAt: now, terminalAt: now, leaseOwner: null, leaseExpiresAt: null },
    });
    if (updated.count !== 1) return null;
    return client.identityAuthorizationOperation.findFirst({ where: { id: operationId, status: 'PURGED' } });
  }

  async fail(tenantId: string, operationId: string, owner: string, reason: string, now: Date) {
    const client = this.prisma.forTenant(tenantId) as any;
    const current = await client.identityAuthorizationOperation.findFirst({
      where: { id: operationId, status: 'PURGING', leaseOwner: owner, leaseExpiresAt: { gt: now } },
    });
    if (!current) return null;
    const exhausted = current.attempts >= current.maxAttempts;
    const nextAttemptAt = new Date(now.getTime() + Math.min(300, 5 * 2 ** (current.attempts - 1)) * 1000);
    const updated = await client.identityAuthorizationOperation.updateMany({
      where: { id: operationId, status: 'PURGING', leaseOwner: owner, leaseExpiresAt: { gt: now } },
      data: exhausted
        ? { status: 'FAILED', terminalAt: now, terminalReason: reason, leaseOwner: null, leaseExpiresAt: null }
        : { status: 'PENDING', nextAttemptAt, leaseOwner: null, leaseExpiresAt: null },
    });
    if (updated.count !== 1) return null;
    return client.identityAuthorizationOperation.findFirst({ where: { id: operationId } });
  }
}
