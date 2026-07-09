import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { LocalCalendarProvider } from './local-calendar-provider';
import { Slot, BookSlotInput, CitaResult } from './calendar-provider.interface';

@Injectable()
export class CitasService {
  private readonly logger = new Logger(CitasService.name);

  constructor(
    private readonly calendarProvider: LocalCalendarProvider,
    private readonly prisma: PrismaService,
  ) {}

  async getSlots(tenantId: string, date: Date, resourceId?: string): Promise<Slot[]> {
    return this.calendarProvider.getSlots(tenantId, date, resourceId);
  }

  async bookSlot(tenantId: string, input: BookSlotInput): Promise<CitaResult> {
    return this.calendarProvider.bookSlot(tenantId, input);
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
