import { Module } from '@nestjs/common';
import { AdminToolsController } from './admin-tools.controller';
import { AnnouncementsService } from './announcements.service';
import { BackupService } from './backup.service';
import { GdprService } from './gdpr.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [AdminToolsController],
  providers: [AnnouncementsService, BackupService, GdprService, PrismaService],
})
export class AdminToolsModule {}
