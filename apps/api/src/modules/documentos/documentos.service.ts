import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import { ActivityTimelineService } from '../activity-timeline/activity-timeline.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import type { DocumentDto, ShareLinkDto } from './dto';
import type { SourceType } from '@shared/knowledge';

@Injectable()
export class DocumentosService {
  private readonly logger = new Logger(DocumentosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityTimeline: ActivityTimelineService,
    private readonly knowledgeService: KnowledgeService,
  ) {}

  async create(
    tenantId: string,
    data: {
      filename: string;
      storageKey: string;
      mimeType: string;
      sizeBytes: number;
      category: string;
      description?: string;
      clienteId?: string;
      uploadedBy: string;
    },
  ): Promise<DocumentDto> {
    const doc = await this.prisma.forTenant(tenantId).documento.create({
      data: {
        filename: data.filename,
        storageKey: data.storageKey,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        category: data.category,
        description: data.description,
        clienteId: data.clienteId,
        uploadedBy: data.uploadedBy,
      },
    });

    try {
      await this.activityTimeline.publish({
        eventType: 'documento.generado',
        tenantId,
        clienteId: data.clienteId,
        entityType: 'documento',
        entityId: doc.id,
        actor: data.uploadedBy,
        sourceModule: 'documentos',
        severity: 'info',
        category: 'crm',
        payload: { filename: doc.filename, category: doc.category },
      });
    } catch (e) {
      this.logger.warn(`Failed to publish documento.generado: ${(e as Error).message}`);
    }

    try {
      const content = `${doc.filename} ${doc.description ?? ''} ${doc.category}`;
      await this.knowledgeService.indexContent(
        tenantId,
        'document' as SourceType,
        doc.id,
        content,
        { filename: doc.filename, category: doc.category, mimeType: doc.mimeType },
      );
    } catch (e) {
      this.logger.warn(`Failed to index document in KB: ${(e as Error).message}`);
    }

    return this.toDocumentDto(doc);
  }

  async findAll(tenantId: string, clienteId?: string): Promise<DocumentDto[]> {
    const where: any = { isDeleted: false };
    if (clienteId) where.clienteId = clienteId;
    const docs = await this.prisma.forTenant(tenantId).documento.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((d: any) => this.toDocumentDto(d));
  }

  async findOne(tenantId: string, id: string): Promise<DocumentDto> {
    const doc = await this.prisma.forTenant(tenantId).documento.findFirst({
      where: { id, isDeleted: false },
      include: { shares: true },
    });

    if (!doc) {
      throw new NotFoundException('Documento no encontrado');
    }

    return this.toDocumentDto(doc, (doc as any).shares || []);
  }

  async update(
    tenantId: string,
    id: string,
    data: {
      category?: string;
      description?: string;
      clienteId?: string;
    },
  ): Promise<DocumentDto> {
    const doc = await this.prisma.forTenant(tenantId).documento.update({
      where: { id },
      data,
    });

    try {
      const content = `${doc.filename} ${data.description ?? doc.description ?? ''} ${data.category ?? doc.category}`;
      await this.knowledgeService.indexContent(
        tenantId,
        'document' as SourceType,
        doc.id,
        content,
        { filename: doc.filename, category: doc.category, mimeType: doc.mimeType },
      );
    } catch (e) {
      this.logger.warn(`Failed to index updated document in KB: ${(e as Error).message}`);
    }

    return this.toDocumentDto(doc);
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    await this.prisma.forTenant(tenantId).documento.update({
      where: { id },
      data: { isDeleted: true },
    });

    try {
      await this.knowledgeService.deleteSource(tenantId, 'document' as SourceType, id);
    } catch (e) {
      this.logger.warn(`Failed to delete document from KB: ${(e as Error).message}`);
    }
  }

  async createShareLink(
    tenantId: string,
    documentoId: string,
    options: { expiresIn: string; maxDownloads?: number },
    createdBy: string,
  ): Promise<ShareLinkDto> {
    // Verify document exists and belongs to tenant
    const doc = await this.prisma.forTenant(tenantId).documento.findFirst({
      where: { id: documentoId, isDeleted: false },
    });

    if (!doc) {
      throw new NotFoundException('Documento no encontrado');
    }

    // Calculate expiresAt from expiresIn string (e.g., "7d", "24h", "60m", "30s")
    const expiresAt = this.parseExpiresIn(options.expiresIn);

    // Generate unique token with prefix and collision handling
    const token = await this.generateUniqueToken();

    const shareLink = await this.prisma.admin.shareLink.create({
      data: {
        documentoId,
        token,
        expiresAt,
        maxDownloads: options.maxDownloads ?? null,
        createdBy,
      },
    });

    return this.toShareLinkDto(shareLink);
  }

  private async generateUniqueToken(): Promise<string> {
    const prefix = 'shr_';
    for (let attempt = 0; attempt < 5; attempt++) {
      const token = prefix + randomBytes(32).toString('hex');
      const existing = await this.prisma.admin.shareLink.findUnique({
        where: { token },
      });
      if (!existing) return token;
    }
    throw new ConflictException(
      'No se pudo generar un token único. Intente de nuevo.',
    );
  }

  private parseExpiresIn(expiresIn: string): Date {
    const match = expiresIn.match(/^(\d+)([dhms])$/);
    if (!match) {
      throw new BadRequestException(
        'Formato inválido. Use: 7d, 24h, 60m, 30s',
      );
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const now = new Date();

    switch (unit) {
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000);
      case 's':
        return new Date(now.getTime() + value * 1000);
      default:
        throw new BadRequestException('Unidad de tiempo no soportada');
    }
  }

  private toDocumentDto(doc: any, shares?: any[]): DocumentDto {
    return {
      id: doc.id,
      filename: doc.filename,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      category: doc.category,
      description: doc.description ?? undefined,
      storageKey: doc.storageKey,
      createdAt: doc.createdAt.toISOString(),
      shareLinks: shares
        ? shares.map((s: any) => this.toShareLinkDto(s))
        : undefined,
    };
  }

  private toShareLinkDto(link: any): ShareLinkDto {
    return {
      id: link.id,
      token: link.token,
      url: `/api/v1/shared/${link.token}`,
      expiresAt: link.expiresAt?.toISOString(),
      maxDownloads: link.maxDownloads ?? undefined,
      downloadCount: link.downloadCount,
      createdAt: link.createdAt.toISOString(),
    };
  }
}
