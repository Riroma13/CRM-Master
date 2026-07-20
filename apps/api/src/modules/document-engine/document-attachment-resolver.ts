import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { LocalStorageProvider } from './storage/local-storage.provider';

@Injectable()
export class DocumentAttachmentResolver {
  private readonly logger = new Logger(DocumentAttachmentResolver.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageProvider,
  ) {}

  async resolve(documentId: string, tenantId: string): Promise<{ url: string; fileName: string; mimeType: string } | null> {
    const doc = await this.prisma.admin.document.findFirst({
      where: { documentId, tenantId, isDeleted: false },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });
    if (!doc || doc.versions.length === 0) return null;

    const latest = doc.versions[0];
    const url = await this.storage.getSignedUrl(latest.storageKey, 'READ');
    return { url, fileName: doc.name, mimeType: doc.mimeType };
  }
}
