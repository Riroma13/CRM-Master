import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { DocumentController } from './document.controller';
import { FolderController } from './folder.controller';
import { DocumentService } from './document.service';
import { FolderService } from './folder.service';
import { LocalStorageProvider } from './storage/local-storage.provider';
import { S3StorageProvider } from './storage/s3-storage.provider';
import { UploadValidator } from './upload-validator';
import { DocumentPermissionGuard } from './guards/document-permission.guard';
import { PreviewPipeline } from './preview/preview-pipeline';
import { PreviewStorage } from './preview/preview-storage';
import { ClamAvScanner } from './virus-scanning/clamav-scanner';
import { MockScanner } from './virus-scanning/mock-scanner';
import { QuarantineService } from './virus-scanning/quarantine-service';
import { QuarantineNotifier } from './virus-scanning/quarantine-notifier';
import { RetentionService } from './retention/retention-service';
import { PermissionInheritance } from './permissions/permission-inheritance';
import { DocumentEventHandlers } from './document.event-handlers';
import { DocumentAttachmentResolver } from './document-attachment-resolver';

@Module({
  controllers: [DocumentController, FolderController],
  providers: [
    PrismaService,
    DocumentService,
    FolderService,
    LocalStorageProvider,
    S3StorageProvider,
    UploadValidator,
    DocumentPermissionGuard,
    PreviewPipeline,
    PreviewStorage,
    ClamAvScanner,
    MockScanner,
    QuarantineService,
    QuarantineNotifier,
    RetentionService,
    PermissionInheritance,
    DocumentEventHandlers,
    DocumentAttachmentResolver,
  ],
  exports: [
    DocumentService,
    FolderService,
    LocalStorageProvider,
    DocumentAttachmentResolver,
  ],
})
export class DocumentEngineModule {}
