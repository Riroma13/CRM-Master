import {
  Controller, Post, Get, Delete, Body, Param, Query, HttpCode,
  HttpStatus, Logger, UseGuards, BadRequestException,
} from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { RetrievalEngine } from './retrieval/retrieval-engine';
import { GenerationEngine } from './generation/generation-engine';
import { KnowledgeGuard } from './guards/knowledge.guard';
import { QuerySchema, IndexSchema, DeleteSourceParamsSchema, ReindexSchema } from './dto';
import type { SourceResponse, HealthResponse } from './dto';
import type { KbQuery } from '@shared/knowledge';
import { PrismaService } from '../../common/prisma.service';
import { ZodError } from 'zod';

@Controller('api/v1/knowledge')
@UseGuards(KnowledgeGuard)
export class KnowledgeController {
  private readonly logger = new Logger(KnowledgeController.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly retrievalEngine: RetrievalEngine,
    private readonly generationEngine: GenerationEngine,
    private readonly prisma: PrismaService,
  ) {}

  private parseOrThrow<T>(schema: { parse: (data: unknown) => T }, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.errors);
      }
      throw error;
    }
  }

  @Post('query')
  @HttpCode(HttpStatus.OK)
  async query(@Body() rawBody: unknown) {
    const parsed = this.parseOrThrow(QuerySchema, rawBody);

    const kbQuery: KbQuery = {
      query: parsed.query,
      tenantId: parsed.tenantId,
      sourceTypes: parsed.sourceTypes as any,
      sourceIds: parsed.sourceIds,
      dateFrom: parsed.dateFrom,
      dateTo: parsed.dateTo,
      topK: parsed.topK,
      includeChunks: parsed.includeChunks,
    };

    const chunks = await this.retrievalEngine.search(kbQuery);

    const answer = await this.generationEngine.answer(kbQuery, chunks, parsed.tenantId);

    return answer;
  }

  @Post('index')
  async index(@Body() rawBody: unknown) {
    const parsed = this.parseOrThrow(IndexSchema, rawBody);

    const result = await this.knowledgeService.indexContent(
      parsed.tenantId,
      parsed.sourceType as any,
      parsed.sourceId,
      parsed.content,
      parsed.metadata,
    );

    return result;
  }

  @Delete('sources/:sourceType/:sourceId')
  @HttpCode(HttpStatus.OK)
  async deleteSource(
    @Param() params: unknown,
    @Query('tenantId') tenantId: string,
  ) {
    const parsed = this.parseOrThrow(DeleteSourceParamsSchema, params);

    if (!tenantId) {
      return { error: 'tenantId query parameter is required' };
    }

    return this.knowledgeService.deleteSource(
      tenantId,
      parsed.sourceType as any,
      parsed.sourceId,
    );
  }

  @Post('sources/:sourceType/:sourceId/reindex')
  async reindexSource(
    @Param() params: unknown,
    @Body() rawBody: unknown,
  ) {
    const pathParams = this.parseOrThrow(DeleteSourceParamsSchema, params);
    const body = this.parseOrThrow(ReindexSchema, rawBody);

    const result = await this.knowledgeService.reindexSource(
      body.tenantId,
      pathParams.sourceType as any,
      pathParams.sourceId,
      body.content,
      body.metadata,
    );

    return result;
  }

  @Get('sources')
  async listSources(@Query('tenantId') tenantId: string) {
    if (!tenantId) {
      return { data: [], error: 'tenantId query parameter is required' };
    }

    const sources = await this.prisma.admin.kbSourceIndex.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
    });

    const mapped: SourceResponse[] = sources.map((s: any) => ({
      sourceType: s.sourceType,
      sourceId: s.sourceId,
      tenantId: s.tenantId,
      chunkCount: s.chunkCount,
      status: s.status,
      lastIndexedAt: s.lastIndexedAt?.toISOString() ?? null,
      error: s.error ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return { data: mapped };
  }

  @Get('health')
  async health(): Promise<HealthResponse> {
    const prisma = this.prisma.admin;

    const [ingestionCount, reindexCount, gcCount] = await Promise.all([
      prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::bigint AS count FROM "BullMQ_jobs" WHERE queue = 'kb:ingestion' AND status = 'waiting'`,
      ).catch(() => [{ count: BigInt(0) }]),
      prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::bigint AS count FROM "BullMQ_jobs" WHERE queue = 'kb:reindex' AND status = 'waiting'`,
      ).catch(() => [{ count: BigInt(0) }]),
      prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::bigint AS count FROM "BullMQ_jobs" WHERE queue = 'kb:garbage-collector' AND status = 'waiting'`,
      ).catch(() => [{ count: BigInt(0) }]),
    ]);

    return {
      status: 'healthy',
      queueDepths: {
        ingestion: Number((ingestionCount as any[])[0]?.count ?? 0),
        reindex: Number((reindexCount as any[])[0]?.count ?? 0),
        garbageCollector: Number((gcCount as any[])[0]?.count ?? 0),
      },
      modelLoaded: true,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  }
}
