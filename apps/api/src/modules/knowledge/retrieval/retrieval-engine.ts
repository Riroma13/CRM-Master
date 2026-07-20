import { Injectable } from '@nestjs/common';
import type {
  KbQuery,
  KbChunk,
  KbChunkResult,
  SourceType,
} from '@shared/knowledge';
import { PrismaService } from '../../../common/prisma.service';
import { EmbeddingService } from '../embeddings/embedding.service';
import { HybridScorer } from './hybrid-scorer';

interface RawChunkRow {
  id: string;
  tenant_id: string;
  source_type: SourceType;
  source_id: string;
  chunk_index: number;
  content: string;
  content_hash: string;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  distance: number;
}

@Injectable()
export class RetrievalEngine {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async search(query: KbQuery): Promise<KbChunkResult[]> {
    const queryEmbedding = await this.embeddingService.generateEmbedding(
      query.query,
    );
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    const sql = this.buildKnnQuery(query);
    const params: unknown[] = [query.tenantId, embeddingStr, query.topK ?? 5];
    const paramIndexOffset = 3;

    if (query.sourceTypes?.length) {
      params.push(...query.sourceTypes);
    }
    if (query.sourceIds?.length) {
      params.push(...query.sourceIds);
    }
    if (query.dateFrom) {
      params.push(query.dateFrom);
    }
    if (query.dateTo) {
      params.push(query.dateTo);
    }

    const rows = (await this.prisma.admin.$queryRawUnsafe(
      sql,
      ...params,
    )) as RawChunkRow[];

    return rows.map((row) => ({
      chunk: this.mapToKbChunk(row),
      score: 1 - row.distance,
    }));
  }

  async hybridSearch(query: KbQuery): Promise<KbChunkResult[]> {
    const queryEmbedding = await this.embeddingService.generateEmbedding(
      query.query,
    );
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    const sql = this.buildHybridQuery(query);
    const params: unknown[] = [
      query.tenantId,
      embeddingStr,
      query.query,
      query.topK ?? 5,
    ];

    const rows = (await this.prisma.admin.$queryRawUnsafe(
      sql,
      ...params,
    )) as RawChunkRow[];

    const scorer = new HybridScorer();
    return rows.map((row) => ({
      chunk: this.mapToKbChunk(row),
      score: scorer.combine(1 - row.distance, (row as any).keyword_score ?? 0),
    }));
  }

  private buildKnnQuery(query: KbQuery): string {
    let sql = `
      SELECT *, embedding <=> $2::vector AS distance
      FROM kb_chunks
      WHERE tenant_id = $1
    `;

    if (query.sourceTypes?.length) {
      const placeholders = query.sourceTypes
        .map((_, i) => `$${i + 3}`)
        .join(', ');
      sql += ` AND source_type IN (${placeholders})`;
    }

    if (query.sourceIds?.length) {
      const startIdx = 3 + (query.sourceTypes?.length ?? 0);
      const placeholders = query.sourceIds
        .map((_, i) => `$${startIdx + i}`)
        .join(', ');
      sql += ` AND source_id IN (${placeholders})`;
    }

    if (query.dateFrom) {
      sql += ` AND created_at >= $${this.nextParamIndex(query)}`;
    }

    if (query.dateTo) {
      sql += ` AND created_at <= $${this.nextParamIndex(query) + (query.dateFrom ? 1 : 0)}`;
    }

    const topK = query.topK ?? 5;
    sql += ` ORDER BY distance LIMIT ${topK}`;
    return sql;
  }

  private buildHybridQuery(query: KbQuery): string {
    const topK = query.topK ?? 5;
    let sql = `
      SELECT *,
             embedding <=> $2::vector AS distance,
             ts_rank(to_tsvector('spanish', content), plainto_tsquery('spanish', $3)) AS keyword_score
      FROM kb_chunks
      WHERE tenant_id = $1
    `;

    if (query.sourceTypes?.length) {
      const placeholders = query.sourceTypes
        .map((_, i) => `$${i + 4}`)
        .join(', ');
      sql += ` AND source_type IN (${placeholders})`;
    }

    if (query.sourceIds?.length) {
      const startIdx = 4 + (query.sourceTypes?.length ?? 0);
      const placeholders = query.sourceIds
        .map((_, i) => `$${startIdx + i}`)
        .join(', ');
      sql += ` AND source_id IN (${placeholders})`;
    }

    sql += ` ORDER BY distance LIMIT ${topK}`;
    return sql;
  }

  private nextParamIndex(query: KbQuery): number {
    let idx = 3;
    if (query.sourceTypes?.length) idx += query.sourceTypes.length;
    if (query.sourceIds?.length) idx += query.sourceIds.length;
    return idx;
  }

  private mapToKbChunk(row: RawChunkRow): KbChunk {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      chunkIndex: row.chunk_index,
      content: row.content,
      contentHash: row.content_hash,
      metadata: row.metadata ?? {},
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
