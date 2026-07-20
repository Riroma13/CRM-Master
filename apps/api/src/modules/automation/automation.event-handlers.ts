import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AutomationEngine } from './automation.service';

/**
 * Automation Event Handlers.
 *
 * Escucha eventos de dominio y delega en AutomationEngine.
 * Los módulos de dominio NO conocen AutomationModule.
 * La integración es puramente event-driven.
 */
@Injectable()
export class AutomationEventHandlers {
  private readonly logger = new Logger(AutomationEventHandlers.name);

  constructor(private readonly engine: AutomationEngine) {}

  @OnEvent('cliente.creado')
  async onClienteCreado(payload: Record<string, unknown>) {
    await this.engine.evaluate('cliente.creado', String(payload.tenantId ?? ''), payload);
  }

  @OnEvent('cita.confirmada')
  async onCitaConfirmada(payload: Record<string, unknown>) {
    await this.engine.evaluate('cita.confirmada', String(payload.tenantId ?? ''), payload);
  }

  @OnEvent('cita.cancelada')
  async onCitaCancelada(payload: Record<string, unknown>) {
    await this.engine.evaluate('cita.cancelada', String(payload.tenantId ?? ''), payload);
  }

  @OnEvent('pago.recibido')
  async onPagoRecibido(payload: Record<string, unknown>) {
    await this.engine.evaluate('pago.recibido', String(payload.tenantId ?? ''), payload);
  }

  @OnEvent('tarea.overdue')
  async onTareaOverdue(payload: Record<string, unknown>) {
    await this.engine.evaluate('tarea.overdue', String(payload.tenantId ?? ''), payload);
  }
}
