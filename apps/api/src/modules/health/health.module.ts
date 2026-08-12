import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../../common/prisma.service';
import { ObservabilityModule } from '../observability/observability.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [JobsModule, ObservabilityModule],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class HealthModule {}
