import { Injectable } from '@nestjs/common';
import { LifecyclePolicyInput, LifecycleTargetAdapter } from '../../../../../packages/shared/src/lifecycle';
import { PrismaService } from '../../common/prisma.service';
import { TrustedJobContext } from '../jobs/jobs.contracts';
import { LifecycleJobData } from './lifecycle-job.definition';

@Injectable()
export class LifecycleRunnerProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adapters: LifecycleTargetAdapter[],
    private readonly audit: { log(data: Record<string, unknown>): Promise<void> },
  ) {}

  async handle(context: TrustedJobContext, data: LifecycleJobData): Promise<unknown> {
    if ('tenantId' in (data as object)) throw new Error('Invalid job envelope');
    const prisma = this.prisma.forTenant(context.tenantId);
    return prisma.$transaction(async (tx: any) => {
      const policy = await tx.dataLifecyclePolicy.findUnique({ where: { id: data.policyId } });
      if (!policy || !policy.enabled) return null;

      const scheduledFor = new Date(data.scheduledFor);
      const prior = await tx.dataLifecycleRun.findUnique({
        where: { policyId_scheduledFor: { policyId: policy.id, scheduledFor } },
      });
      if (prior && ['SUCCEEDED', 'FAILED', 'SKIPPED'].includes(prior.status)) return prior;
      const run = prior ?? await tx.dataLifecycleRun.create({
        data: { tenantId: context.tenantId, policyId: policy.id, scheduledFor, status: 'RUNNING' },
      });
      const adapter = this.adapters.find((candidate) => candidate.target === policy.target);
      if (!adapter) return this.finalize(tx, run.id, 'SKIPPED', 0);

      try {
        const result = await adapter.execute(context, policy as LifecyclePolicyInput);
        const completed = await this.finalize(tx, run.id, 'SUCCEEDED', result.purgedCount);
        await this.audit.log({ tenantId: context.tenantId, action: 'lifecycle_run_completed', resource: 'lifecycle_run', resourceId: run.id });
        return completed;
      } catch {
        const failed = await tx.dataLifecycleRun.update({
          where: { id: run.id },
          data: { status: 'FAILED', failureCode: 'LIFECYCLE_EXECUTION_FAILED' },
        });
        await this.audit.log({ tenantId: context.tenantId, action: 'lifecycle_run_failed', resource: 'lifecycle_run', resourceId: run.id, outcome: 'failure' });
        throw new Error('LIFECYCLE_EXECUTION_FAILED');
      }
    });
  }

  private finalize(tx: any, id: string, status: string, purgedCount: number): Promise<unknown> {
    return tx.dataLifecycleRun.update({ where: { id }, data: { status, purgedCount, failureCode: null } });
  }
}
