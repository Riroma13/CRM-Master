import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { DisponibilidadService } from './disponibilidad.service';
import { LocalCalendarProvider } from './local-calendar-provider';
import { CitasService } from './citas.service';

@Module({
  imports: [],
  controllers: [],
  providers: [
    PrismaService,
    DisponibilidadService,
    LocalCalendarProvider,
    CitasService,
  ],
  exports: [DisponibilidadService, LocalCalendarProvider, CitasService],
})
export class CitasModule {}
