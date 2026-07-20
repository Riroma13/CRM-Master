export type SourceType = 'document' | 'communication' | 'workflow' | 'notification' | 'activity' | 'audit' | 'integration' | 'automation';

export interface KbChunk {
  id: string;
  tenantId: string;
  sourceType: SourceType;
  sourceId: string;
  chunkIndex: number;
  content: string;
  contentHash: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface KbSource {
  sourceType: SourceType;
  sourceId: string;
  tenantId: string;
  chunkCount: number;
  lastIndexedAt: string;
  status: 'indexed' | 'pending' | 'failed';
}

export interface KbQuery {
  query: string;
  tenantId: string;
  sourceTypes?: SourceType[];
  sourceIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  topK?: number;
  includeChunks?: boolean;
}

export interface KbChunkResult {
  chunk: KbChunk;
  score: number;
}

export interface KbCitation {
  sourceType: SourceType;
  sourceId: string;
  content: string;
  relevanceScore: number;
}

export interface KbAnswer {
  query: string;
  answer: string;
  citations: KbCitation[];
  chunks?: KbChunkResult[];
  generatedAt: string;
  model: string;
}
