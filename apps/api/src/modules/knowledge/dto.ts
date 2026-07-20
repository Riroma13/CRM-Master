import { z } from 'zod';

export const QuerySchema = z.object({
  query: z.string().min(1).max(5000),
  tenantId: z.string().min(1),
  sourceTypes: z.array(z.string()).optional(),
  sourceIds: z.array(z.string()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  topK: z.number().int().min(1).max(50).default(5),
  includeChunks: z.boolean().optional(),
});

export const IndexSchema = z.object({
  tenantId: z.string().min(1),
  sourceType: z.string().min(1),
  sourceId: z.string().min(1),
  content: z.string().min(1).max(10_485_760),
  metadata: z.record(z.unknown()).optional(),
});

export const DeleteSourceParamsSchema = z.object({
  sourceType: z.string().min(1),
  sourceId: z.string().min(1),
});

export const ReindexSchema = z.object({
  tenantId: z.string().min(1),
  content: z.string().min(1).max(10_485_760),
  metadata: z.record(z.unknown()).optional(),
});

export interface SourceResponse {
  sourceType: string;
  sourceId: string;
  tenantId: string;
  chunkCount: number;
  status: string;
  lastIndexedAt: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  queueDepths: {
    ingestion: number;
    reindex: number;
    garbageCollector: number;
  };
  modelLoaded: boolean;
  uptime: number;
  timestamp: string;
}
