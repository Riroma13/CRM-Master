import { Injectable } from '@nestjs/common';
import { AutomationsService } from './automations.service';
import { WebhookTriggerService } from '../tenant-webhooks/webhook-trigger.service';

/**
 * Servicio central para disparar automatizaciones y webhooks desde cualquier parte del sistema.
 * Se inyecta en los servicios que crean/modifican recursos.
 */
@Injectable()
export class EventConnectorService {
  constructor(
    private readonly automations: AutomationsService,
    private readonly webhooks: WebhookTriggerService,
  ) {}

  async emit(tenantId: string, evento: string, data: any) {
    // Disparar reglas de automatización
    await this.automations.trigger(tenantId, evento, data);
    // Disparar webhooks
    await this.webhooks.trigger(tenantId, evento, data);
  }
}
