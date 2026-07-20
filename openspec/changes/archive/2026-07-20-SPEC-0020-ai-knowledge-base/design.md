# Design: SPEC-0020 — AI Knowledge Base (RAG)

> **Versión template:** 1.1 (refined)
> **SDD Compliance:** v2.1 (Feature Frozen)
> **Enterprise Design Standard:** ACTIVE
> **Platform Baseline:** sdd-v2.1-baseline
> **Estado:** Refined — Architecture Review conditions resolved

---

## 1. Executive Summary

CRM-Master genera grandes volúmenes de datos no estructurados — documentos,
comunicaciones, workflows, integraciones — pero no existe un mecanismo para
consultar este conocimiento de forma inteligente. Los usuarios buscan en
tablas operacionales, no en el significado del contenido. El AI Automation
Hub (SPEC-0011) ejecuta automatizaciones lineales pero no proporciona una
base de conocimiento consultable en lenguaje natural.

**AI Knowledge Base** implementa Retrieval-Augmented Generation (RAG) sobre
el contenido del plataforma. Indexa documentos, comunicaciones, eventos de
actividad, registros de auditoría, workflows y notificaciones en vectores
embeddings usando `@xenova/transformers` (ONNX Runtime, modelo
`Xenova/all-MiniLM-L6-v2`). Proporciona una API de consulta en lenguaje
natural que recupera fragmentos relevantes y los pasa a un LLM para generar
respuestas contextualizadas.

El impacto esperado es permitir a los usuarios hacer preguntas en lenguaje
natural sobre sus datos, reducir el tiempo de búsqueda de información, y
proporcionar una base de conocimiento unificada que el AI Automation Hub
(SPEC-0011) y otros módulos puedan consumir.

---

## 2. Technical Approach

La AI Knowledge Base se organiza en seis capas:

1. **Ingestion Pipeline** — consume eventos y contenido de todos los módulos
   del plataforma (Documentos, Comunicaciones, Activity Timeline, Audit,
   Workflows, Notificaciones). Procesa el contenido en fragmentos (chunks)
   y genera embeddings vectoriales.

2. **Vector Store** — almacena los embeddings en una base de datos vectorial
   (pgvector sobre PostgreSQL). Cada fragmento tiene: contenido, embedding,
   metadata (tenantId, source, entityType, entityId, timestamp), y tipo de
   fuente.

3. **Embedding Service** — genera embeddings usando `@xenova/transformers`
   (ONNX Runtime, modelo `Xenova/all-MiniLM-L6-v2`, en el mismo proceso
   Node.js vía `worker_threads`). Soporta batching y caching de embeddings
   para fragmentos repetidos.

4. **Retrieval Engine** — recibe una pregunta en lenguaje natural, genera su
   embedding, busca los K fragmentos más similares por similitud coseno
   (HNSW index), aplica filtros de tenant y metadata, y devuelve los
   fragmentos ordenados por relevancia.

5. **Generation Engine** — construye un prompt con los fragmentos recuperados
   y la pregunta, lo envía al LLM configurado (AiProvider de SPEC-0011), y
   devuelve la respuesta generada con citas a las fuentes.

6. **Knowledge API** — expone endpoints para consultar, indexar contenido,
   gestionar fuentes, y administrar la base de conocimiento.

```
Content Sources (SPEC-0011/12/13/14/15/16/17/18)
       │
       ▼
Ingestion Pipeline (BullMQ)
       │
   [Chunking] → split content into fragments (256 tokens, overlap 20%)
       │
   [Embedding] → @xenova/transformers (ONNX, worker_threads) → vector
       │
       ▼
Vector Store (pgvector on PostgreSQL — HNSW index)
       │
       ├──→ Retrieval Engine
       │       │  query → embedding → HNSW KNN search → ranked fragments
       │       │
       │       ▼
       │   Generation Engine
       │       │  fragments + query → prompt → AiProvider.generate() → answer + citations
       │       │
       │       ▼
       │   Knowledge API ←── Answer with sources
       │
       └──→ Index Management
               │  reindex (concurrency 1), delete source, garbage collector
               │
               ▼
           AI Automation Hub (SPEC-0011) ←── Consume KB as tool
```

---

