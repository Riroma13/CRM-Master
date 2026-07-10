import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class WebhookTriggerService {
  private readonly logger = new Logger(WebhookTriggerService.name);
  constructor(private readonly prisma: PrismaService) {}

  async trigger(tenantId: string, evento: string, payload: any) {
    const webhooks = await this.prisma.admin.webhook.findMany({
      where: { tenantId, isActive: true, eventos: { has: evento } },
    });

    for (const w of webhooks) {
      try {
        const res = await fetch(w.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ evento, tenantId, data: payload, timestamp: new Date().toISOString() }),
        });
        await this.prisma.admin.webhook.update({
          where: { id: w.id },
          data: { ultimoEnvio: new Date(), ultimoError: res.ok ? null : `HTTP ${res.status}` },
        });
        this.logger.log(`Webhook ${w.id} → ${w.url}: ${res.status}`);
      } catch (err: any) {
        await this.prisma.admin.webhook.update({
          where: { id: w.id },
          data: { ultimoEnvio: new Date(), ultimoError: err.message },
        });
        this.logger.error(`Webhook ${w.id} failed: ${err.message}`);
      }
    }
  }
}
