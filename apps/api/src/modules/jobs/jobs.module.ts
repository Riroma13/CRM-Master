import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JobsInfraModule } from './jobs-infra.module';
import { JobService } from './job.service';
import { DlqProcessor } from './dlq-processor';

@Module({
  imports: [JobsInfraModule, ConfigModule],
  providers: [JobService, DlqProcessor],
  exports: [JobService, JobsInfraModule],
})
export class JobsModule {}
