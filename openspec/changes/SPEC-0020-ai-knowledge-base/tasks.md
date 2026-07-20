# Tasks: SPEC-0020 — AI Knowledge Base (RAG)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| 400-line risk | High |
| Changed lines | ~1600-1800 |
| Chained PRs | Yes |
| Split | PR 1 → PR 6 |
| Strategy | auto-chain → stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Work Units

| Unit | Goal | PR | Test command |
|------|------|----|-------------|
| 1 | Schema + shared types | PR 1 | `prisma validate` |
| 2 | Chunking + Embedding | PR 2 | `test knowledge-chunking` |
| 3 | Ingestion Pipeline | PR 3 | `test knowledge-ingestion` |
| 4 | Retrieval + Generation | PR 4 | `test knowledge-retrieval` |
| 5 | API + Guards + Tests | PR 5 | `test knowledge-api` |
| 6 | Doc Platform Adoption | PR 6 | `test knowledge-docs` |

## Phase 1: Infrastructure + Schema

- [ ] 1.1 Create migration `packages/database/migrations/add_pgvector_extension.sql`
- [ ] 1.2 Add `KbChunk`, `KbSourceIndex`, `KbQueryLog` to schema.prisma
- [ ] 1.3 Run migration: `pnpm --filter database prisma migrate dev`
- [ ] 1.4 Create `packages/shared/src/knowledge/knowledge.types.ts` (KbChunk, KbSource, KbQuery, KbAnswer, KbCitation)
- [ ] 1.5 Create `packages/shared/src/knowledge/knowledge-publisher.ts` (KnowledgePublisher interface)
- [ ] 1.6 Create `packages/shared/src/knowledge/index.ts`

All paths under `apps/api/src/modules/knowledge/` unless noted.

## Phase 2: Chunking + Embedding

- [ ] 2.1 RED: Chunking tests (recursive split, 256 tokens, 20% overlap)
- [ ] 2.2 Create `ingestion/chunking.service.ts` (recursive splitter)
- [ ] 2.3 RED: Embedding tests (cache hit/miss, worker isolation)
- [ ] 2.4 Create `embeddings/embedding.service.ts` (@xenova/transformers, worker_threads)
- [ ] 2.5 Create `embeddings/embedding-cache.ts` (LRU)

## Phase 3: Ingestion Pipeline  ✅

- [x] 3.1 Create `knowledge.service.ts` (index/reindex/delete orchestration)
- [x] 3.2 Create `ingestion/ingestion.service.ts` (BullMQ: kb:ingestion, kb:reindex)
- [x] 3.3 RED: UPSERT idempotency tests (upsert.spec.ts — ON CONFLICT DO UPDATE)
- [x] 3.4 Create `ingestion/garbage-collector.service.ts` (daily orphan cleanup)

## Phase 4: Retrieval + Generation

- [ ] 4.1 RED: Retrieval tests (HNSW KNN, tenant WHERE, hybrid scoring)
- [ ] 4.2 Create `retrieval/retrieval-engine.ts` (HNSW + tenant filter)
- [ ] 4.3 Create `retrieval/hybrid-scorer.ts` (vector + keyword)
- [ ] 4.4 RED: Generation tests (prompt build, citation regex, sourceId validation)
- [ ] 4.5 Create `generation/generation-engine.ts` (prompt + AiProvider.generate)
- [ ] 4.6 Create `generation/prompt-templates.ts`
- [ ] 4.7 Create `generation/citation-extractor.ts` (regex + validation)

## Phase 5: API + Guards + Isolation

- [ ] 5.1 Create `knowledge.controller.ts` (query, index, reindex, delete)
- [ ] 5.2 Create `guards/knowledge.guard.ts` (tenant isolation)
- [ ] 5.3 Create `knowledge.module.ts`
- [ ] 5.4 Wire into `core.module.ts`
- [ ] 5.5 RED: Cross-tenant isolation (Tenant A cannot see Tenant B)
- [ ] 5.6 RED: Source isolation (Tenant A cannot reindex/delete Tenant B)
- [ ] 5.7 Write integration tests (full supertest flow)

## Phase 6: Module Adoption (P0: Documents)

- [ ] 6.1 Implement `KnowledgePublisher.indexContent()` in Document Platform (SPEC-0013)
- [ ] 6.2 Implement `KnowledgePublisher.deleteSource()` in Document Platform
- [ ] 6.3 E2E: Create doc → KB indexed → query returns content