## 3. Architecture Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Vector store | pgvector, Pinecone, Weaviate, Qdrant | **pgvector (PostgreSQL)** | Misma base que el plataforma. Dependencia de infraestructura NUEVA — ver ADR-0017. Requiere `CREATE EXTENSION IF NOT EXISTS vector`. |
| Embedding execution | Python sidecar, ONNX Runtime, microservicio | **ONNX Runtime via `@xenova/transformers`** | Sin sidecar ni child_process. `Xenova/all-MiniLM-L6-v2` (~23MB, 384-dim). Corre en `worker_threads` para no bloquear event loop. Queue dedicada `kb:embedding` con concurrency 1. |
| Embedding model | OpenAI ada-002, sentence-transformers, ONNX | **Xenova/all-MiniLM-L6-v2 (ONNX)** | Gratuito, rápido (384-dim), corre en proceso sin API keys. El formato ONNX evita dependencia Python. Suficiente precisión para contenido técnico en español/inglés. |
| Chunking strategy | Fixed size, Semantic, Recursive | **Recursive character splitter** | Respeta límites de párrafos y oraciones. Chunk size 256 tokens. Overlap de 20% entre chunks para no perder contexto. |
| LLM provider | SPEC-0011's AiProvider, OpenAI direct, Anthropic | **SPEC-0011's AiProvider** | Reutiliza `AiProvider.generate()` existente. El tenant configura su LLM en AI Automation Hub. El KB no gestiona LLMs directamente. |
| Search | KNN (IVFFlat), HNSW, Full-text + vector hybrid | **HNSW + full-text hybrid** | HNSW no sufre de centroid bias (vs IVFFlat per-partition). Soporta filtering por WHERE clause sin perder precisión. Parallel index construction. |
| Ingestion | Sync on write, Async (BullMQ), Batch cron | **Async (BullMQ)** | Misma infraestructura que el resto del plataforma. Colas dedicadas: `kb:ingestion`, `kb:embedding` (concurrency 1), `kb:reindex` (concurrency 1). |
| Caching | Embedding cache, Result cache, No cache | **Embedding LRU cache in-memory** | Fragmentos repetidos (mismos contentHash) no regeneran embedding. Resultados de búsqueda se cachean con TTL corto (60s). |
| Multilingual | Model per language, Single multilingual | **all-MiniLM-L6-v2 (multilingual)** | Soporta español e inglés sin cambiar de modelo. Fine-tuning con datos del tenant para mejorar precisión. |
| Max content size | 5MB, 10MB, 50MB | **10MB por fuente** | Si excede, el módulo fuente debe chunkear antes de enviar al KB. |

---

## 4. Data Flow

```
Index content:

Document created / Communication sent / Activity event
       │
       ├── Queue in BullMQ (kb:ingestion)
       │
Worker picks up:
       │
       ├── Load content + metadata from source (max 10MB)
       ├── Recursive chunking (256 tokens, overlap 20%)
       ├── For each chunk:
       │     ├── Check contentHash (MD5 of text)
       │     │     ├── MATCH on existing chunk → skip (no embedding needed)
       │     │     └── MISS → queue in kb:embedding (concurrency 1, worker_threads)
       │     │
       │     └── UPSERT INTO kb_chunks (...)
       │           ON CONFLICT (tenantId, sourceType, sourceId, chunkIndex)
       │           DO UPDATE SET content = excluded.content,
       │                         contentHash = excluded.contentHash,
       │                         updatedAt = NOW()
       │
       └── Update kb_source_indexes (status, chunkCount, lastIndexedAt)

Query knowledge:

User → GET /api/v1/knowledge/query?q=¿Cuántos workflows fallaron ayer?&tenantId=X
       │
       ├── Generate embedding for query (same model, @xenova/transformers)
       ├── Retrieve top K chunks:
       │     ├── HNSW KNN search: SELECT * FROM kb_chunks
       │     │     WHERE tenantId = X
       │     │     ORDER BY embedding <=> query_embedding
       │     │     LIMIT K
       │     │
       │     └── Optionally filter by: sourceType, dateRange, entityType
       │
       ├── Rerank by relevance (hybrid vector + keyword score)
       ├── Build prompt:
       │     """
       │     Context:
       │     [chunk 1 content] (source: document-x)
       │     [chunk 2 content] (source: workflow-y)
       │     ...
       │
       │     Question: {query}
       │
       │     Answer based on the context above. If the context
       │     doesn't contain the answer, say so. Cite sources.
       │     """
       │
       ├── Call AiProvider.generate() with constructed prompt
       ├── Post-process response: extract citations via regex,
       │   validate each citation references an actual sourceId
       ├── Return answer + citations + relevant chunks
       └── Log query to kb_query_log (audit + improvement)

Reindex source:

POST /api/v1/knowledge/sources/{sourceType}/{sourceId}/reindex
       │
       ├── Queue in kb:reindex (concurrency 1, batch size 50)
       ├── Worker:
       │     ├── Delete existing chunks for source
       │     ├── Re-load content from source
       │     ├── Re-chunk + re-embed (via kb:embedding queue)
       │     └── UPSERT new chunks (DO UPDATE)
       └── Update kb_source_indexes
```

