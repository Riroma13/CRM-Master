import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ActivityEventEnvelope, ActivityEventEnvelopeSchema } from '../../../../../packages/shared/src/activity-timeline';
import { TimelineQuery, PaginatedResult, ActivityEventRow } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ActivityTimelineService {
  private readonly logger = new Logger(ActivityTimelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async publish(envelope: ActivityEventEnvelope): Promise<void> {
    const parsed = ActivityEventEnvelopeSchema.safeParse(envelope);
    if (!parsed.success) {
      this.logger.warn(`Invalid event envelope: ${parsed.error.message}`);
      return;
    }

    try {
      await this.prisma.admin.activityEvent.create({
        data: {
          tenantId: parsed.data.tenantId,
          clienteId: parsed.data.clienteId ?? null,
          entityType: parsed.data.entityType,
          entityId: parsed.data.entityId ?? null,
          eventType: parsed.data.eventType,
          actor: parsed.data.actor,
          sourceModule: parsed.data.sourceModule,
          severity: parsed.data.severity,
          category: parsed.data.category,
          payload: parsed.data.payload as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to publish event: ${(error as Error).message}`, (error as Error).stack);
    }
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

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.admin.activityEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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
}
