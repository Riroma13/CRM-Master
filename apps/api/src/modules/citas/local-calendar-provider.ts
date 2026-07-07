import {
  Injectable,
  ConflictException,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  CalendarProvider,
  Slot,
  BookSlotInput,
  CitaResult,
} from './calendar-provider.interface';

interface ScheduleEntry {
  day: number;
  start: string;
  end: string;
}

@Injectable()
export class LocalCalendarProvider implements CalendarProvider {
  private readonly logger = new Logger(LocalCalendarProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates available time slots for a given date.
   * Reads the tenant's Disponibilidad configuration and subtracts:
   * - blocked dates (holidays, vacation)
   * - existing bookings (pending or confirmed)
   * - slots within minNotice of now
   */
  async getSlots(tenantId: string, date: Date): Promise<Slot[]> {
    // 1. Get disponibilidad configuration
    const disp = await this.prisma.admin.disponibilidad.findUnique({
      where: { tenantId },
    });

    if (!disp) {
      return [];
    }

    // 2. Check if date is blocked
    const dateStr = this.formatDate(date);
    const blockedDates = (disp.blockedDates as string[]) ?? [];
    if (blockedDates.includes(dateStr)) {
      return [];
    }

    // 3. Check minNotice — don't generate slots within minNotice minutes from now
    const minNoticeMs = disp.minNotice * 60 * 1000;
    const now = new Date();
    if (date.getTime() < now.getTime() + minNoticeMs) {
      return [];
    }

    // 4. Get day of week schedule
    const dayOfWeek = date.getUTCDay(); // 0=Sun, 1=Mon, ...
    const schedule = (disp.dailySchedule as ScheduleEntry[]).filter(
      (entry) => entry.day === dayOfWeek,
    );

    if (schedule.length === 0) {
      return [];
    }

    // 5. Get existing bookings for this date (pending or confirmed)
    const dayStart = new Date(date);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const existingBookings = await this.prisma.admin.cita.findMany({
      where: {
        tenantId,
        fecha: { gte: dayStart, lte: dayEnd },
        estado: { in: ['pendiente', 'confirmada'] },
      },
      select: { fecha: true, duracion: true },
    });

    // 6. Generate slots for each schedule window
    const slots: Slot[] = [];
    const slotDuration = disp.slotDuration;

    for (const entry of schedule) {
      const [startHour, startMin] = entry.start.split(':').map(Number);
      const [endHour, endMin] = entry.end.split(':').map(Number);

      const windowStart = new Date(date);
      windowStart.setUTCHours(startHour, startMin, 0, 0);

      const windowEnd = new Date(date);
      windowEnd.setUTCHours(endHour, endMin, 0, 0);

      // Don't generate slots in the past
      let cursor = new Date(Math.max(windowStart.getTime(), now.getTime()));

      while (cursor.getTime() + slotDuration * 60 * 1000 <= windowEnd.getTime()) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(cursor.getTime() + slotDuration * 60 * 1000);

        // Check if slot overlaps with any existing booking
        const isBooked = existingBookings.some((booking: { fecha: Date; duracion: number }) => {
          const bookingStart = new Date(booking.fecha);
          const bookingEnd = new Date(
            bookingStart.getTime() + booking.duracion * 60 * 1000,
          );
          return slotStart < bookingEnd && slotEnd > bookingStart;
        });

        slots.push({
          start: slotStart,
          end: slotEnd,
          available: !isBooked,
        });

        cursor = new Date(cursor.getTime() + slotDuration * 60 * 1000);
      }
    }

    return slots;
  }

  /**
   * Books a slot with double-booking prevention using Prisma $transaction.
   *
   * Two overlapping time intervals [A_start, A_end) and [B_start, B_end)
   * overlap if A_start < B_end AND A_end > B_start.
   *
   * We search for any existing cita whose time range overlaps with the
   * requested slot. The search window is widened to account for existing
   * citas of any duration that might overlap.
   */
  async bookSlot(tenantId: string, input: BookSlotInput): Promise<CitaResult> {
    const fecha =
      typeof input.fecha === 'string' ? new Date(input.fecha) : input.fecha;
    const duracion = input.duracion ?? 30;
    const slotEnd = new Date(fecha.getTime() + duracion * 60 * 1000);

    // Validate minNotice — fecha must be at least minNotice minutes from now
    const disp = await this.prisma.admin.disponibilidad.findUnique({
      where: { tenantId },
    });

    if (disp) {
      const minNoticeMs = disp.minNotice * 60 * 1000;
      const now = new Date();
      if (fecha.getTime() < now.getTime() + minNoticeMs) {
        throw new UnprocessableEntityException(
          `La fecha debe tener al menos ${disp.minNotice} minutos de antelación`,
        );
      }
    }

    return this.prisma.admin.$transaction(async (tx: any) => {
      // Find all active citas whose start falls within a widened window.
      // The window covers citas starting up to 2h before our slot (to catch
      // long overlapping citas) through to the end of our slot.
      const searchStart = new Date(fecha.getTime() - 120 * 60 * 1000);

      const existingCitas = await tx.cita.findMany({
        where: {
          tenantId,
          fecha: { gte: searchStart, lt: slotEnd },
          estado: { in: ['pendiente', 'confirmada'] },
        },
      });

      // True overlap check: existing [A_start, A_end) overlaps with [fecha, slotEnd)
      for (const cita of existingCitas) {
        const citaEnd = new Date(cita.fecha.getTime() + cita.duracion * 60 * 1000);
        if (cita.fecha < slotEnd && citaEnd > fecha) {
          throw new ConflictException('Slot no disponible');
        }
      }

      return tx.cita.create({
        data: {
          tenantId,
          fecha,
          duracion,
          clienteNombre: input.clienteNombre ?? null,
          clienteEmail: input.clienteEmail ?? null,
          clienteTelefono: input.clienteTelefono ?? null,
          descripcion: input.descripcion ?? null,
        },
      });
    });
  }

  async confirmCita(citaId: string): Promise<CitaResult> {
    const cita = await this.prisma.admin.cita.update({
      where: { id: citaId },
      data: { estado: 'confirmada' },
    });
    this.logger.log(`Cita ${citaId} confirmada`);
    return cita;
  }

  async cancelCita(citaId: string): Promise<CitaResult> {
    const cita = await this.prisma.admin.cita.update({
      where: { id: citaId },
      data: { estado: 'cancelada' },
    });
    this.logger.log(`Cita ${citaId} cancelada`);
    return cita;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