---

## 5. Working Set

### 5.1 Primary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `packages/database/prisma/schema.prisma` | Modify | Add `KbChunk`, `KbSourceIndex`, `KbQueryLog` models |
| 2 | `packages/database/migrations/add_pgvector_extension.sql` | Create | `CREATE EXTENSION IF NOT EXISTS vector; CREATE INDEX ON kb_chunks USING hnsw (embedding vector_cosine_ops)` |
| 3 | `packages/shared/src/knowledge/knowledge.types.ts` | Create | Types: KbQuery, KbChunk, KbSource, KbAnswer, KbCitation |
| 4 | `packages/shared/src/knowledge/knowledge-publisher.ts` | Create | `KnowledgePublisher` interface for modules to push content |
| 5 | `packages/shared/src/knowledge/index.ts` | Create | Re-export |
| 6 | `apps/api/src/modules/knowledge/knowledge.module.ts` | Create | NestJS module |
| 7 | `apps/api/src/modules/knowledge/knowledge.service.ts` | Create | Core orchestration |
| 8 | `apps/api/src/modules/knowledge/knowledge.controller.ts` | Create | REST API |
| 9 | `apps/api/src/modules/knowledge/ingestion/ingestion.service.ts` | Create | BullMQ consumer for content indexing |
| 10 | `apps/api/src/modules/knowledge/ingestion/chunking.service.ts` | Create | Recursive text chunking (256 tokens) |
| 11 | `apps/api/src/modules/knowledge/embeddings/embedding.service.ts` | Create | `@xenova/transformers` inference via worker_threads |
| 12 | `apps/api/src/modules/knowledge/retrieval/retrieval-engine.ts` | Create | Vector HNSW KNN search + hybrid scoring |
| 13 | `apps/api/src/modules/knowledge/generation/generation-engine.ts` | Create | LLM prompt building + response generation |
| 14 | `apps/api/src/modules/knowledge/guards/knowledge.guard.ts` | Create | Tenant isolation |

### 5.2 Secondary Files

| # | File | Action | Reason |
|---|------|--------|--------|
| 15 | `apps/api/src/modules/knowledge/embeddings/embedding-cache.ts` | Create | LRU cache for embeddings |
| 16 | `apps/api/src/modules/knowledge/retrieval/hybrid-scorer.ts` | Create | Combine vector + keyword score |
| 17 | `apps/api/src/modules/knowledge/generation/prompt-templates.ts` | Create | Prompt templates per source type |
| 18 | `apps/api/src/modules/knowledge/generation/citation-extractor.ts` | Create | Regex-based citation extraction + sourceId validation |
| 19 | `apps/api/src/modules/knowledge/ingestion/garbage-collector.service.ts` | Create | Periodic check for orphan chunks |
| 20 | `apps/api/src/modules/core/core.module.ts` | Modify | Import KnowledgeModule |

### 5.3 Expected NOT to Change

- SPEC-0011 (AI Automation Hub) — el KB usa su `AiProvider.generate()`, no lo modifica
- Fuentes de contenido (SPEC-0012/13/14/15/16/17/18) — emiten eventos, no modifican el KB
- Frontend — SPEC separada

---

## 6. Read Order

1. `packages/shared/src/knowledge/knowledge.types.ts` — tipos base
2. `packages/shared/src/knowledge/knowledge-publisher.ts` — interfaz de publicación
3. `packages/database/prisma/schema.prisma` — modelos + pgvector
4. `apps/api/src/modules/knowledge/ingestion/chunking.service.ts` — chunking
5. `apps/api/src/modules/knowledge/embeddings/embedding.service.ts` — embeddings
6. `apps/api/src/modules/knowledge/retrieval/retrieval-engine.ts` — búsqueda
7. `apps/api/src/modules/knowledge/generation/generation-engine.ts` — generación

