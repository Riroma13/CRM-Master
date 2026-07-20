import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../common/prisma.service';
import type { ApiKeyScope, ApiKeyPayload, CreateTokenResult } from '@shared/public-api';

interface CacheEntry {
  payload: ApiKeyPayload;
  expiresAt: number;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  async createToken(
    tenantId: string,
    name: string,
    scopes: ApiKeyScope[],
    expiresInDays?: number,
  ): Promise<CreateTokenResult> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const token = `crm_live_${rawToken}`;
    const tokenHash = this.hashToken(token);
    const tokenPrefix = token.substring(0, 12);
    const expiresAt = new Date(
      Date.now() + (expiresInDays ?? 90) * 24 * 60 * 60 * 1000,
    );

    const record = await this.prisma.admin.apiKey.create({
      data: { tenantId, name, tokenHash, tokenPrefix, scopes, expiresAt },
    });

    return { id: record.id, token, scopes: record.scopes as ApiKeyScope[], expiresAt: record.expiresAt.toISOString() };
  }

  async validateToken(token: string): Promise<ApiKeyPayload | null> {
    if (!token.startsWith('crm_live_')) return null;

    const hash = this.hashToken(token);

    const cached = this.cache.get(hash);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.payload;
    }

    const record = await this.prisma.admin.apiKey.findUnique({ where: { tokenHash: hash } });
    if (!record) return null;
    if (!record.active) return null;
    if (record.expiresAt < new Date()) return null;

    await this.prisma.admin.apiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    }).catch((err: Error) => {
      this.logger.warn(`Failed to update lastUsedAt: ${err.message}`);
    });

    const payload: ApiKeyPayload = {
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      scopes: record.scopes as ApiKeyScope[],
      expiresAt: record.expiresAt.toISOString(),
      active: record.active,
    };

    this.cache.set(hash, { payload, expiresAt: Date.now() + this.CACHE_TTL_MS });

    return payload;
  }

  async revokeToken(tokenId: string): Promise<void> {
    await this.prisma.admin.apiKey.update({
      where: { id: tokenId },
      data: { active: false },
    }).catch((err: Error) => {
      this.logger.warn(`Token ${tokenId} not found for revoke: ${err.message}`);
    });

    this.cache.clear();
  }

  async getTokens(tenantId: string): Promise<ApiKeyPayload[]> {
    const records = await this.prisma.admin.apiKey.findMany({ where: { tenantId } });
    return records.map((record: { id: string; tenantId: string; name: string; scopes: string[]; expiresAt: Date; active: boolean }) => ({
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      scopes: record.scopes as ApiKeyScope[],
      expiresAt: record.expiresAt.toISOString(),
      active: record.active,
    }));
  }

  clearCache(): void {
    this.cache.clear();
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
