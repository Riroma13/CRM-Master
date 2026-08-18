import { ConflictException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PLUGIN_EXECUTION_DISABLED } from '@shared/plugin/plugin.types';

const PLATFORM_EVENTS = [
  'workflow.completed',
  'document.created',
  'document.updated',
  'document.uploaded',
  'document.deleted',
  'notification.sent',
  'cliente.creado',
  'pago.recibido',
  'incidencia.creada',
  'communication.send',
  'entity.created',
  'entity.updated',
  'entity.deleted',
  'cita.confirmada',
  'cita.cancelada',
  'tarea.overdue',
];

@Injectable()
export class EventBridgeService implements OnModuleInit {
  private readonly logger = new Logger(EventBridgeService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    // Execution is intentionally disabled; no event listeners may dispatch plugins.
  }

  private subscribeToPlatformEvents() {
    for (const eventType of PLATFORM_EVENTS) {
      this.eventEmitter.on(eventType, (payload: Record<string, unknown>) => {
        const tenantId = this.extractTenantId(payload);
        if (!tenantId) return;
        this.onEvent(eventType, tenantId, payload).catch(() => {});
      });
    }
    this.logger.log(`EventBridge subscribed to ${PLATFORM_EVENTS.length} event types`);
  }

  async onEvent(
    eventType: string,
    tenantId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    void eventType; void tenantId; void payload;
    throw new ConflictException({ code: PLUGIN_EXECUTION_DISABLED });
  }

  private async dispatchToPlugin(
    _plugin: { id: string; name: string; tenantId: string },
    _envelope: { eventType: string; tenantId: string; payload: Record<string, unknown> },
  ): Promise<void> {
    throw new ConflictException({ code: PLUGIN_EXECUTION_DISABLED });
  }

  private extractTenantId(payload: Record<string, unknown>): string | null {
    if (typeof payload?.tenantId === 'string') return payload.tenantId;
    if (typeof payload?.tenant_id === 'string') return payload.tenant_id;
    return null;
  }
}
