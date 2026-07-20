import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

export interface UpsertPreferenceInput {
  enabled?: boolean;
  preferredChannels?: string[];
  digestFrequency?: string;
  timezone?: string;
  language?: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursTz?: string;
}

@Injectable()
export class PreferenceService {
  private readonly logger = new Logger(PreferenceService.name);
  private readonly cache = new Map<string, { data: any; ttl: number }>();
  private readonly CACHE_TTL_MS = 300_000;

  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(tenantId: string, userId: string, category?: string) {
    const cacheKey = `${tenantId}:${userId}:${category ?? '__global__'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.ttl > Date.now()) return cached.data;

    const where: any = { tenantId, userId };
    if (category !== undefined) where.category = category;
    else where.category = null;

    const pref = await this.prisma.forTenant(tenantId).notificationPreference.findFirst({ where });

    this.cache.set(cacheKey, { data: pref, ttl: Date.now() + this.CACHE_TTL_MS });
    return pref;
  }

  async upsertPreference(tenantId: string, userId: string, category: string | undefined, data: UpsertPreferenceInput) {
    const where = { tenantId_userId_category: { tenantId, userId, category: category ?? null } };
    const existing = await this.prisma.forTenant(tenantId).notificationPreference.findUnique({ where });

    if (existing) {
      const updated = await this.prisma.forTenant(tenantId).notificationPreference.update({
        where: { id: existing.id },
        data: {
          enabled: data.enabled,
          preferredChannels: data.preferredChannels,
          digestFrequency: data.digestFrequency,
          timezone: data.timezone,
          language: data.language,
          quietHoursStart: data.quietHoursStart,
          quietHoursEnd: data.quietHoursEnd,
          quietHoursTz: data.quietHoursTz,
        },
      });
      this.invalidateCache(tenantId, userId, category);
      return updated;
    }

    const created = await this.prisma.forTenant(tenantId).notificationPreference.create({
      data: {
        tenantId,
        userId,
        category: category ?? null,
        enabled: data.enabled ?? true,
        preferredChannels: data.preferredChannels ?? [],
        digestFrequency: data.digestFrequency ?? 'never',
        timezone: data.timezone,
        language: data.language ?? 'en',
        quietHoursStart: data.quietHoursStart,
        quietHoursEnd: data.quietHoursEnd,
        quietHoursTz: data.quietHoursTz,
      },
    });
    return created;
  }

  async deletePreference(tenantId: string, preferenceId: string) {
    const pref = await this.prisma.forTenant(tenantId).notificationPreference.findFirst({
      where: { id: preferenceId, tenantId },
    });
    if (!pref) throw new NotFoundException('Preference not found');
    await this.prisma.forTenant(tenantId).notificationPreference.delete({ where: { id: preferenceId } });
    this.invalidateCache(tenantId, pref.userId, pref.category ?? undefined);
  }

  private invalidateCache(tenantId: string, userId: string, category?: string) {
    this.cache.delete(`${tenantId}:${userId}:${category ?? '__global__'}`);
    this.cache.delete(`${tenantId}:${userId}:__global__`);
  }
}