---

## 7. Expected Commands

```bash
# Create pgvector extension in target database
psql -d crm_test -c "CREATE EXTENSION IF NOT EXISTS vector"

# Run migration (applies extension + HNSW index + tables)
pnpm --filter database prisma migrate dev --name add_knowledge_base

# Generate Prisma Client
pnpm --filter database generate

# Test
pnpm --filter api test knowledge

# Build
pnpm turbo build --filter=api
```

---

## 8. Design Confidence

**Confidence:** Medium

El patrón RAG con pgvector + HNSW + `@xenova/transformers` + SPEC-0011's
AiProvider es la arquitectura estándar para Knowledge Bases. Sin embargo,
`@xenova/transformers` es una dependencia npm nueva en el proyecto. ONNX
Runtime en Node.js está probado en la comunidad, pero su comportamiento
bajo carga sostenida en workers BullMQ requiere validación en producción.

La ingestion asíncrona sigue el mismo patrón que SPEC-0017/18/19. El
chunking recursivo con overlap es la práctica recomendada para contenido
técnico. La integración con SPEC-0011 reutiliza la abstracción de LLM
existente (`AiProvider.generate()`).

---

## 9. Exploration Budget

| Resource | Budget | Notes |
|----------|--------|-------|
| Repo searches | 3 | Patrones de ingestion, AiProvider, shared contracts |
| Files to read | 5 | Schema, AiProvider interface, módulos de contenido |
| Files to create | 20 | Module, service, controller, ingestion, chunking, embeddings, retrieval, generation, guards, citation-extractor, garbage-collector |
| Files to modify | 2 | schema.prisma, core.module.ts |
| Dependency audit | 1 | `@xenova/transformers` — tamaño, dependencias transitivas, compatibilidad Node.js |

---

## 10. Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| `@xenova/transformers` no cabe en memoria del worker | Baja | Alto | Modelo ~23MB (ONNX, cuantizado). Worker dedicado con 1GB RAM mínimo. Batching 32 chunks. worker_threads aísla el heap. |
| HNSW precision insuficiente para consultas complejas | Baja | Medio | Hybrid scoring (vector + keyword). Reranking. HNSW no sufre centroid bias como IVFFlat. |
| Chunking rompe contexto semántico | Baja | Medio | Overlap 20%. Chunk size 256 tokens. Metadata de contexto (documento, sección, posición). |
| LLM alucina con fragmentos irrelevantes | Media | Alto | Prompt engineering estricto: "Si el contexto no contiene la respuesta, dilo." Citas a fuentes obligatorias. Post-processing validation con citation-extractor. |
| pgvector requiere extensión PostgreSQL | Media | Alto | `CREATE EXTENSION IF NOT EXISTS vector`. No reversible sin dropear la extensión (pérdida de datos). Documentado en ADR-0017. |
| `@xenova/transformers` rendimiento CPU bajo alta carga (>10K docs) | Media | Medio | worker_threads dedicados. Batching 32 chunks. Queue depth alert >10K. Para >10K documentos, escalar a worker dedicado con más cores. |

---

## 11. Testing Strategy

| Layer | Focus | Approach |
|-------|-------|----------|
| Unit — Chunking | Recursive split, overlap, boundary cases, 256 token limit | Jest |
| Unit — Embedding | Cache hit/miss, batch generation, worker_threads isolation | Jest (mock @xenova/transformers) |
| Unit — Retrieval | HNSW KNN search, hybrid scoring, tenant filtering | Jest (mock pgvector) |
| Unit — Generation | Prompt building, citation extraction via regex, sourceId validation | Jest (mock AiProvider) |
| Unit — Citation extractor | Regex parsing, edge cases (multiple citations, malformed), missing sourceId | Jest |
| Unit — Garbage collector | Orphan detection, batch delete, no impact on active sources | Jest |
| Integration — API | Query, index, reindex, source management, UPSERT idempotency | supertest |
| Doorbell | Tenant A chunks no visibles para Tenant B | E2E |

---

## 12. Doorbell Tests

| Test file | What it proves |
|-----------|----------------|
| `knowledge-cross-tenant-isolation.spec.ts` | Tenant A cannot query or see Tenant B's indexed chunks |
| `knowledge-source-isolation.spec.ts` | Tenant A cannot reindex/delete Tenant B's sources |

