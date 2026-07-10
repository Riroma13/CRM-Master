import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export interface AuditEntry {
  id: number;
  timestamp: string;
  tenantId: string;
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  ip?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: Omit<AuditEntry, 'id' | 'timestamp'>) {
    const log = await this.prisma.admin.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId,
        userEmail: entry.userEmail,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        details: entry.details,
        ip: entry.ip,
      },
    });
    return { id: log.id, timestamp: log.createdAt.toISOString(), ...entry };
  }

  async findAll(limit = 100, tenantId?: string): Promise<AuditEntry[]> {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    const logs = await this.prisma.admin.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return logs.map((l: any) => ({
      id: l.id,
      timestamp: l.createdAt.toISOString(),
      tenantId: l.tenantId,
      userId: l.userId ?? undefined,
      userEmail: l.userEmail ?? undefined,
      action: l.action,
      resource: l.resource,
      resourceId: l.resourceId ?? undefined,
      details: l.details ?? undefined,
      ip: l.ip ?? undefined,
    }));
  }
}
