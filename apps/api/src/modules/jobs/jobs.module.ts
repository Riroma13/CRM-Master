import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { getJobsRedisConnectionOptions } from './jobs-redis.config';
import { JobsLifecycleService } from './jobs-lifecycle.service';
import { JobsClientService } from './jobs-client.service';
import { JobsTenantAuthorityService } from './jobs-tenant-authority.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  imports: [
    BullModule.forRoot({
      connection: getJobsRedisConnectionOptions(),
    }),
  ],
  providers: [PrismaService, JobsTenantAuthorityService, JobsLifecycleService, JobsClientService],
  exports: [JobsLifecycleService, JobsClientService],
})
export class JobsModule {}
