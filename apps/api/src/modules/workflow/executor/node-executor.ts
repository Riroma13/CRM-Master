import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { NodeType } from '../../../../../../packages/shared/src/workflow';
import type { NodeExecutor, WorkflowExecutionContext, WorkflowExecutionResult } from '../../../../../../packages/shared/src/workflow';

export const WORKFLOW_NODE_EXECUTOR = 'WORKFLOW_NODE_EXECUTOR';

export function WorkflowNodeExecutor(type: NodeType): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(WORKFLOW_NODE_EXECUTOR, type, target);
  };
}

@Injectable()
@WorkflowNodeExecutor('service-task')
export class ServiceTaskExecutor implements NodeExecutor {
  readonly type: NodeType = 'service-task';
  private readonly logger = new Logger(ServiceTaskExecutor.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: WorkflowExecutionContext, config: Record<string, unknown>): Promise<WorkflowExecutionResult> {
    const actionId = config.actionId as string;
    if (!actionId) {
      return { success: false, error: 'No actionId configured for service-task node', status: 'failed' };
    }
    this.logger.log(`Executing service action ${actionId} for instance ${context.instanceId}`);
    return { success: true, nextNodes: [], status: 'completed' };
  }
}

@Injectable()
@WorkflowNodeExecutor('user-task')
export class UserTaskExecutor implements NodeExecutor {
  readonly type: NodeType = 'user-task';
  private readonly logger = new Logger(UserTaskExecutor.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: WorkflowExecutionContext, config: Record<string, unknown>): Promise<WorkflowExecutionResult> {
    await this.prisma.forTenant(context.tenantId).workflowUserTask.create({
      data: {
        instanceId: context.instanceId,
        nodeId: context.nodeId,
        tenantId: context.tenantId,
        assignee: (config.assignee as string) || null,
        input: config.input ?? {},
        status: 'pending',
      },
    });
    return { success: true, status: 'suspended' };
  }
}

@Injectable()
@WorkflowNodeExecutor('decision')
export class DecisionExecutor implements NodeExecutor {
  readonly type: NodeType = 'decision';
  private readonly logger = new Logger(DecisionExecutor.name);

  async execute(context: WorkflowExecutionContext, config: Record<string, unknown>): Promise<WorkflowExecutionResult> {
    const conditions = config.conditions as Array<{ expression: string; next: string }> | undefined;
    const defaultNext = config.defaultNext as string | undefined;

    if (conditions) {
      for (const condition of conditions) {
        const matched = this.evaluateExpression(condition.expression, context.variables);
        if (matched) {
          return { success: true, nextNodes: [condition.next] };
        }
      }
    }
    if (defaultNext) {
      return { success: true, nextNodes: [defaultNext] };
    }
    return { success: true, nextNodes: [] };
  }

  private evaluateExpression(expression: string, variables: Record<string, unknown>): boolean {
    try {
      const fn = new Function(...Object.keys(variables), `return ${expression};`);
      return !!fn(...Object.values(variables));
    } catch {
      return false;
    }
  }
}

@Injectable()
@WorkflowNodeExecutor('parallel-split')
export class ParallelSplitExecutor implements NodeExecutor {
  readonly type: NodeType = 'parallel-split';

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: WorkflowExecutionContext, config: Record<string, unknown>): Promise<WorkflowExecutionResult> {
    const nextNodes = config.next as string[] | undefined;
    if (!nextNodes || nextNodes.length === 0) {
      return { success: true, nextNodes: [] };
    }

    const branchGroup = `${context.nodeId}-${Date.now()}`;
    for (const nodeId of nextNodes) {
      await this.prisma.forTenant(context.tenantId).workflowActiveBranch.create({
        data: {
          instanceId: context.instanceId,
          tenantId: context.tenantId,
          branchGroup,
          nodeId,
        },
      });
    }
    return { success: true, nextNodes };
  }
}

@Injectable()
@WorkflowNodeExecutor('parallel-join')
export class ParallelJoinExecutor implements NodeExecutor {
  readonly type: NodeType = 'parallel-join';

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: WorkflowExecutionContext, config: Record<string, unknown>): Promise<WorkflowExecutionResult> {
    const branchGroup = config.branchGroup as string;
    if (!branchGroup) {
      return { success: false, error: 'No branchGroup configured for parallel-join', status: 'failed' };
    }

    const pendingBranches = await this.prisma.forTenant(context.tenantId).workflowActiveBranch.findMany({
      where: { instanceId: context.instanceId, branchGroup, completed: false },
    });

    if (pendingBranches.length > 0) {
      return { success: true, status: 'suspended' };
    }

    const nextNodes = config.next as string[] | undefined;
    return { success: true, nextNodes: nextNodes ?? [] };
  }
}

@Injectable()
@WorkflowNodeExecutor('timer')
export class TimerExecutor implements NodeExecutor {
  readonly type: NodeType = 'timer';

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: WorkflowExecutionContext, config: Record<string, unknown>): Promise<WorkflowExecutionResult> {
    const delayMs = (config.delayMs as number) ?? 60000;
    const fireAt = new Date(Date.now() + delayMs);

    await this.prisma.forTenant(context.tenantId).workflowTimer.create({
      data: {
        instanceId: context.instanceId,
        nodeId: context.nodeId,
        tenantId: context.tenantId,
        fireAt,
      },
    });
    return { success: true, status: 'suspended' };
  }
}

@Injectable()
@WorkflowNodeExecutor('event-wait')
export class EventWaitExecutor implements NodeExecutor {
  readonly type: NodeType = 'event-wait';

  async execute(context: WorkflowExecutionContext, _config: Record<string, unknown>): Promise<WorkflowExecutionResult> {
    return { success: true, status: 'suspended' };
  }
}

@Injectable()
@WorkflowNodeExecutor('sub-workflow')
export class SubWorkflowExecutor implements NodeExecutor {
  readonly type: NodeType = 'sub-workflow';
  private readonly logger = new Logger(SubWorkflowExecutor.name);

  async execute(context: WorkflowExecutionContext, config: Record<string, unknown>): Promise<WorkflowExecutionResult> {
    const childDefinitionId = config.definitionId as string;
    if (!childDefinitionId) {
      return { success: false, error: 'No definitionId configured for sub-workflow', status: 'failed' };
    }
    this.logger.log(`Scheduling sub-workflow ${childDefinitionId} from instance ${context.instanceId}`);
    return { success: true, status: 'suspended' };
  }
}

@Injectable()
@WorkflowNodeExecutor('compensation')
export class CompensationExecutor implements NodeExecutor {
  readonly type: NodeType = 'compensation';

  async execute(context: WorkflowExecutionContext, config: Record<string, unknown>): Promise<WorkflowExecutionResult> {
    const nextNodes = config.next as string[] | undefined;
    return { success: true, nextNodes: nextNodes ?? [] };
  }
}
