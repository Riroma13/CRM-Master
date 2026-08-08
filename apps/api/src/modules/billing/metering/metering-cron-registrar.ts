import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BILLING_QUEUE_NAMES } from '../billing-queue.constants';

@Injectable()
export class MeteringCronRegistrar implements OnModuleInit {
  private readonly logger = new Logger(MeteringCronRegistrar.name);

  constructor(
    @InjectQueue(BILLING_QUEUE_NAMES.METERING) private readonly meteringQueue: Queue,
  ) {}

  async onModuleInit() {
    const jobName = 'billing:metering:hourly';

    const existing = await this.meteringQueue.getJobScheduler(jobName);
    if (existing) {
      await this.meteringQueue.removeJobScheduler(jobName);
    }

    await this.meteringQueue.upsertJobScheduler(
      jobName,
      { pattern: '0 * * * *' },
      {
        name: 'collect',
        data: {},
        opts: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
    );

    this.logger.log('Hourly metering cron registered: 0 * * * *');
  }
}
