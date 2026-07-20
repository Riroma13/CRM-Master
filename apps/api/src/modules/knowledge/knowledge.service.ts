import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ChunkingService } from './ingestion/chunking.service';
import { EmbeddingService } from './embeddings/embedding.service';
import type { SourceType } from '@shared/knowledge';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chunkingService: ChunkingService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async indexContent(
    tenantId: string,
    sourceType: SourceType,
    sourceId: string,
    content: string,
    metadata?: Record<string, unknown>,
  ) {
    const prisma = this.prisma.admin;
    const chunks = await this.chunkingService.chunk(content);

    let chunkCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const contentHash = this.chunkingService.generateContentHash(chunkText);

      const existing = await prisma.kbChunk.findFirst({
        where: { tenantId, sourceType, sourceId, chunkIndex: i },
        select: { id: true, contentHash: true },
      });

      if (existing && existing.contentHash === contentHash) {
        chunkCount++;
        continue;
      }

      const embedding = await this.embeddingService.generateEmbedding(chunkText);
      const vecStr = `[${embedding.join(',')}]`;

      await prisma.$executeRawUnsafe(
        `INSERT INTO kb_chunks (id, tenant_id, source_type, source_id, chunk_index, content, content_hash, metadata, embedding, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7::jsonb, $8::vector, NOW())
         ON CONFLICT (tenant_id, source_type, source_id, chunk_index)
         DO UPDATE SET content = $5, content_hash = $6, metadata = $7::jsonb, embedding = $8::vector, updated_at = NOW()`,
        tenantId,
        sourceType,
        sourceId,
        i,
        chunkText,
        contentHash,
        JSON.stringify(metadata ?? {}),
        vecStr,
      );

      chunkCount++;
    }

    await prisma.kbSourceIndex.upsert({
      where: {
        tenantId_sourceType_sourceId: { tenantId, sourceType, sourceId },
      },
      create: {
        tenantId,
        sourceType,
        sourceId,
        chunkCount,
        status: 'indexed',
        lastIndexedAt: new Date(),
      },
      update: {
        chunkCount,
        status: 'indexed',
        lastIndexedAt: new Date(),
      },
    });

    this.logger.log(`Indexed ${chunkCount} chunks for ${sourceType}:${sourceId}`);
    return { chunksCreated: chunkCount, sourceId, sourceType };
  }

  async deleteSource(
    tenantId: string,
    sourceType: SourceType,
    sourceId: string,
  ) {
    const prisma = this.prisma.admin;

    const deleted = await prisma.kbChunk.deleteMany({
      where: { tenantId, sourceType, sourceId },
    });

    await prisma.kbSourceIndex.deleteMany({
      where: { tenantId, sourceType, sourceId },
    });

    this.logger.log(`Deleted ${deleted.count} chunks for ${sourceType}:${sourceId}`);
    return { deletedChunks: deleted.count };
  }

  async reindexSource(
    tenantId: string,
    sourceType: SourceType,
    sourceId: string,
    content: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.deleteSource(tenantId, sourceType, sourceId);
    return this.indexContent(tenantId, sourceType, sourceId, content, metadata);
  }
}
