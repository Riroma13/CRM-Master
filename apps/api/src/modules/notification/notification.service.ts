import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import type { NotificationStatus, ChannelType, Priority, Severity } from '@shared/notification';

export interface CreateNotificationInput {
  definitionId: string;
  userId: string;
  content?: Record<string, unknown>;
  idempotencyKey?: string;
  correlationId?: string;
  scheduledAt?: Date;
  expiresAt?: Date;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createNotification(tenantId: string, input: CreateNotificationInput): Promise<string> {
    const { definitionId, userId, content, idempotencyKey, correlationId, scheduledAt, expiresAt } = input;

    if (idempotencyKey) {
      const existing = await this.prisma.forTenant(tenantId).notificationInstance.findUnique({
        where: { idempotencyKey },
      });
      if (existing) return existing.id;
    }

    const definition = await this.prisma.forTenant(tenantId).notificationDefinition.findFirst({
      where: { id: definitionId, tenantId },
    });
    if (!definition) throw new NotFoundException('Notification definition not found');
    if (!definition.isPublished) throw new BadRequestException('Notification definition is not published');

    const contentSnapshot = definition.template as Record<string, unknown> | null;

    const severity = (content?.severity as Severity) || definition.defaultSeverity as Severity;
    const bypassQuietHours = (definition as any).bypassQuietHours === true || severity === 'critical';

    const notification = await this.prisma.forTenant(tenantId).notificationInstance.create({
      data: {
        tenantId,
        definitionId,
        userId,
        status: 'pending',
        channel: null,
        priority: definition.defaultPriority,
        severity: definition.defaultSeverity,
        content: content ?? {},
        contentSnapshot,
        idempotencyKey,
        correlationId,
        scheduledAt,
        expiresAt,
        preferencesLastCheckedAt: new Date(),
      },
    });

    await this.createAuditEntry(tenantId, notification.id, 'created');

    if (bypassQuietHours || this.isImmediate(severity, scheduledAt)) {
      await this.prisma.forTenant(tenantId).notificationInstance.update({
        where: { id: notification.id },
        data: { status: 'scheduled' },
      });
      await this.createAuditEntry(tenantId, notification.id, 'scheduled');
    }

    return notification.id;
  }

  async listNotifications(
    tenantId: string,
    filters: { userId?: string; status?: NotificationStatus; page?: number; limit?: number },
  ) {
    const { userId, status, page = 1, limit = 20 } = filters;
    const where: any = { tenantId };
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.forTenant(tenantId).notificationInstance.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.forTenant(tenantId).notificationInstance.count({ where }),
    ]);

    return { data, pagination: { page, limit, total } };
  }

  async getNotification(tenantId: string, notificationId: string) {
    const notification = await this.prisma.forTenant(tenantId).notificationInstance.findFirst({
      where: { id: notificationId, tenantId },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async cancelNotification(tenantId: string, notificationId: string) {
    const notification = await this.getNotification(tenantId, notificationId);
    if (['delivered', 'cancelled', 'expired'].includes(notification.status)) {
      throw new ConflictException(`Cannot cancel notification in status: ${notification.status}`);
    }
    const updated = await this.prisma.forTenant(tenantId).notificationInstance.update({
      where: { id: notificationId },
      data: { status: 'cancelled', version: { increment: 1 } },
    });
    await this.createAuditEntry(tenantId, notificationId, 'cancelled');
    return updated;
  }

  private isImmediate(severity: string, scheduledAt?: Date): boolean {
    if (scheduledAt) return false;
    return severity === 'critical' || severity === 'error';
  }

  private async createAuditEntry(tenantId: string, notificationId: string, eventType: string, data?: Record<string, unknown>) {
    await this.prisma.forTenant(tenantId).notificationAudit.create({
      data: { notificationId, tenantId, eventType, data: data ?? {} },
    });
  }
}
