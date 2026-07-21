import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../../common/prisma.service';
import { ObservabilityModule } from '../observability/observability.module';

@Module({
  imports: [ObservabilityModule],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class HealthModule {}
