import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { ActivityEventEnvelope, ActivityEventEnvelopeSchema } from '../../../../../packages/shared/src/activity-timeline';
import { PrismaService } from '../../common/prisma.service';
import { TimelineQuery, PaginatedResult, ActivityEventRow, SearchQuery, CursorPaginatedResult } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ActivityTimelineService {
  private readonly logger = new Logger(ActivityTimelineService.name);

  constructor(
    @InjectQueue('activity-timeline:ingestion') private readonly ingestionQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * @deprecated Use publishAsync() instead. This method will be removed in a future release.
   */
  async publish(envelope: ActivityEventEnvelope): Promise<void> {
    const parsed = ActivityEventEnvelopeSchema.safeParse(envelope);
    if (!parsed.success) {
      this.logger.warn(`Invalid event envelope: ${parsed.error.message}`);
      return;
    }

    try {
      await this.ingestionQueue.add('ingest', parsed.data, {
        removeOnComplete: true,
        removeOnFail: 100,
      });
    } catch (error) {
      this.logger.error(`Failed to enqueue event: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  async publishAsync(envelope: ActivityEventEnvelope): Promise<{ eventId: string }> {
    if (!envelope.eventId) {
      throw new Error('eventId is required for async publishing');
    }

    const parsed = ActivityEventEnvelopeSchema.safeParse(envelope);
    if (!parsed.success) {
      throw new Error(`Invalid event envelope: ${parsed.error.message}`);
    }

    try {
      await this.ingestionQueue.add('ingest', parsed.data, {
        removeOnComplete: true,
        removeOnFail: 100,
      });
    } catch (error) {
      this.logger.error(`Failed to enqueue event: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }

    return { eventId: envelope.eventId };
  }

  async getTimeline(filters: TimelineQuery): Promise<PaginatedResult<ActivityEventRow>> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ActivityEventWhereInput = {
      tenantId: filters.tenantId,
    };

    if (filters.clienteId) where.clienteId = filters.clienteId;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.actor) where.actor = filters.actor;
    if (filters.sourceModule) where.sourceModule = filters.sourceModule;
    if (filters.severity) where.severity = filters.severity;
    if (filters.category) where.category = filters.category;
    if (filters.eventType) where.eventType = filters.eventType;
    if (filters.correlationId) where.correlationId = filters.correlationId;
    if (filters.eventId) where.eventId = filters.eventId;
    if (filters.visibility) where.visibility = filters.visibility;

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.admin.activityEvent.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { receivedAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.admin.activityEvent.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  async search(filters: SearchQuery): Promise<CursorPaginatedResult<ActivityEventRow>> {
    const limit = Math.min(filters.limit ?? 50, 100);
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    conditions.push(`tenant_id = $${paramIndex++}`);
    params.push(filters.tenantId);

    if (filters.q) {
      const sanitized = filters.q.replace(/[^\w\sáéíóúñ]/g, '').trim();
      const tsquery = sanitized.split(/\s+/).filter(Boolean).map(w => `${w}:*`).join(' & ');
      if (tsquery) {
        conditions.push(`search_vector @@ to_tsquery('spanish', $${paramIndex++})`);
        params.push(tsquery);
      }
    }

    if (filters.eventType) {
      conditions.push(`event_type = $${paramIndex++}`);
      params.push(filters.eventType);
    }
    if (filters.severity) {
      conditions.push(`severity = $${paramIndex++}`);
      params.push(filters.severity);
    }
    if (filters.category) {
      conditions.push(`category = $${paramIndex++}`);
      params.push(filters.category);
    }
    if (filters.sourceModule) {
      conditions.push(`source_module = $${paramIndex++}`);
      params.push(filters.sourceModule);
    }
    if (filters.clienteId) {
      conditions.push(`cliente_id = $${paramIndex++}`);
      params.push(filters.clienteId);
    }
    if (filters.entityType) {
      conditions.push(`entity_type = $${paramIndex++}`);
      params.push(filters.entityType);
    }
    if (filters.entityId) {
      conditions.push(`entity_id = $${paramIndex++}`);
      params.push(filters.entityId);
    }
    if (filters.actor) {
      conditions.push(`actor = $${paramIndex++}`);
      params.push(filters.actor);
    }
    if (filters.correlationId) {
      conditions.push(`correlation_id = $${paramIndex++}`);
      params.push(filters.correlationId);
    }
    if (filters.visibility) {
      conditions.push(`visibility = $${paramIndex++}`);
      params.push(filters.visibility);
    }

    if (filters.dateFrom) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(filters.dateTo);
    }

    if (filters.cursor) {
      const decoded = this.decodeCursor(filters.cursor);
      conditions.push(`(occurred_at, id) < ($${paramIndex++}::timestamptz, $${paramIndex++}::int)`);
      params.push(decoded.occurredAt);
      params.push(decoded.id);
    }

    const whereClause = conditions.join(' AND ');
    const query = `SELECT * FROM activity_events WHERE ${whereClause} ORDER BY occurred_at DESC NULLS LAST, id DESC LIMIT $${paramIndex++}`;
    params.push(limit + 1);

    this.logger.debug(`Search query: ${query}`);

    const rows = (await this.prisma.admin.$queryRawUnsafe(query, ...params)) as ActivityEventRow[];

    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    let nextCursor: string | undefined;
    if (hasMore && rows.length > 0) {
      const last = rows[rows.length - 1];
      nextCursor = this.encodeCursor(last.occurredAt ?? last.createdAt, last.id);
    }

    return { data: rows, nextCursor };
  }

  private encodeCursor(occurredAt: Date, id: number): string {
    return Buffer.from(`${occurredAt.toISOString()}|${id}`).toString('base64');
  }

  private decodeCursor(cursor: string): { occurredAt: string; id: number } {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const [occurredAt, id] = decoded.split('|');
    return { occurredAt, id: parseInt(id, 10) };
  }
}
