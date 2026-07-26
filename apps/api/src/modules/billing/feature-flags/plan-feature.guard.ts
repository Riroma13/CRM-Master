import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagService } from './feature-flags.service';
import { PLAN_FEATURE_KEY } from './plan-feature.decorator';
import type { FeatureKey } from '@shared/billing';

@Injectable()
export class PlanFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<FeatureKey>(
      PLAN_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No decorator → skip check
    if (!featureKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId ?? request.user?.tenantId;

    // No tenantId → skip check (defensive)
    if (!tenantId) {
      return true;
    }

    const enabled = await this.featureFlagService.isEnabled(tenantId, featureKey);

    if (!enabled) {
      throw new HttpException(
        { error: 'feature_not_available', feature: featureKey },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
