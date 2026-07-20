# SPEC-0020 — AI Knowledge Base (RAG)

## Summary

AI Knowledge Base implements Retrieval-Augmented Generation (RAG) over the
CRM-Master platform. It indexes documents and other content into vector
embeddings using `@xenova/transformers` (ONNX Runtime, model
`Xenova/all-MiniLM-L6-v2`, 384-dim). Provides a natural language query API
with pgvector HNSW KNN search, hybrid scoring (vector + keyword), and
LLM-generated answers with source citations via SPEC-0011's AiProvider.

**20 archivos planificados | 103 tests (13 suites) | 23 tareas | 6 PRs stacked-to-main**

## Features

- **RAG Pipeline**: Content → Chunking (256 tokens, 20% overlap) → Embedding (ONNX, worker_threads) → pgvector (HNSW) → Retrieval → LLM Generation
- **Chunking**: Recursive character splitter respecting paragraph/sentence boundaries. 256 token chunks with 20% overlap.
- **Embedding**: `@xenova/transformers` via worker_threads. LRU cache for repeated contentHash. Batching up to 32 chunks.
- **Vector Store**: pgvector on PostgreSQL with HNSW index. Idempotent UPSERT by (tenantId, sourceType, sourceId, chunkIndex).
- **Retrieval Engine**: HNSW KNN search with WHERE tenantId scoping. Hybrid scorer combining vector cosine similarity + keyword BM25.
- **Generation Engine**: Prompt building with retrieved chunks + user query. Calls AiProvider.generate() (SPEC-0011). Post-processing citation extraction with sourceId validation.
- **Ingestion Pipeline**: BullMQ queues `kb:ingestion`, `kb:embedding` (concurrency 1), `kb:reindex`. Garbage collector for orphan chunks (daily cron).
- **Knowledge API**: Query in natural language, index content, reindex/delete sources, health check.
- **Document Platform Adoption (P0)**: Documents indexed on create/update, removed on delete.
- **Tenant Isolation**: KnowledgeGuard on all endpoints. All queries scoped by tenantId.

## Architecture

- **3 new Prisma models**: KbChunk (pgvector), KbSourceIndex, KbQueryLog
- **Shared contracts**: KbChunk, KbSource, KbQuery, KbAnswer, KbCitation, KnowledgePublisher
- **BullMQ**: Queues `kb:ingestion`, `kb:embedding`, `kb:reindex`, `kb:garbage-collector`
- **pgvector**: `CREATE EXTENSION IF NOT EXISTS vector`. HNSW index on kb_chunks.embedding.
- **Module**: KnowledgeModule in apps/api/src/modules/knowledge/

### Implementation (6 stacked PRs)

- PR-1 — Schema migration + 3 Prisma models + shared contracts + pgvector extension
- PR-2 — Chunking service (recursive splitter) + Embedding service (ONNX, worker_threads) + LRU cache
- PR-3 — BullMQ ingestion pipeline (kb:ingestion worker) + Garbage collector + UPSERT idempotency
- PR-4 — Retrieval Engine (HNSW + hybrid) + Generation Engine (AiProvider + citation extractor)
- PR-5 — API controller + Guards + Tests + Module wiring in CoreModule
- PR-6 — Document Platform adoption (KnowledgeService injected in DocumentosService) + Verify + Archive

## Verification

| Metric | Value |
|--------|-------|
| Working Set Accuracy | ~100% |
| Verify Iterations | 2 (1 minor TS fix) |
| Critical Discoveries | 0 |
| Major Discoveries | 0 |
| Minor Discoveries | 1 (parentPort null in worker) |
| Build | ✅ |
| Tests | 103/103 (13 suites) |
| Architecture Review | PASS |

## Documentation

- design.md
- tasks.md
- architecture-review.md
- verify-report.md
- archive-report.md
- pr-description.md

## Status

✅ Ready for merge — PR-6 (final)

---

## Related Artifacts

- [design.md](../../../../openspec/changes/SPEC-0020-ai-knowledge-base/design.md)
- [tasks.md](../../../../openspec/changes/SPEC-0020-ai-knowledge-base/tasks.md)
- [architecture-review.md](../../../../openspec/changes/SPEC-0020-ai-knowledge-base/architecture-review.md)
- [verify-report.md](../../../../openspec/changes/SPEC-0020-ai-knowledge-base/verify-report.md)
- [archive-report.md](archive-report.md)
- [pr-description.md](pr-description.md)

---

## Navigation

← [archive-report.md](archive-report.md)
