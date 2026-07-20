import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { LocalStorageProvider } from './storage/local-storage.provider';
import { UploadValidator } from './upload-validator';
import * as crypto from 'crypto';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageProvider,
    private readonly uploadValidator: UploadValidator,
  ) {}

  async upload(
    tenantId: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
    folderId?: string,
    createdBy?: string,
  ) {
    this.uploadValidator.validate(file, fileName, mimeType);

    const documentId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const hash = crypto.createHash('sha256').update(file).digest('hex');

    const storageKey = await this.storage.store(tenantId, documentId, versionId, file, mimeType);

    const doc = await this.prisma.admin.document.create({
      data: {
        documentId,
        tenantId,
        folderId: folderId ?? null,
        name: fileName,
        mimeType,
        sizeBytes: file.length,
        hash,
        status: 'scanning',
        createdBy: createdBy ?? 'system',
        versions: {
          create: {
            versionNumber: 1,
            storageKey,
            hash,
            sizeBytes: file.length,
            mimeType,
            createdBy: createdBy ?? 'system',
          },
        },
      },
      include: { versions: true },
    });

    this.logger.log(`Document ${documentId} created (version 1, status: scanning)`);
    return doc;
  }

  async getDocument(tenantId: string, documentId: string) {
    return this.prisma.admin.document.findFirst({
      where: { documentId, tenantId, isDeleted: false },
      include: { versions: { orderBy: { versionNumber: 'desc' } }, folder: true },
    });
  }

  async softDelete(tenantId: string, documentId: string) {
    const doc = await this.prisma.admin.document.findFirst({ where: { documentId, tenantId } });
    if (!doc) throw new Error('Document not found');

    await this.prisma.admin.document.update({
      where: { id: doc.id },
      data: { isDeleted: true, deletedAt: new Date(), status: 'deleted' },
    });

    await this.prisma.admin.documentTrash.create({
      data: {
        documentId,
        tenantId,
        name: doc.name,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  async listDocuments(tenantId: string, folderId?: string) {
    const where: any = { tenantId, isDeleted: false };
    if (folderId) where.folderId = folderId;
    return this.prisma.admin.document.findMany({
      where,
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
