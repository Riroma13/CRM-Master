import { Module } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { FeatureFlagService } from './feature-flags.service';
import { PlanFeatureGuard } from './plan-feature.guard';

@Module({
  providers: [FeatureFlagService, PlanFeatureGuard, PrismaService],
  exports: [FeatureFlagService, PlanFeatureGuard],
})
export class FeatureFlagModule {}
