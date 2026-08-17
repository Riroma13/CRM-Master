import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PrismaService } from '../../common/prisma.service';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { DefinitionService } from './definition.service';
import { CompensationEngine } from './compensation/compensation-engine';
import {
  ServiceTaskExecutor,
  UserTaskExecutor,
  DecisionExecutor,
  ParallelSplitExecutor,
  ParallelJoinExecutor,
  TimerExecutor,
  EventWaitExecutor,
  SubWorkflowExecutor,
  CompensationExecutor,
} from './executor/node-executor';
import { WorkflowDefinitionGuard } from './guards/workflow-definition.guard';
import { WorkflowExecutionGuard } from './guards/workflow-execution.guard';
import { WorkflowTenantContextGuard } from './guards/workflow-tenant-context.guard';

@Module({
  controllers: [WorkflowController],
  imports: [IdentityModule],
  providers: [
    WorkflowService,
    DefinitionService,
    CompensationEngine,
    ServiceTaskExecutor,
    UserTaskExecutor,
    DecisionExecutor,
    ParallelSplitExecutor,
    ParallelJoinExecutor,
    TimerExecutor,
    EventWaitExecutor,
    SubWorkflowExecutor,
    CompensationExecutor,
    WorkflowDefinitionGuard,
    WorkflowExecutionGuard,
    WorkflowTenantContextGuard,
    PrismaService,
    {
      provide: 'NODE_EXECUTOR_REGISTRY',
      useFactory: (
        serviceTask: ServiceTaskExecutor,
        userTask: UserTaskExecutor,
        decision: DecisionExecutor,
        parallelSplit: ParallelSplitExecutor,
        parallelJoin: ParallelJoinExecutor,
        timer: TimerExecutor,
        eventWait: EventWaitExecutor,
        subWorkflow: SubWorkflowExecutor,
        compensation: CompensationExecutor,
      ) => {
        const registry = new Map();
        registry.set('service-task', serviceTask);
        registry.set('user-task', userTask);
        registry.set('decision', decision);
        registry.set('parallel-split', parallelSplit);
        registry.set('parallel-join', parallelJoin);
        registry.set('timer', timer);
        registry.set('event-wait', eventWait);
        registry.set('sub-workflow', subWorkflow);
        registry.set('compensation', compensation);
        return registry;
      },
      inject: [
        ServiceTaskExecutor,
        UserTaskExecutor,
        DecisionExecutor,
        ParallelSplitExecutor,
        ParallelJoinExecutor,
        TimerExecutor,
        EventWaitExecutor,
        SubWorkflowExecutor,
        CompensationExecutor,
      ],
    },
  ],
  exports: [
    WorkflowService,
    DefinitionService,
    CompensationEngine,
    'NODE_EXECUTOR_REGISTRY',
  ],
})
export class WorkflowModule {}
