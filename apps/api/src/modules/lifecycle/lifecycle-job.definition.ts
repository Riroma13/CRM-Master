import { z } from 'zod';
import { JobDefinition, TrustedJobContext } from '../jobs/jobs.contracts';
import { LifecycleRunnerProcessor } from './lifecycle-runner.processor';

export const LIFECYCLE_QUEUE = 'lifecycle';
export const LifecycleJobDataSchema = z.object({
  policyId: z.string().min(1),
  scheduledFor: z.string().datetime(),
}).strict();
export type LifecycleJobData = z.infer<typeof LifecycleJobDataSchema>;

export function createLifecycleJobDefinition(
  runner: LifecycleRunnerProcessor,
): JobDefinition<LifecycleJobData> {
  return {
    key: 'lifecycle-run',
    queueName: LIFECYCLE_QUEUE,
    schema: LifecycleJobDataSchema,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    concurrency: 1,
    handle: async (context: TrustedJobContext, data: LifecycleJobData) => { await runner.handle(context, data); },
  };
}

export function lifecycleSchedulerId(policyId: string): string {
  return `lifecycle:${policyId}`;
}