---

## 13. Required ADRs

| ADR | Reason | Status |
|-----|--------|--------|
| ADR-0016 | Documentar la arquitectura de la AI Knowledge Base, pgvector, ONNX Runtime vía `@xenova/transformers`, chunking strategy (256 tokens), HNSW index, y la integración con SPEC-0011's AiProvider. | Proposed |
| ADR-0017 | Añadir pgvector como dependencia de infraestructura al platform-baseline. PostgreSQL 16+: `CREATE EXTENSION IF NOT EXISTS vector`. Modifica docker-compose.yml (extensión), plataforma feature-frozen. | Proposed |

---

## 14. Boundaries

| Boundary | Owner | Purpose |
|----------|-------|---------|
| `KbChunk` (vector store) | KnowledgeModule | Fragmentos indexados con embeddings |
| `KnowledgePublisher` | KnowledgeModule | Interfaz para que módulos publiquen contenido |
| `RetrievalEngine` | KnowledgeModule | Búsqueda semántica + reranking |
| `GenerationEngine` | KnowledgeModule | Generación de respuestas con LLM (wraps AiProvider.generate()) |
| LLM provider | AiAutomationModule (SPEC-0011) | Abstracción de LLM — el KB la usa, no la posee |
| Content production | Respective modules | Producen el contenido que el KB indexa |

---

## 15. Extensibilidad

| Future feature | How it fits | Effort |
|----------------|-------------|--------|
| New source type | Implementar `SourceAdapter` (load + chunk + metadata). Registrar en registry. | Days |
| Custom embedding model | Configurable via `KbConfig.embeddingModel`. Nuevo modelo = nuevo worker. | Days |
| Hybrid search tuning | Ajustar pesos vector vs keyword en `HybridScorer`. Sin cambiar retrieval. | Hours |
| Fine-tuning embedding model | Requiere datos etiquetados y GPU. Evaluar si precisión insuficiente. | Weeks |
| Knowledge graph | Añadir relaciones entre chunks (extraídas por LLM). Nueva capa sobre pgvector. | Weeks |

---

## Architecture Review Preparation (MANDATORY)

### A. Scalability

| Factor | 10× (1M chunks) | 100× (10M chunks) | Mitigation |
|--------|----------------|-------------------|------------|
| Vector storage | ~1.5 GB (384-dim float32) | ~15 GB | HNSW index (~30% overhead). Partición lógica por tenant (WHERE tenantId = X). |
| KNN search (HNSW) | <5ms | <20ms | HNSW no requiere per-partition indexes. El filtering por tenant se aplica vía WHERE clause. |
| Embedding generation | ~30ms/chunk (CPU, ONNX) | ~300ms/chunk bajo carga | worker_threads dedicados. Batching 32 chunks. Queue depth alert >10K. |
| Query + generation | <3s | <5s | El bottleneck es el LLM (SPEC-0011), no el KB. Caching de resultados frecuentes. |

**Decision:** pgvector con HNSW escala horizontalmente con workers dedicados
para embedding. HNSW no sufre centroid bias (problema de IVFFlat con
particiones). El cuello de botella es la generación del LLM — mitigado con
caching de queries frecuentes y timeout configurable.

### B. Open/Closed Principle (OCP)

**Point of extension:** `SourceAdapter`, `ChunkingStrategy`, `ScoringStrategy`.

**What must change to add a new source type:** Implementar `SourceAdapter`
(load + chunk + metadata). Registrar. Cero cambios en retrieval o generation.

**What must change to add a new chunking strategy:** Implementar
`ChunkingStrategy` interface. Registrar en `ChunkingRegistry`. Cero cambios
en ingestion pipeline.

### C. Ownership

| Data / Capability | Owner | Consumers |
|-------------------|-------|-----------|
| KbChunk (vector store) | KnowledgeModule | RetrievalEngine, Query API |
| Embedding model (`@xenova/transformers`) | KnowledgeModule | Ingestion, Retrieval |
| LLM provider | AiAutomationModule (SPEC-0011) | GenerationEngine |
| Content | Respective modules | KnowledgeModule (via publisher) |

### D. Data Retention

| Data | Lifetime | Archive | Deletion |
|------|----------|---------|----------|
| KbChunk (indexed) | Mientras exista la fuente | — | `deleteSource()` del módulo fuente + garbage collector de huérfanos |
| KbQueryLog | 90 días | — | Eliminar >90 días |
| Embedding cache | TTL 1 hora | — | Expira por TTL |

