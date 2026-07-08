import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { DisponibilidadDto } from './dto';

@Injectable()
export class DisponibilidadService {
  private readonly logger = new Logger(DisponibilidadService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDisponibilidad(tenantId: string) {
    const disp = await this.prisma.admin.disponibilidad.findUnique({
      where: { tenantId },
    });

    if (!disp) {
      // Return defaults if not configured yet
      return {
        timezone: 'Europe/Madrid',
        slotDuration: 30,
        minNotice: 240,
        maxDays: 30,
        dailySchedule: [
          { day: 1, start: '09:00', end: '14:00' },
          { day: 1, start: '16:00', end: '19:00' },
          { day: 2, start: '09:00', end: '14:00' },
          { day: 3, start: '09:00', end: '14:00' },
          { day: 4, start: '09:00', end: '14:00' },
          { day: 5, start: '09:00', end: '14:00' },
        ],
        blockedDates: [],
      };
    }

    return {
      timezone: disp.timezone,
      slotDuration: disp.slotDuration,
      minNotice: disp.minNotice,
      maxDays: disp.maxDays,
      dailySchedule: disp.dailySchedule as any,
      blockedDates: (disp.blockedDates as string[]) ?? [],
    };
  }

  async upsertDisponibilidad(tenantId: string, dto: DisponibilidadDto) {
    const existing = await this.prisma.admin.disponibilidad.findUnique({
      where: { tenantId },
    });

    const data = {
      timezone: dto.timezone,
      slotDuration: dto.slotDuration,
      minNotice: dto.minNotice,
      maxDays: dto.maxDays,
      dailySchedule: dto.dailySchedule,
      blockedDates: dto.blockedDates ?? [],
    };

    if (existing) {
      const updated = await this.prisma.admin.disponibilidad.update({
        where: { tenantId },
        data,
      });
      this.logger.log(`Disponibilidad actualizada para tenant ${tenantId}`);
      return updated;
    }

    const created = await this.prisma.admin.disponibilidad.create({
      data: {
        tenantId,
        ...data,
      },
    });
    this.logger.log(`Disponibilidad creada para tenant ${tenantId}`);
    return created;
  }
}
