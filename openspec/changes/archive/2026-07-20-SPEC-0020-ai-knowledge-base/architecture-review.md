# Architecture Review — SPEC-0020: AI Knowledge Base (RAG)

**Verdict: REJECTED**

## Blocking Issues

| # | Severity | Finding | Effort |
|---|----------|---------|--------|
| 1 | 🔴 | **pgvector no instalado** — infraestructura actual no tiene la extensión. Requiere modificar componentes feature-frozen del platform-baseline. | Alta |
| 2 | 🔴 | **sentence-transformers sin modelo de ejecución** — Q1 abierta. Sidecar Python, ONNX Runtime o microservicio sin decidir. | Alta |
| 3 | 🔴 | **IVFFlat global vs per-tenant** — El index es global, no por partición. Tenants pequeños invisibles en búsqueda. | Media |
| 4 | 🔴 | **Chunk size > context window** — 512 tokens vs 256 tokens del modelo. Truncamiento silencioso. | Baja |

## High Severity

| # | Finding |
|---|---------|
| 🟡 #5 | AiProvider sin soporte QA/chat — no hay `chat()`, ni streaming, ni control de formato |
| 🟡 #6 | Reindexación sin control de concurrencia |
| 🟡 #7 | KnowledgePublisher sin plan de adopción |
| 🟡 #8 | UPSERT no actualiza contenido cambiado (`DO NOTHING` en vez de `DO UPDATE`) |
| 🟡 #9 | Source deletion sin cascade — chunks huérfanos |
| 🟡 #10 | sentence-transformers en CPU no escala |

## Conditions for re-submission

1. ADR que añada pgvector a la infraestructura (o excepción de feature freeze)
2. Decisión arquitectónica documentada sobre el modelo de ejecución de embeddings
3. SQL corregido para índices IVFFlat por partición de tenant (o HNSW per-partition)
4. Chunk size ≤256 tokens (acorde al modelo)
5. UPSERT con `DO UPDATE` para manejar cambios de contenido
6. Plan de adopción de KnowledgePublisher (al menos 1 módulo en MVP)