### E. Idempotency

| Operation | Duplicate risk | Protection |
|-----------|---------------|------------|
| `indexContent()` | Alta (retry del worker) | `UPSERT ON CONFLICT (tenantId, sourceType, sourceId, chunkIndex) DO UPDATE SET content = excluded.content, contentHash = excluded.contentHash, updatedAt = NOW()`. Si contentHash coincide, se skip embedding recomputation. |
| `deleteSource()` | Baja | Idempotent — DELETE WHERE sourceId = X. El módulo fuente DEBE llamar `deleteSource()` al eliminar contenido. Garbage collector periódico elimina huérfanos no cubiertos. |
| `query()` | Ninguna | Read-only. Cache con TTL. |

### F. Shared Contracts

| Contract | Location | Consumers |
|----------|----------|-----------|
| `KbQuery` | `packages/shared/src/knowledge/` | API, RetrievalEngine |
| `KbChunk` | `packages/shared/src/knowledge/` | Store, Retrieval, API |
| `KbAnswer` | `packages/shared/src/knowledge/` | API, UI |
| `KnowledgePublisher` | `packages/shared/src/knowledge/` | Content modules |

### G. Partitioning Strategy

`kb_chunks` NO requiere partición física por tenant. El HNSW index es global
y respeta filtering por WHERE clause (tenantId = X). HNSW no sufre centroid
bias (a diferencia de IVFFlat), por lo que un WHERE clause localiza los
vectores relevantes sin perder precisión en tenants pequeños.

`kb_query_log` se particiona por mes. `kb_source_index` no requiere
partición (volumen bajo).

La partición por tenant es un **concern lógico** (WHERE tenantId = X),
no físico. No se necesita partition per tenant para HNSW.

---

## 16. Interfaces / Contracts

```typescript
// ─── Core Types ────────────────────────────────────

export type SourceType =
  | 'document' | 'communication' | 'workflow' | 'notification'
  | 'activity' | 'audit' | 'integration' | 'automation';

export interface KbChunk {
  id: string;
  tenantId: string;
  sourceType: SourceType;
  sourceId: string;
  chunkIndex: number;
  content: string;
  contentHash: string;       // MD5 for dedup — si coincide, skip embedding
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
  topK?: number;             // default 5
  includeChunks?: boolean;   // include source chunks in response
}

export interface KbChunkResult {
  chunk: KbChunk;
  score: number;             // similarity 0..1
}

export interface KbCitation {
  sourceType: SourceType;
  sourceId: string;
  content: string;           // excerpt
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

// ─── Publisher Interface ───────────────────────────

export interface KnowledgePublisher {
  indexContent(tenantId: string, sourceType: SourceType, sourceId: string,
    content: string, metadata?: Record<string, unknown>): Promise<void>;
  deleteSource(tenantId: string, sourceType: SourceType, sourceId: string): Promise<void>;
}

// ─── Adapter Interfaces ────────────────────────────

export interface SourceAdapter {
  readonly sourceType: SourceType;
  loadContent(tenantId: string, sourceId: string): Promise<{ content: string; metadata: Record<string, unknown> }>;
}

export interface ChunkingStrategy {
  readonly name: string;
  chunk(text: string, options?: Record<string, unknown>): Promise<string[]>;
}

export interface ScoringStrategy {
  score(queryEmbedding: number[], chunkEmbedding: number[]): number;  // 0..1
}
```

