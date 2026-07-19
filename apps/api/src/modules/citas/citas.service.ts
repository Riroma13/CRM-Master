import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ActivityTimelineService } from '../activity-timeline/activity-timeline.service';
import { LocalCalendarProvider } from './local-calendar-provider';
import { Slot, BookSlotInput, CitaResult } from './calendar-provider.interface';

@Injectable()
export class CitasService {
  private readonly logger = new Logger(CitasService.name);

  constructor(
    private readonly calendarProvider: LocalCalendarProvider,
    private readonly prisma: PrismaService,
    private readonly activityTimeline: ActivityTimelineService,
  ) {}

  async getSlots(tenantId: string, date: Date, resourceId?: string): Promise<Slot[]> {
    return this.calendarProvider.getSlots(tenantId, date, resourceId);
  }

  async bookSlot(tenantId: string, input: BookSlotInput): Promise<CitaResult> {
    const result = await this.calendarProvider.bookSlot(tenantId, input);
    try {
      await this.activityTimeline.publish({
        eventType: 'reserva.creada',
        tenantId,
        entityType: 'cita',
        entityId: result.id,
        actor: input.clienteEmail ?? 'system',
        sourceModule: 'citas',
        severity: 'info',
        category: 'scheduling',
        payload: { fecha: result.fecha.toISOString(), estado: result.estado },
      });
    } catch (e) {
      this.logger.warn(`Failed to publish reserva.creada: ${(e as Error).message}`);
    }
    return result;
  }

  async confirmCita(citaId: string): Promise<CitaResult> {
    return this.calendarProvider.confirmCita(citaId);
  }

  async cancelCita(citaId: string): Promise<CitaResult> {
    return this.calendarProvider.cancelCita(citaId);
  }

  async listCitas(tenantId: string) {
    return this.prisma.admin.cita.findMany({
      where: { tenantId },
      orderBy: { fecha: 'desc' },
    });
  }
}
