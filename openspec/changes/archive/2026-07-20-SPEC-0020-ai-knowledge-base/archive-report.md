# Archive Report: SPEC-0020 — AI Knowledge Base (RAG)

**Date:** 2026-07-20
**Mode:** openspec
**Status:** **ARCHIVED**

---

## Executive Summary

AI Knowledge Base implements Retrieval-Augmented Generation (RAG) over the
CRM-Master platform content. It indexes documents, communications, and other
content into vector embeddings using `@xenova/transformers` (ONNX Runtime,
model `Xenova/all-MiniLM-L6-v2`, 384-dim). Provides a natural language query
API that retrieves relevant chunks via pgvector HNSW KNN search + hybrid
scoring, and passes them to an LLM (via SPEC-0011's AiProvider) to generate
contextualized answers with source citations.

**3 new Prisma models (KbChunk, KbSourceIndex, KbQueryLog) | 29 source files across shared contracts, module, ingestion, chunking, embeddings, retrieval, generation, guards**
**103 tests (13 suites) | 23 tasks completed across 6 stacked PRs**

---

## Specs Synced

No delta specs to sync — the change folder contained design.md, tasks.md,
architecture-review.md, and verify-report.md directly. No `specs/` subdirectory
with delta specs was present.

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| pgvector (PostgreSQL) on same DB as platform | No new infra dependency. ADR-0017 documents extension requirement. |
| ONNX Runtime via `@xenova/transformers` | No sidecar or child_process. Worker_threads for non-blocking. Model ~23MB. |
| `Xenova/all-MiniLM-L6-v2` (384-dim) | Free, fast, multilingual (ES/EN), runs in-process without API keys. |
| Recursive character splitter (256 tokens, 20% overlap) | Respects paragraph/sentence boundaries. Overlap preserves context. |
| SPEC-0011's AiProvider for LLM | Reuses existing abstraction. Tenant configures LLM in AI Automation Hub. |
| HNSW + full-text hybrid search | HNSW avoids centroid bias (vs IVFFlat). WHERE clause tenant filtering works. |
| Async ingestion via BullMQ | Same infra as rest of platform. Queues: kb:ingestion, kb:embedding (concurrency 1), kb:reindex. |
| Embedding LRU cache in-memory | Repeated contentHash skips embedding recomputation. Result cache with 60s TTL. |
| UPSERT ON CONFLICT for idempotency | Retry-safe ingestion. contentHash dedup prevents redundant embedding. |

---

## Implementation Summary

| PR | Scope | Tasks | Status |
|----|-------|-------|--------|
| PR-1 | Schema + shared types + pgvector migration | Phase 1 | ✅ |
| PR-2 | Chunking + Embedding (ONNX, worker_threads) | Phase 2 | ✅ |
| PR-3 | Ingestion Pipeline (BullMQ) + Garbage Collector | Phase 3 | ✅ |
| PR-4 | Retrieval Engine (HNSW + hybrid) + Generation Engine (AiProvider) | Phase 4 | ✅ |
| PR-5 | API + Guards + Tests + Module wiring | Phase 5 | ✅ |
| PR-6 | Document Platform adoption (P0) + Verify + Archive | Phase 6 | ✅ |

**Total: 23 tasks complete across 6 stacked PRs**

---

## Working Set Validation

| # | File | Planned | Actual | Match |
|---|------|---------|--------|-------|
| 1 | `packages/database/prisma/schema.prisma` | Modify | Modified — KbChunk, KbSourceIndex, KbQueryLog | ✅ |
| 2 | `packages/database/migrations/add_pgvector_extension.sql` | Create | Created | ✅ |
| 3 | `packages/shared/src/knowledge/knowledge.types.ts` | Create | Created | ✅ |
| 4 | `packages/shared/src/knowledge/knowledge-publisher.ts` | Create | Created | ✅ |
| 5 | `packages/shared/src/knowledge/index.ts` | Create | Created | ✅ |
| 6 | `apps/api/src/modules/knowledge/knowledge.module.ts` | Create | Created | ✅ |
| 7 | `apps/api/src/modules/knowledge/knowledge.service.ts` | Create | Created | ✅ |
| 8 | `apps/api/src/modules/knowledge/knowledge.controller.ts` | Create | Created | ✅ |
| 9 | `apps/api/src/modules/knowledge/ingestion/ingestion.service.ts` | Create | Created | ✅ |
| 10 | `apps/api/src/modules/knowledge/ingestion/chunking.service.ts` | Create | Created | ✅ |
| 11 | `apps/api/src/modules/knowledge/embeddings/embedding.service.ts` | Create | Created | ✅ |
| 12 | `apps/api/src/modules/knowledge/retrieval/retrieval-engine.ts` | Create | Created | ✅ |
| 13 | `apps/api/src/modules/knowledge/generation/generation-engine.ts` | Create | Created | ✅ |
| 14 | `apps/api/src/modules/knowledge/guards/knowledge.guard.ts` | Create | Created | ✅ |
| 15 | `apps/api/src/modules/knowledge/embeddings/embedding-cache.ts` | Create | Created | ✅ |
| 16 | `apps/api/src/modules/knowledge/retrieval/hybrid-scorer.ts` | Create | Created | ✅ |
| 17 | `apps/api/src/modules/knowledge/generation/prompt-templates.ts` | Create | Created | ✅ |
| 18 | `apps/api/src/modules/knowledge/generation/citation-extractor.ts` | Create | Created | ✅ |
| 19 | `apps/api/src/modules/knowledge/ingestion/garbage-collector.service.ts` | Create | Created | ✅ |
| 20 | `apps/api/src/modules/core/core.module.ts` | Modify | Modified | ✅ |

### Test Files

| File | Purpose |
|------|---------|
| `__tests__/chunking.service.spec.ts` | Recursive split, 256 tokens, 20% overlap |
| `__tests__/embedding-cache.spec.ts` | LRU cache hit/miss |
| `__tests__/upsert.spec.ts` | UPSERT idempotency (ON CONFLICT DO UPDATE) |
| `__tests__/knowledge.service.spec.ts` | Core orchestration |
| `__tests__/ingestion.service.spec.ts` | BullMQ workers |
| `__tests__/garbage-collector.spec.ts` | Orphan cleanup |
| `__tests__/retrieval-engine.spec.ts` | HNSW KNN + tenant WHERE |
| `__tests__/hybrid-scorer.spec.ts` | Vector + keyword scoring |
| `__tests__/generation-engine.spec.ts` | Prompt build + AiProvider |
| `__tests__/citation-extractor.spec.ts` | Regex citation validation |
| `__tests__/knowledge-api.spec.ts` | Full supertest flow |
| `__tests__/knowledge-cross-tenant-isolation.spec.ts` | Doorbell: cross-tenant isolation |
| `__tests__/knowledge-source-isolation.spec.ts` | Doorbell: source isolation |
| `__tests__/knowledge.types.spec.ts` (shared) | Type validation |

### Unexpected Files

| File | Why It Became Necessary |
|------|------------------------|
| `apps/api/src/modules/knowledge/embeddings/embedding.worker.ts` | worker_threads file for ONNX isolation |
| `apps/api/src/modules/knowledge/dto.ts` | DTO types for API |

---

## Testing

| Suite | Tests | Passed |
|-------|:-----:|:------:|
| 13 suites (knowledge filter) | 103 | 103 |

## Build

| Package | Status |
|---------|--------|
| `api` | ✅ Build successful |
| `shared` | ✅ Build successful |

## Lint

| Package | Status | Notes |
|---------|--------|-------|
| `api` | ⚠️ | Pre-existing — `apps/api/` lacks ESLint config. Not introduced by this SPEC. |

---

## Tenant Isolation

All KB queries for tenant data use `tenantId` scoping:
- `KnowledgeService.indexContent()` — UPSERT ON CONFLICT by (tenantId, sourceType, sourceId, chunkIndex) ✅
- `KnowledgeService.deleteSource()` — DELETE WHERE tenantId + sourceType + sourceId ✅
- `KnowledgeGuard` — tenant isolation guard on all KB endpoints ✅
- `RetrievalEngine` — all vector queries scoped by WHERE tenantId = X ✅
- Doorbell tests: cross-tenant isolation ✅, source isolation ✅

---

## Learning

### Working Set Accuracy

- **Planned**: 20 source files from Working Set
- **Actual**: 20 source files + 2 unexpected (embedding.worker.ts, dto.ts)
- **Accuracy**: ~100% (all planned files implemented; 2 unexpected additions)
- **Design Confidence**: Medium → High (after implementation)

### Verify Iterations

- **Iterations**: 2 (first build failed due to TS18047 `parentPort` null; fixed in second pass)
- **Issues**: 1 pre-existing TS error fixed (embedding.worker.ts)

### Verify Discoveries

| Severity | Count | Examples |
|----------|-------|----------|
| Critical | 0 | — |
| Major | 0 | — |
| Minor | 1 | `parentPort` possibly null in worker_threads — fixed with const alias |
| **Total** | **1** | |

---

## JSON Artifact

```json
{
  "working_set_accuracy": 100,
  "design_confidence": "High",
  "verify_iterations": 2,
  "planned_files": [
    "packages/database/prisma/schema.prisma",
    "packages/database/migrations/add_pgvector_extension.sql",
    "packages/shared/src/knowledge/knowledge.types.ts",
    "packages/shared/src/knowledge/knowledge-publisher.ts",
    "packages/shared/src/knowledge/index.ts",
    "apps/api/src/modules/knowledge/knowledge.module.ts",
    "apps/api/src/modules/knowledge/knowledge.service.ts",
    "apps/api/src/modules/knowledge/knowledge.controller.ts",
    "apps/api/src/modules/knowledge/ingestion/ingestion.service.ts",
    "apps/api/src/modules/knowledge/ingestion/chunking.service.ts",
    "apps/api/src/modules/knowledge/embeddings/embedding.service.ts",
    "apps/api/src/modules/knowledge/retrieval/retrieval-engine.ts",
    "apps/api/src/modules/knowledge/generation/generation-engine.ts",
    "apps/api/src/modules/knowledge/guards/knowledge.guard.ts",
    "apps/api/src/modules/knowledge/embeddings/embedding-cache.ts",
    "apps/api/src/modules/knowledge/retrieval/hybrid-scorer.ts",
    "apps/api/src/modules/knowledge/generation/prompt-templates.ts",
    "apps/api/src/modules/knowledge/generation/citation-extractor.ts",
    "apps/api/src/modules/knowledge/ingestion/garbage-collector.service.ts",
    "apps/api/src/modules/core/core.module.ts"
  ],
  "unexpected_files": [
    "apps/api/src/modules/knowledge/embeddings/embedding.worker.ts",
    "apps/api/src/modules/knowledge/dto.ts"
  ],
  "unexpected_dependencies": [],
  "future_recommendations": [
    "Adopt KnowledgePublisher in Communication Platform (P1), Workflow Engine (P2)",
    "Add PDF content extraction for document indexing (beyond filename + description)",
    "Evaluate fine-tuning embedding model with tenant data for improved precision",
    "Add query log analysis dashboard for KB usage insights",
    "Add ESLint config to apps/api to prevent pre-existing lint warnings"
  ],
  "verify_discoveries": {
    "critical": 0,
    "major": 0,
    "minor": 1,
    "total": 1
  },
  "environment": {
    "opencode_version": "",
    "provider": "opencode-go",
    "prompt_cache": true,
    "fallback_used": false,
    "fallback_reason": ""
  }
}
```

---

## Traceability

Design .............. ✅ (design.md)
Tasks ............... ✅ (tasks.md — 23/23 complete)
Architecture Review . ✅ (architecture-review.md — PASS)
Apply (PR-1) ........ ✅ (Schema + shared types + pgvector)
Apply (PR-2) ........ ✅ (Chunking + Embedding)
Apply (PR-3) ........ ✅ (Ingestion Pipeline + GC)
Apply (PR-4) ........ ✅ (Retrieval + Generation)
Apply (PR-5) ........ ✅ (API + Guards + Tests)
Apply (PR-6) ........ ✅ (Doc Platform Adoption)
Verify .............. ✅ (103/103 tests, BUILD PASS)
Archive ............. ✅ (this report)
PR Description ...... ✅ (pr-description.md)

---

## SDD Cycle Complete

**SPEC-0020 — AI Knowledge Base (RAG)**
Estado: ARCHIVED
Pipeline: Design → Tasks → Apply (6 PRs) → Verify → Archive ✅

---

## Related Artifacts

- [design.md](../../../../../openspec/changes/SPEC-0020-ai-knowledge-base/design.md)
- [tasks.md](../../../../../openspec/changes/SPEC-0020-ai-knowledge-base/tasks.md)
- [architecture-review.md](../../../../../openspec/changes/SPEC-0020-ai-knowledge-base/architecture-review.md)
- [verify-report.md](../../../../../openspec/changes/SPEC-0020-ai-knowledge-base/verify-report.md)
- [archive-report.md](archive-report.md)
- [pr-description.md](pr-description.md)

---

## Navigation

← [verify-report.md](../../../../../openspec/changes/SPEC-0020-ai-knowledge-base/verify-report.md) | [pr-description.md](pr-description.md) →
