import { Module } from '@nestjs/common';
import { FeatureFlagService } from './feature-flags.service';
import { PlanFeatureGuard } from './plan-feature.guard';

@Module({
  providers: [FeatureFlagService, PlanFeatureGuard],
  exports: [FeatureFlagService, PlanFeatureGuard],
})
export class FeatureFlagModule {}
