import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { NotificationRemindersService } from './notification-reminders.service';
import { NotificationsConfigController } from './notifications-config.controller';
import { ActivityTimelineModule } from '../activity-timeline/activity-timeline.module';
import { PrismaService } from '../../common/prisma.service';

@Module({
  imports: [ScheduleModule.forRoot(), ActivityTimelineModule],
  controllers: [NotificationsConfigController],
  providers: [NotificationsService, NotificationRemindersService, PrismaService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
