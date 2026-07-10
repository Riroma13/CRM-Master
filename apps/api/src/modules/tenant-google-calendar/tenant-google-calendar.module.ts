import { Module } from '@nestjs/common'; import { GoogleCalendarController } from './google-calendar.controller'; import { GoogleCalendarService } from './google-calendar.service'; import { PrismaService } from '../../common/prisma.service';
@Module({ controllers: [GoogleCalendarController], providers: [GoogleCalendarService, PrismaService] })
export class TenantGoogleCalendarModule {}
