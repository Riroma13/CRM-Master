import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ActivityTimelineModule } from '../activity-timeline/activity-timeline.module';
import { CitasController } from './citas.controller';
import { DisponibilidadService } from './disponibilidad.service';
import { LocalCalendarProvider } from './local-calendar-provider';
import { CitasService } from './citas.service';

@Module({
  imports: [ActivityTimelineModule],
  controllers: [CitasController],
  providers: [
    PrismaService,
    DisponibilidadService,
    LocalCalendarProvider,
    CitasService,
  ],
  exports: [DisponibilidadService, LocalCalendarProvider, CitasService],
})
export class CitasModule {}
