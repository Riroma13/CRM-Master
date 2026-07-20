import { Injectable, Logger } from '@nestjs/common';
import { ConnectorRegistry } from './connectors/connector-registry';
import { PrismaService } from '../../common/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    private readonly registry: ConnectorRegistry,
    private readonly prisma: PrismaService,
  ) {}

  async execute(connectorId: string, tenantId: string, operation: string, input: Record<string, unknown>) {
    const connector = this.registry.get(connectorId);
    if (!connector) throw new Error(`Connector "${connectorId}" not found`);

    // Proactive auth check before execution
    const auth = await connector.getAuthStatus();
    if (!auth.valid) {
      try {
        await connector.refreshAuth();
      } catch {
        const exec = await this.createExecution(connectorId, tenantId, operation, input);
        await this.updateExecution(exec.id, 'failed', 'Authentication failed — non-retryable');
        return { id: exec.id, status: 'failed', error: 'Authentication failed' };
      }
    }

    const executionId = crypto.randomUUID();
    await this.prisma.admin.integrationExecution.create({
      data: { id: executionId, connectorId, tenantId, operation, input: input as any, status: 'running' },
    });

    try {
      const result = await connector.execute(operation, input);
      await this.prisma.admin.integrationExecution.update({
        where: { id: executionId },
        data: { status: result.success ? 'completed' : 'failed', output: result.data as any, error: result.error },
      });
      return { id: executionId, status: result.success ? 'completed' : 'failed', data: result.data };
    } catch (err) {
      const error = (err as Error).message;
      await this.prisma.admin.integrationExecution.update({
        where: { id: executionId },
        data: { status: 'failed', error, attempts: 1 },
      });
      return { id: executionId, status: 'failed', error };
    }
  }

  async replay(executionId: string, tenantId: string) {
    const exec = await this.prisma.admin.integrationExecution.findFirst({ where: { id: executionId, tenantId } });
    if (!exec) throw new Error('Execution not found');
    await this.prisma.admin.integrationExecution.update({
      where: { id: executionId },
      data: { dlq: false, attempts: 0, status: 'pending', error: null },
    });
    return this.execute(exec.connectorId, tenantId, exec.operation, (exec.input ?? {}) as Record<string, unknown>);
  }

  async listExecutions(tenantId: string, options?: { status?: string; dlq?: boolean; page?: number; limit?: number }) {
    const where: any = { tenantId };
    if (options?.status) where.status = options.status;
    if (options?.dlq !== undefined) where.dlq = options.dlq;
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.admin.integrationExecution.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
      }),
      this.prisma.admin.integrationExecution.count({ where }),
    ]);
    return { data, pagination: { page, limit, total } };
  }

  private async createExecution(connectorId: string, tenantId: string, operation: string, input: Record<string, unknown>) {
    return this.prisma.admin.integrationExecution.create({
      data: { id: crypto.randomUUID(), connectorId, tenantId, operation, input: input as any },
    });
  }

  private async updateExecution(id: string, status: string, error?: string) {
    await this.prisma.admin.integrationExecution.update({ where: { id }, data: { status, error } });
  }
}
