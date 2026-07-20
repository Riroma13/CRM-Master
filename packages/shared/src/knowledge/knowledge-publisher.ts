import type { SourceType } from './knowledge.types';

export interface KnowledgePublisher {
  indexContent(
    tenantId: string,
    sourceType: SourceType,
    sourceId: string,
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<void>;

  deleteSource(
    tenantId: string,
    sourceType: SourceType,
    sourceId: string,
  ): Promise<void>;
}
