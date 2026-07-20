import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../common/prisma.service';
import { SsrfValidator } from './ssrf-validator.service';

const ENCRYPTION_KEY = process.env.WEBHOOK_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export interface CreateWebhookSubscriptionInput {
  tenantId: string;
  url: string;
  eventTypes: string[];
  secret?: string;
}

export interface WebhookSubscriptionResult {
  id: string;
  tenantId: string;
  url: string;
  eventTypes: string[];
  active: boolean;
  createdAt: Date;
}

@Injectable()
export class WebhookSubscriptionService {
  private readonly logger = new Logger(WebhookSubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ssrfValidator: SsrfValidator,
  ) {}

  async createSubscription(input: CreateWebhookSubscriptionInput): Promise<WebhookSubscriptionResult> {
    const validation = await this.ssrfValidator.validateUrl(input.url);
    if (!validation.valid) {
      throw new Error(`SSRF validation failed: ${validation.reason}`);
    }

    const webhookSecret = input.secret || crypto.randomBytes(32).toString('hex');
    const encryptedSecret = this.encryptSecret(webhookSecret);

    const subscription = await this.prisma.admin.webhookSubscription.create({
      data: {
        tenantId: input.tenantId,
        url: input.url,
        eventTypes: input.eventTypes,
        secret: encryptedSecret,
      },
    });

    return {
      id: subscription.id,
      tenantId: subscription.tenantId,
      url: subscription.url,
      eventTypes: subscription.eventTypes,
      active: subscription.active,
      createdAt: subscription.createdAt,
    };
  }

  async listSubscriptions(tenantId: string): Promise<WebhookSubscriptionResult[]> {
    const subscriptions = await this.prisma.admin.webhookSubscription.findMany({
      where: { tenantId, active: true },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions.map((sub: { id: string; tenantId: string; url: string; eventTypes: string[]; active: boolean; createdAt: Date }) => ({
      id: sub.id,
      tenantId: sub.tenantId,
      url: sub.url,
      eventTypes: sub.eventTypes,
      active: sub.active,
      createdAt: sub.createdAt,
    }));
  }

  async deleteSubscription(id: string): Promise<void> {
    await this.prisma.admin.webhookSubscription.update({
      where: { id },
      data: { active: false },
    });
  }

  private encryptSecret(secret: string): string {
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decryptSecret(encrypted: string): string {
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
