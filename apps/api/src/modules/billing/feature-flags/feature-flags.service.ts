import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../common/prisma.service';
import type { FeatureKey } from '@shared/billing';

interface CacheEntry {
  features: FeatureKey[];
  expiresAt: number;
}

export interface IFeatureFlagService {
  isEnabled(tenantId: string, featureKey: FeatureKey): Promise<boolean>;
  getAllEnabled(tenantId: string): Promise<FeatureKey[]>;
  invalidateCache(tenantId: string): void;
}

@Injectable()
export class FeatureFlagService implements IFeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttl: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.ttl =
      (parseInt(process.env.FEATURE_FLAG_CACHE_TTL ?? '120', 10) || 120) * 1000;
  }

  /**
   * Check if a feature is enabled for the given tenant.
   * Results are cached with TTL (default 120s, configurable via FEATURE_FLAG_CACHE_TTL).
   */
  async isEnabled(tenantId: string, featureKey: FeatureKey): Promise<boolean> {
    const features = await this.getFeatures(tenantId);
    return features.includes(featureKey);
  }

  /**
   * Get all enabled features for the given tenant.
   * Results are cached with TTL.
   */
  async getAllEnabled(tenantId: string): Promise<FeatureKey[]> {
    return this.getFeatures(tenantId);
  }

  /**
   * Explicitly invalidate the cache for a tenant.
   */
  invalidateCache(tenantId: string): void {
    this.cache.delete(tenantId);
    this.logger.debug(`Cache invalidated for tenant=${tenantId}`);
  }

  /**
   * Listen for plan.changed events and invalidate the tenant's cache.
   */
  @OnEvent('plan.changed')
  handlePlanChanged(payload: { tenantId: string }): void {
    this.invalidateCache(payload.tenantId);
  }

  /**
   * Get features for a tenant, using cache if available.
   */
  private async getFeatures(tenantId: string): Promise<FeatureKey[]> {
    const cached = this.cache.get(tenantId);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.features;
    }

    const features = await this.resolveFeatures(tenantId);

    this.cache.set(tenantId, {
      features,
      expiresAt: Date.now() + this.ttl,
    });

    return features;
  }

  /**
   * Resolve features from the database by looking up the tenant's subscription and plan.
   */
  private async resolveFeatures(tenantId: string): Promise<FeatureKey[]> {
    const subscription = await this.prisma.admin.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      return [];
    }

    // Only active, trialing, and grace_period subscriptions grant feature access
    const validStatuses = ['active', 'trialing', 'grace_period'];

    if (!validStatuses.includes(subscription.status)) {
      return [];
    }

    return (subscription.plan.features as FeatureKey[]) ?? [];
  }
}
