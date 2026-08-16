import { BadRequestException, Injectable } from '@nestjs/common';
import {
  LifecyclePolicyInput,
  LifecyclePolicyInputSchema,
  LifecycleTarget,
} from '../../../../../packages/shared/src/lifecycle';
import { PrismaService } from '../../common/prisma.service';
import { JobsClient, TrustedJobContext } from '../jobs/jobs.contracts';
import { createLifecycleJobDefinition, lifecycleSchedulerId } from './lifecycle-job.definition';

@Injectable()
export class LifecyclePolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsClient,
    private readonly audit: { log(data: Record<string, unknown>): Promise<void> },
  ) {}

  async upsertPolicy(
    context: TrustedJobContext,
    input: unknown,
    routeTarget?: LifecycleTarget,
  ): Promise<unknown> {
    const policy = this.parseInput(input, routeTarget);
    const record = await this.prisma.admin.dataLifecyclePolicy.upsert({
      where: { tenantId_target: { tenantId: context.tenantId, target: policy.target } },
      create: { ...policy, tenantId: context.tenantId },
      update: { schedule: policy.schedule, enabled: policy.enabled },
    });

    if (policy.enabled) {
      await this.jobs.schedule(
        createLifecycleJobDefinition({} as never),
        lifecycleSchedulerId(record.id),
        policy.schedule,
        context,
        { policyId: record.id, scheduledFor: new Date().toISOString() },
      );
    } else {
      await this.jobs.cancel('lifecycle', lifecycleSchedulerId(record.id));
    }
    await this.audit.log({ tenantId: context.tenantId, action: 'lifecycle_policy_updated', resource: 'lifecycle_policy', resourceId: record.id });
    return record;
  }

  async getPolicy(context: TrustedJobContext, target: LifecycleTarget): Promise<unknown> {
    return this.prisma.admin.dataLifecyclePolicy.findFirst({ where: { tenantId: context.tenantId, target } });
  }

  async setEnabled(context: TrustedJobContext, target: LifecycleTarget, enabled: boolean): Promise<unknown> {
    const policy = await this.getPolicy(context, target) as { id: string } | null;
    if (!policy) return null;
    const record = await this.prisma.admin.dataLifecyclePolicy.update({ where: { id: policy.id }, data: { enabled } });
    if (!enabled) await this.jobs.cancel('lifecycle', lifecycleSchedulerId(policy.id));
    return record;
  }

  private parseInput(input: unknown, routeTarget?: LifecycleTarget): LifecyclePolicyInput {
    const parsed = LifecyclePolicyInputSchema.safeParse(input);
    if (!parsed.success || (routeTarget && parsed.data.target !== routeTarget)) {
      throw new BadRequestException('Invalid lifecycle policy');
    }
    return parsed.data;
  }
}
