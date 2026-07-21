import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { DefinitionService } from './definition.service';
import { NodeExecutorRegistry } from '../../../../../packages/shared/src/workflow';
import type { InstanceStatus } from '../../../../../packages/shared/src/workflow';
import { PinoLoggerService } from '../observability/logging/pino-logger.service';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly logger: PinoLoggerService,
    private readonly prisma: PrismaService,
    private readonly definitionService: DefinitionService,
    @Inject('NODE_EXECUTOR_REGISTRY') private readonly executorRegistry: NodeExecutorRegistry,
  ) {}

  async startWorkflow(
    tenantId: string,
    definitionId: string,
    variables: Record<string, unknown> = {},
    correlationId?: string,
  ) {
    const version = await this.definitionService.getLatestPublished(tenantId, definitionId);
    const nodes = version.nodes as any[];
    const startNode = nodes.find((n: any) => n.id === version.startNode);
    if (!startNode) throw new BadRequestException(`Start node '${version.startNode}' not found in definition`);

    const instance = await this.prisma.forTenant(tenantId).workflowInstance.create({
      data: {
        definitionId,
        definitionVersion: version.version,
        tenantId,
        correlationId,
        status: 'running',
        variables: {
          create: Object.entries(variables).map(([key, value]) => ({
            tenantId,
            key,
            value,
          })),
        },
      },
    });

    await this.createAudit(tenantId, instance.id, null, 'started');

    const execution = await this.createExecution(tenantId, instance.id, startNode.id, { variables });
    await this.resolveNextNodes(tenantId, instance.id, startNode, variables, version.nodes as any[]);

    return { instanceId: instance.id, executionId: execution.id };
  }

  async resumeWorkflow(tenantId: string, instanceId: string, data?: Record<string, unknown>) {
    const instance = await this.getInstanceScoped(tenantId, instanceId);
    if (instance.status !== 'suspended') {
      throw new ConflictException('Instance is not suspended');
    }

    const version = await this.definitionService.getLatestPublished(tenantId, instance.definitionId);
    const variables = await this.getVariables(tenantId, instanceId);
    const mergedVars = { ...variables, ...data };

    await this.prisma.forTenant(tenantId).workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: 'running',
        version: { increment: 1 },
      },
    });

    await this.createAudit(tenantId, instanceId, null, 'resumed');

    const nodes = version.nodes as any[];
    const pendingExecutions = await this.prisma.forTenant(tenantId).workflowExecution.findMany({
      where: { instanceId, status: { in: ['pending', 'running'] } },
    });

    for (const exec of pendingExecutions) {
      await this.resolveNextNodes(tenantId, instanceId, nodes.find((n: any) => n.id === exec.nodeId), mergedVars, nodes);
    }

    return { instanceId, status: 'running' };
  }

  async suspendWorkflow(tenantId: string, instanceId: string) {
    const instance = await this.getInstanceScoped(tenantId, instanceId);
    if (instance.status !== 'running') {
      throw new ConflictException('Only running instances can be suspended');
    }

    await this.prisma.forTenant(tenantId).workflowInstance.update({
      where: { id: instanceId, version: instance.version },
      data: { status: 'suspended', version: { increment: 1 } },
    });

    await this.createAudit(tenantId, instanceId, null, 'suspended');
    return { instanceId, status: 'suspended' };
  }

  async cancelWorkflow(tenantId: string, instanceId: string) {
    const instance = await this.getInstanceScoped(tenantId, instanceId);
    if (instance.status === 'completed' || instance.status === 'cancelled' || instance.status === 'compensated') {
      throw new ConflictException(`Instance is already ${instance.status}`);
    }

    await this.prisma.forTenant(tenantId).workflowInstance.update({
      where: { id: instanceId, version: instance.version },
      data: { status: 'cancelled', completedAt: new Date(), version: { increment: 1 } },
    });

    await this.createAudit(tenantId, instanceId, null, 'cancelled');
    return { instanceId, status: 'cancelled' };
  }

  async completeWorkflow(tenantId: string, instanceId: string) {
    const instance = await this.getInstanceScoped(tenantId, instanceId);
    if (instance.status !== 'running') {
      throw new ConflictException('Only running instances can be completed');
    }

    await this.prisma.forTenant(tenantId).workflowInstance.update({
      where: { id: instanceId, version: instance.version },
      data: { status: 'completed', completedAt: new Date(), version: { increment: 1 } },
    });

    await this.createAudit(tenantId, instanceId, null, 'completed');
    return { instanceId, status: 'completed' };
  }

  async retryStep(tenantId: string, instanceId: string, executionId: string) {
    const execution = await this.prisma.forTenant(tenantId).workflowExecution.findFirst({
      where: { id: executionId, instanceId, tenantId },
    });
    if (!execution) throw new NotFoundException('Execution not found');
    if (execution.status !== 'failed') {
      throw new ConflictException('Only failed executions can be retried');
    }

    await this.prisma.forTenant(tenantId).workflowExecution.update({
      where: { id: executionId },
      data: { status: 'pending', error: null },
    });

    return { executionId, status: 'pending' };
  }

  async getInstance(tenantId: string, instanceId: string) {
    return this.getInstanceScoped(tenantId, instanceId);
  }

  async listInstances(tenantId: string, status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.forTenant(tenantId).workflowInstance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: { executions: { orderBy: { startedAt: 'desc' }, take: 5 } },
      }),
      this.prisma.forTenant(tenantId).workflowInstance.count({ where }),
    ]);

    return { data, pagination: { page, limit, total } };
  }

  private async getInstanceScoped(tenantId: string, instanceId: string) {
    const instance = await this.prisma.forTenant(tenantId).workflowInstance.findFirst({
      where: { id: instanceId, tenantId },
      include: {
        executions: true,
        variables: true,
        activeBranches: true,
        audits: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!instance) throw new NotFoundException('Workflow instance not found');
    return instance;
  }

  private async getVariables(tenantId: string, instanceId: string): Promise<Record<string, unknown>> {
    const vars = await this.prisma.forTenant(tenantId).workflowVariable.findMany({
      where: { instanceId },
    });
    return vars.reduce((acc: Record<string, unknown>, v: { key: string; value: unknown }) => ({ ...acc, [v.key]: v.value }), {});
  }

  private async resolveNextNodes(
    tenantId: string,
    instanceId: string,
    node: any,
    variables: Record<string, unknown>,
    allNodes: any[],
  ) {
    const executor = this.executorRegistry.get(node.type);
    if (!executor) {
      this.logger.warn(`No executor registered for node type: ${node.type}`);
      return;
    }

    const context = {
      instanceId,
      tenantId,
      nodeId: node.id,
      variables,
    };

    const result = await executor.execute(context, node.config || {});

    if (result.variables) {
      for (const [key, value] of Object.entries(result.variables)) {
        await this.prisma.forTenant(tenantId).workflowVariable.upsert({
          where: { instanceId_key: { instanceId, key } },
          update: { value },
          create: { instanceId, tenantId, key, value },
        });
      }
    }

    if (result.status === 'completed') {
      await this.completeWorkflow(tenantId, instanceId);
      return;
    }

    if (result.status === 'failed') {
      await this.prisma.forTenant(tenantId).workflowInstance.update({
        where: { id: instanceId },
        data: { status: 'failed', error: result.error, version: { increment: 1 } },
      });
      await this.createAudit(tenantId, instanceId, node.id, 'failed');
      return;
    }

    if (result.status === 'suspended') return;

    if (result.nextNodes) {
      for (const nextNodeId of result.nextNodes) {
        const nextNode = allNodes.find((n: any) => n.id === nextNodeId);
        if (nextNode) {
          await this.createExecution(tenantId, instanceId, nextNodeId, { variables });
          await this.resolveNextNodes(tenantId, instanceId, nextNode, { ...variables, ...result.variables }, allNodes);
        }
      }
    }
  }

  private async createExecution(tenantId: string, instanceId: string, nodeId: string, input?: any) {
    return this.prisma.forTenant(tenantId).workflowExecution.create({
      data: { instanceId, nodeId, tenantId, status: 'running', input: input ?? {}, startedAt: new Date() },
    });
  }

  private async createAudit(tenantId: string, instanceId: string, nodeId: string | null, eventType: string) {
    return this.prisma.forTenant(tenantId).workflowAudit.create({
      data: { instanceId, nodeId, tenantId, eventType },
    });
  }
}
