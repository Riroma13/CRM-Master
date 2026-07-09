import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { NotificationRemindersService } from './notification-reminders.service';
import { NotificationsConfigController } from './notifications-config.controller';
import { PrismaService } from '../../common/prisma.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [NotificationsConfigController],
  providers: [NotificationsService, NotificationRemindersService, PrismaService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
