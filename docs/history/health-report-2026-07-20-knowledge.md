# Health Report: AI Knowledge Base (SPEC-0020)

**Date:** 2026-07-20
**Component:** KnowledgeModule
**Status:** **HEALTHY**

---

## Summary

Knowledge Module implements the RAG pipeline end-to-end. Indexes content via
BullMQ (kb:ingestion, kb:embedding), stores embeddings in pgvector with HNSW
index, retrieves via hybrid scoring, and generates answers via SPEC-0011's
AiProvider. Document Platform (SPEC-0013) is adopted as P0.

---

## Module Health

| Dimension | Status | Details |
|-----------|--------|---------|
| Build | ✅ | `pnpm turbo build --filter=api` passes |
| Tests | ✅ | 103/103 (13 suites) |
| Lint | ⚠️ | Pre-existing ESLint config missing in apps/api |
| Schema | ✅ | 3 models: KbChunk (pgvector), KbSourceIndex, KbQueryLog |
| Migration | ✅ | pgvector extension + HNSW index |
| Module wiring | ✅ | KnowledgeModule (Global) in CoreModule |
| Document Platform (P0) | ✅ | indexContent on create/update, deleteSource on softDelete |

---

## Risk Assessment

| Risk | Severity | Status | Mitigation |
|------|----------|--------|------------|
| `@xenova/transformers` memory under load | Low | ✅ | Worker_threads isolates heap. Batching 32 chunks. |
| HNSW precision for complex queries | Low | ✅ | Hybrid scoring (vector + keyword). Tenant WHERE filtering. |
| Chunking breaks semantic context | Low | ✅ | 20% overlap. 256 token chunks. Metadata context. |
| LLM hallucination with irrelevant chunks | Medium | ✅ | Strict prompt: "If context doesn't contain answer, say so." Citation validation. |
| pgvector extension dependency | Medium | ✅ | ADR-0017 documented. `CREATE EXTENSION IF NOT EXISTS vector`. |
| Orphan chunks after source deletion | Low | ✅ | Garbage collector (daily cron). deleteSource() in Document Platform. |

---

## Coverage

| Area | Status | Evidence |
|------|--------|----------|
| Unit — Chunking | ✅ | Recursive split, boundary cases, overlap |
| Unit — Embedding | ✅ | Cache hit/miss, worker isolation |
| Unit — Retrieval | ✅ | HNSW KNN, tenant filter, hybrid scoring |
| Unit — Generation | ✅ | Prompt build, citation regex, sourceId validation |
| Unit — Citation extractor | ✅ | Multiple citations, malformed, missing sourceId |
| Unit — Garbage collector | ✅ | Orphan detection, batch delete |
| Integration — API | ✅ | Super test full flow (query, index, reindex, delete) |
| Doorbell — Cross-tenant isolation | ✅ | Tenant A cannot query Tenant B |
| Doorbell — Source isolation | ✅ | Tenant A cannot reindex/delete Tenant B |

---

## Recommendations

1. **P1 — Communication Platform adoption**: `KnowledgePublisher` in SPEC-0012 (emails, templates)
2. **P1 — Workflow Engine adoption**: `KnowledgePublisher` in SPEC-0015 (executions, logs, rules)
3. **P2 — PDF content extraction**: Index actual document text instead of metadata-only
4. **P3 — Query log analytics**: Dashboard for KB usage, popular queries, failure rate
5. **P3 — Fine-tuning evaluation**: Assess if all-MiniLM-L6-v2 precision is sufficient for production
6. **P4 — ESLint config**: Add config to apps/api to prevent pre-existing lint warnings

---

## Metrics Snapshot

| Metric | Value |
|--------|-------|
| Source files | 29 |
| Test suites | 13 |
| Tests | 103 |
| Test pass rate | 100% |
| Build | ✅ |
| P0 adoption | Document Platform (SPEC-0013) |
| Queues | kb:ingestion, kb:embedding, kb:reindex, kb:garbage-collector |

---

## Document Platform Integration

| Operation | Method | KB Effect |
|-----------|--------|-----------|
| `create()` | `KnowledgeService.indexContent()` | Indexes filename + description + category as text content |
| `update()` | `KnowledgeService.indexContent()` | Re-indexes updated content |
| `softDelete()` | `KnowledgeService.deleteSource()` | Removes all chunks for that document |
| Error handling | try-catch with warn log | Non-blocking — KB failure doesn't break document operations |
