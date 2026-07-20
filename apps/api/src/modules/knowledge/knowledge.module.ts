import { Module } from '@nestjs/common';
import { ChunkingService } from './ingestion/chunking.service';
import { EmbeddingCache } from './embeddings/embedding-cache';
import { EmbeddingService } from './embeddings/embedding.service';

@Module({
  providers: [ChunkingService, EmbeddingCache, EmbeddingService],
  exports: [ChunkingService, EmbeddingCache, EmbeddingService],
})
export class KnowledgeModule {}
