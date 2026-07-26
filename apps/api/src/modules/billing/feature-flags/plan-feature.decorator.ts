import { SetMetadata, applyDecorators } from '@nestjs/common';
import type { FeatureKey } from '@shared/billing';

export const PLAN_FEATURE_KEY = 'plan_feature_key';

/**
 * Decorator that marks a route handler with the required feature key.
 * The PlanFeatureGuard reads this metadata and blocks the request
 * if the tenant's plan does not include the feature.
 *
 * @example
 * ```typescript
 * @PlanFeature('audit-logs')
 * async getAuditLogs() { ... }
 * ```
 */
export const PlanFeature = (featureKey: FeatureKey) =>
  applyDecorators(
    SetMetadata(PLAN_FEATURE_KEY, featureKey),
  );
