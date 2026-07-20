import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../common/prisma.service';
import { WorkerPoolService } from '../sandbox/worker-pool.service';
import { PluginRegistryService } from '../registry/plugin-registry.service';
import type { EventEnvelope } from '@shared/plugin';

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

interface PluginWithName {
  id: string;
  name: string;
  tenantId: string;
  [key: string]: unknown;
}

@Injectable()
export class EventBridgeService implements OnModuleInit {
  private readonly logger = new Logger(EventBridgeService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly registry: PluginRegistryService,
    private readonly workerPool: WorkerPoolService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.subscribeToPlatformEvents();
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
    const plugins = await this.registry.getByEventType(tenantId, eventType);
    if (plugins.length === 0) return;

    const results = await Promise.allSettled(
      plugins.map((plugin: Record<string, unknown>) =>
        this.dispatchToPlugin(
          plugin as unknown as PluginWithName,
          { eventType, tenantId, payload },
        ),
      ),
    );

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.warn(
        `EventBridge: ${failures.length}/${plugins.length} plugins failed for ${eventType}`,
      );
    }
  }

  private async dispatchToPlugin(
    plugin: PluginWithName,
    envelope: { eventType: string; tenantId: string; payload: Record<string, unknown> },
  ): Promise<void> {
    try {
      await this.workerPool.execute(plugin.id, 'onEvent', envelope);
      await this.logEventDelivery(plugin.tenantId, plugin.id, envelope.eventType, envelope.payload);
    } catch (err) {
      this.logger.error(
        `Plugin ${plugin.id} (${plugin.name}) failed on ${envelope.eventType}: ${(err as Error).message}`,
      );
    }
  }

  private async logEventDelivery(
    tenantId: string,
    pluginId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.admin.pluginEvent.create({
        data: { tenantId, pluginId, eventType, payload },
      });
    } catch (err) {
      this.logger.error(
        `Failed to log event delivery for plugin ${pluginId}: ${(err as Error).message}`,
      );
    }
  }

  private extractTenantId(payload: Record<string, unknown>): string | null {
    if (typeof payload?.tenantId === 'string') return payload.tenantId;
    if (typeof payload?.tenant_id === 'string') return payload.tenant_id;
    return null;
  }
}
