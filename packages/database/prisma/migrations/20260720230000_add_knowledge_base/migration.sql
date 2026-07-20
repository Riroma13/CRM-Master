-- CreateExtension: pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable: kb_chunks
CREATE TABLE "kb_chunks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "embedding" vector(384),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "kb_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: kb_source_indexes
CREATE TABLE "kb_source_indexes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "chunk_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "last_indexed_at" TIMESTAMPTZ,
    "error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "kb_source_indexes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: kb_query_logs
CREATE TABLE "kb_query_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "source_types" TEXT[],
    "top_k" INTEGER NOT NULL DEFAULT 5,
    "result_count" INTEGER NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "feedback" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kb_query_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "kb_chunks_tenant_id_source_type_source_id_chunk_index_key" ON "kb_chunks"("tenant_id", "source_type", "source_id", "chunk_index");
CREATE INDEX "kb_chunks_tenant_id_source_type_source_id_idx" ON "kb_chunks"("tenant_id", "source_type", "source_id");
CREATE INDEX "kb_chunks_tenant_id_content_hash_idx" ON "kb_chunks"("tenant_id", "content_hash");
CREATE INDEX "kb_chunks_embedding_idx" ON "kb_chunks" USING hnsw ("embedding" vector_cosine_ops);

CREATE UNIQUE INDEX "kb_source_indexes_tenant_id_source_type_source_id_key" ON "kb_source_indexes"("tenant_id", "source_type", "source_id");

CREATE INDEX "kb_query_logs_tenant_id_created_at_idx" ON "kb_query_logs"("tenant_id", "created_at" DESC);

-- Comments
COMMENT ON COLUMN "kb_chunks"."embedding" IS '384-dim vector from all-MiniLM-L6-v2 via @xenova/transformers';
