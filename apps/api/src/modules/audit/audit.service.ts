import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/prisma.service';
import { AuditEventQuery, PaginatedResult } from './dto';

export interface AuditEventRow {
  id: string;
  tenantId: string;
  actorType: string;
  actorId: string;
  actorName: string | null;
  resourceType: string;
  resourceId: string;
  resourceName: string | null;
  action: string;
  outcome: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
  occurredAt: Date;
  receivedAt: Date;
  metadata: any;
  hash: string;
  prevHash: string;
  sequence: number;
  legalHold: boolean;
  legalHoldUntil: Date | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @InjectQueue('audit:ingestion') private readonly ingestionQueue?: Queue,
  ) {}

  async getEvents(tenantId: string, filters: AuditEventQuery): Promise<PaginatedResult<AuditEventRow>> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (filters.actorType) where.actorType = filters.actorType;
    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.resourceType) where.resourceType = filters.resourceType;
    if (filters.resourceId) where.resourceId = filters.resourceId;
    if (filters.action) where.action = filters.action;
    if (filters.outcome) where.outcome = filters.outcome;
    if (filters.correlationId) where.correlationId = filters.correlationId;

    if (filters.dateFrom || filters.dateTo) {
      where.occurredAt = {};
      if (filters.dateFrom) where.occurredAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.occurredAt.lte = new Date(filters.dateTo);
    }

    const client = this.prisma.forTenant(tenantId);

    const [data, total] = await Promise.all([
      client.auditEvent.findMany({
        where,
        orderBy: [{ occurredAt: 'desc' }, { sequence: 'desc' }],
        skip,
        take: limit,
      }),
      client.auditEvent.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: data as unknown as AuditEventRow[],
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  async getEvent(tenantId: string, eventId: string): Promise<AuditEventRow> {
    const client = this.prisma.forTenant(tenantId);

    const event = await client.auditEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Audit event ${eventId} not found for tenant ${tenantId}`);
    }

    return event as unknown as AuditEventRow;
  }

  async log(data: {
    tenantId: string;
    action: string;
    resource: string;
    resourceId?: string;
    userId?: string;
    userEmail?: string;
    details?: string;
    outcome?: string;
  }): Promise<void> {
    if (!this.ingestionQueue) {
      this.logger.warn(`Audit queue not available, skipping audit log: ${data.action} ${data.resource}`);
      return;
    }
    await this.ingestionQueue.add('event', {
      eventId: randomUUID(),
      tenantId: data.tenantId,
      actorType: 'user',
      actorId: data.userId ?? 'system',
      actorName: data.userEmail,
      resourceType: data.resource,
      resourceId: data.resourceId ?? 'unknown',
      action: data.action,
      outcome: data.outcome ?? 'success',
      metadata: data.details ? { details: data.details } : {},
      occurredAt: new Date().toISOString(),
    });
  }
}