```prisma
// ─── KbChunk (pgvector) ────────────────────────────
model KbChunk {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  sourceType  String   @map("source_type")
  sourceId    String   @map("source_id")
  chunkIndex  Int      @map("chunk_index")
  content     String
  contentHash String   @map("content_hash")
  metadata    Json     @default("{}")
  embedding   Unsupported("vector(384)")?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([tenantId, sourceType, sourceId, chunkIndex])
  @@index([tenantId, sourceType, sourceId])
  @@index([tenantId, contentHash])
  // HNSW index: CREATE INDEX ON kb_chunks USING hnsw (embedding vector_cosine_ops)
  // HNSW no requiere per-partition indexes — respeta WHERE tenantId = X sin centroid bias
  @@map("kb_chunks")
}

// ─── KbSourceIndex ─────────────────────────────────
model KbSourceIndex {
  id            String    @id @default(uuid())
  tenantId      String    @map("tenant_id")
  sourceType    String    @map("source_type")
  sourceId      String    @map("source_id")
  chunkCount    Int       @default(0) @map("chunk_count")
  status        String    @default("pending") // pending | indexed | failed
  lastIndexedAt DateTime? @map("last_indexed_at")
  error         String?
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  @@unique([tenantId, sourceType, sourceId])
  @@map("kb_source_indexes")
}

// ─── KbQueryLog ───────────────────────────────────
model KbQueryLog {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  query       String
  sourceTypes String[] @map("source_types")
  topK        Int      @default(5) @map("top_k")
  resultCount Int      @map("result_count")
  latencyMs   Int      @map("latency_ms")
  feedback    String?  // thumbs up/down
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([tenantId, createdAt(sort: Desc)])
  @@map("kb_query_logs")
}
```

---

## 17. Migration Strategy

| Step | Description | Risk | Rollback |
|------|-------------|------|----------|
| 1 | Enable pgvector extension + create tables (HNSW index) | Bajo | `DROP EXTENSION vector` (solo si no hay datos). ADR-0017 documenta el cambio. |
| 2 | Create shared contracts + KnowledgePublisher | Bajo | Revertir commit |
| 3 | Implement ChunkingService + EmbeddingService (`@xenova/transformers`) | Bajo | Sin datos que procesar aún |
| 4 | Implement Ingestion pipeline (BullMQ workers: kb:ingestion, kb:embedding concurrency 1) | Bajo | Desactivar workers |
| 5 | Implement RetrievalEngine + hybrid scoring (HNSW) | Bajo | Sin chunks indexados, devuelve vacío |
| 6 | Implement GenerationEngine (wraps AiProvider.generate() + citation extractor) | Bajo | Sin contenido indexado, responde "no hay datos" |
| 7 | Wire KnowledgeModule en CoreModule | Bajo | Quitar del imports |
| 8 | Adoptar KnowledgePublisher en módulos de contenido — **plan de adopción** | Medio | Cada fuente se adopta individualmente |

### Plan de adopción de KnowledgePublisher

| Prioridad | Módulo | SPEC | MVP |
|-----------|--------|------|-----|
| **P0** | Document Platform | SPEC-0013 | ✅ En MVP — representa el contenido principal del tenant |
| **P1** | Communication Platform | SPEC-0012 | Post-MVP — correos, notificaciones, templates |
| **P2** | Workflow Engine | SPEC-0015 | Post-MVP — ejecuciones, logs, reglas |

> MVP delivers value with Document Platform alone. KnowledgePublisher
> adoption is incremental — each module adopts independently without
> changes to KnowledgeModule internals.

### Garbage collector de chunks huérfanos

Job periódico (cron diario) que:
1. Busca chunks en `kb_chunks` cuya `(sourceType, sourceId)` no tenga
   entrada en la tabla fuente correspondiente.
2. Elimina batches de 100 chunks huérfanos por iteración.
3. Registra métricas de huérfanos eliminados.

---

## 18. Open Questions

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| 1 | ¿sentence-transformers se ejecuta en el mismo proceso Node.js o como sidecar? | **Resuelta** | ONNX Runtime via `@xenova/transformers`. Modelo `Xenova/all-MiniLM-L6-v2` (~23MB ONNX). Corre en `worker_threads` para no bloquear event loop. Queue dedicada `kb:embedding` con concurrency 1. Sin Python sidecar, sin microservicio, sin child_process. |
| 2 | ¿Soporte para fine-tuning del embedding model con datos del tenant? | Open | Recomendación: no en MVP. Fine-tuning requiere datos etiquetados y GPU. Evaluar en v2 si la precisión no es suficiente. |
| 3 | ¿Máximo tamaño de contenido por fuente? | **Resuelta** | 10MB por fuente. Si excede, el módulo fuente debe chunkear antes de enviar al KB. Documentado en Architecture Decisions. |
| 4 | ¿Los documentos PDF se procesan directamente (OCR) o se requiere texto plano? | Open | Recomendación: texto plano en MVP. Los PDFs requieren extracción vía SPEC-0013 (Document Platform). El KB indexa el texto extraído, no el binario. |

---

> **Fin del documento.**
> **Enterprise Design Standard SDD v2.1.** Architecture Review conditions resolved.
> Next: Generate Tasks.
