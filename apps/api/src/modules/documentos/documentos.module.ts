import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentosController } from './documentos.controller';
import { SharedController } from './shared.controller';
import { DocumentosService } from './documentos.service';
import { StorageService } from './storage.service';
import { ActivityTimelineModule } from '../activity-timeline/activity-timeline.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { PrismaService } from '../../common/prisma.service';

@Module({
  imports: [
    ActivityTimelineModule,
    KnowledgeModule,
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  ],
  controllers: [DocumentosController, SharedController],
  providers: [DocumentosService, StorageService, PrismaService],
  exports: [StorageService],
})
export class DocumentosModule {}
