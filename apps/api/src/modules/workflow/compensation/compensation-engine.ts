import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class CompensationEngine {
  private readonly logger = new Logger(CompensationEngine.name);

  constructor(private readonly prisma: PrismaService) {}

  async compensate(tenantId: string, instanceId: string, error?: string) {
    const completedExecutions = await this.prisma.forTenant(tenantId).workflowExecution.findMany({
      where: { instanceId, status: 'completed' },
      orderBy: { completedAt: 'desc' },
    });

    const definition = await this.prisma.forTenant(tenantId).workflowInstance.findFirst({
      where: { id: instanceId, tenantId },
    });
    if (!definition) return;

    const version = await this.prisma.forTenant(tenantId).workflowDefinitionVersion.findFirst({
      where: { definitionId: definition.definitionId, version: definition.definitionVersion },
    });
    if (!version) return;

    const nodes = version.nodes as any[];

    for (const execution of completedExecutions) {
      const node = nodes.find((n: any) => n.id === execution.nodeId);
      if (!node?.compensation) continue;

      const compensationExists = await this.prisma.forTenant(tenantId).workflowExecution.findFirst({
        where: { instanceId, nodeId: node.compensation, status: 'completed' },
      });
      if (compensationExists) {
        this.logger.debug(`Compensation already executed for node ${execution.nodeId}, skipping`);
        continue;
      }

      this.logger.log(`Executing compensation step for node ${execution.nodeId}`);

      await this.prisma.forTenant(tenantId).workflowExecution.create({
        data: {
          instanceId,
          nodeId: node.compensation,
          tenantId,
          status: 'completed',
          input: execution.input,
        },
      });

      await this.prisma.forTenant(tenantId).workflowAudit.create({
        data: {
          instanceId,
          nodeId: node.compensation,
          tenantId,
          eventType: 'compensated',
          data: { compensatedNodeId: execution.nodeId },
        },
      });
    }

    await this.prisma.forTenant(tenantId).workflowInstance.updateMany({
      where: { id: instanceId, tenantId },
      data: { status: 'compensated', completedAt: new Date(), error },
    });
  }
}
