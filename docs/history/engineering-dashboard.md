# Engineering Dashboard

> **Última actualización:** 2026-07-20 (SPEC-0024)
> **Este documento se actualiza automáticamente al archivar cada SPEC.**

---

## Overall Metrics

| Metric | Value |
|--------|-------|
| Total SPECs | 22 |
| Completed SPECs | 22 |
| Archived SPECs | 22 |
| Average Working Set Accuracy | **~98%** |
| Average Prediction Accuracy | **~96%** |
| Average Tests Added per SPEC | ~35 |
| Architecture Reviews Passed | 20/20 |
| Critical Discoveries | 0 |
| Major Discoveries | 0 |
| Minor Discoveries | 13 |
| Average Files Created per SPEC | ~27 |
| Average Files Modified per SPEC | ~3 |
| Unexpected Files | 24 |
| Unexpected Dependencies | 1 (cmdk) |
| Build Success | 20/20 |

---

## Timeline

| SPEC | Date | Working Set | Tests | Discoveries | Status |
|------|------|:-----------:|:-----:|:-----------:|--------|
| SPEC-0002 | 2026-07-04 | — | — | — | ✅ Archived |
| SPEC-0003 | 2026-07-19 | — | — | — | ✅ Archived |
| SPEC-0005 | 2026-07-19 | — | — | — | ✅ Archived |
| SPEC-0006 | 2026-07-19 | — | — | — | ✅ Archived |
| SPEC-0008 | 2026-07-18 | 100% | 19 | 0/0/0 | ✅ Archived |
| SPEC-0009 | 2026-07-19 | 100% | 19 | 0/0/0 | ✅ Archived |
| SPEC-0010 | 2026-07-19 | 90% | 20 | 0/0/2 | ✅ Archived |
| SPEC-0011 | 2026-07-20 | 100% | 14 | 0/0/1 | ✅ Archived |
| SPEC-0012 | 2026-07-20 | 98% | 32 | 0/0/1 | ✅ Archived |
| client-platform | 2026-07-18 | — | — | — | ✅ Archived |
| client-self-registration | 2026-07-19 | — | — | — | ✅ Archived |
| add-portalurl-to-findone | 2026-07-18 | 100% | — | 0/0/0 | ✅ Archived |
| SPEC-0015 | 2026-07-20 | 100% | 33 | 0/0/2 | ✅ Archived |
| SPEC-0016 | 2026-07-20 | ~95% | 35 | 0/0/1 | ✅ Archived |
| SPEC-0017 | 2026-07-20 | 100% | 24 | 0/0/0 | ✅ Archived |
| SPEC-0018 | 2026-07-20 | 100% | 83 | 0/0/0 | ✅ Archived |
| SPEC-0019 | 2026-07-20 | ~96% | 142 | 0/0/1 | ✅ Archived |
| SPEC-0020 | 2026-07-20 | 100% | 103 | 0/0/1 | ✅ Archived |
| SPEC-0021 | 2026-07-20 | ~96% | 152 | 0/0/1 | ✅ Archived |
| SPEC-0022 | 2026-07-20 | ~95% | 90 | 0/0/2 | ✅ Archived |
| SPEC-0023 | 2026-07-20 | ~96% | 234 | 0/0/1 | ✅ Archived |
| SPEC-0024 | 2026-07-20 | ~96% | 258 | 0/0/0 | ✅ Archived |

---

## Architecture Decisions Reused

| Decision | First introduced | Reused in |
|----------|----------------|-----------|
| SearchEngine abstraction | SPEC-0010 | — |
| Event-driven indexing | SPEC-0010 | SPEC-0011, SPEC-0012 |
| Shared contracts (`packages/shared/`) | SPEC-0009 | SPEC-0010, SPEC-0011, SPEC-0012 |
| Provider registry pattern | SPEC-0011 | SPEC-0012 |
| AutomationDispatcher | SPEC-0011 | — |
| SecretStore | SPEC-0011 | — |
| AiProvider abstraction | SPEC-0011 | — |
| PromptSanitizer | SPEC-0011 | — |
| CommunicationProvider | SPEC-0012 | — |
| ProviderSelectionStrategy | SPEC-0012 | — |
| SecureTemplateRenderer | SPEC-0012 | — |
| WorkflowEngine (Definition → Instance → Execution) | SPEC-0015 | — |
| NodeExecutor registry pattern | SPEC-0015 | — |
| ServiceTaskGateway contract | SPEC-0015 | — |
| Saga orchestrated compensation | SPEC-0015 | — |
| ParallelSplit + ParallelJoin | SPEC-0015 | — |
| SubWorkflow async suspend/resume | SPEC-0015 | — |
| NotificationCenter definition pattern (Definition → Instance → Routing → Delivery) | SPEC-0016 | — |
| Double-checkpoint preference evaluation | SPEC-0016 | — |
| SHA-256 hash chain per tenant (monotonic sequence) | SPEC-0018 | — |
| Append-only enforcement (middleware + trigger + roles) | SPEC-0018 | — |
| ComplianceRule + ExpectationRule interfaces | SPEC-0018 | — |
| Cryptographic redaction (GDPR) preserving hash chain | SPEC-0018 | — |
| Content snapshot on instance for immutability | SPEC-0016 | — |
| RoutingStrategy rule-based with override | SPEC-0016 | — |
| EAV table for notification preferences | SPEC-0016 | — |
| RAG pipeline (pgvector + ONNX + AiProvider) | SPEC-0020 | — |
| Recursive chunking (256t, 20% overlap) | SPEC-0020 | — |
| HNSW + hybrid (vector + keyword) search | SPEC-0020 | — |
| KnowledgePublisher interface for module adoption | SPEC-0020 | — |
| Embedding LRU cache + contentHash dedup | SPEC-0020 | — |
| Bearer token auth with SHA-256 hashed storage | SPEC-0021 | — |
| Worker thread plugin sandbox (pool + LRU + resource limits) | SPEC-0022 | — |
| BullMQ saga with compensating actions | SPEC-0015 | SPEC-0023 |
| Circuit breaker pattern (in-memory, fail-open) | SPEC-0023 | — |
| Cumulative UPSERT metering (self-correcting) | SPEC-0023 | — |
| Local-first creation (unpaid before external push) | SPEC-0023 | — |
| Runtime PermissionGuard for Extension API | SPEC-0022 | — |
| Domain allowlist for HTTP outbound | SPEC-0022 | — |
| SHA-256 contentHash for package integrity | SPEC-0022 | — |
| EventBridge pattern (event subscription → plugin dispatch) | SPEC-0022 | — |
| Scopes resource:action (granular + wildcard) | SPEC-0021 | — |
| In-memory sliding window rate limiting per endpoint | SPEC-0021 | — |
| HMAC-SHA256 webhook signing with deliveryId anti-replay | SPEC-0021 | — |
| URL path versioning with deprecation lifecycle | SPEC-0021 | — |
| AES-256-GCM encrypted webhook secrets at rest | SPEC-0021 | — |
| Prometheus metrics instrumentation (interceptor + registry) | SPEC-0024 | — |
| Route normalization (UUID/number → :param) | SPEC-0024 | — |
| Pino structured logging as global LoggerService | SPEC-0024 | — |
| AlertManager webhook integration pattern | SPEC-0024 | — |
| @Global() module for cross-cutting infrastructure | SPEC-0024 | — |
| AsyncLocalStorage correlation context | SPEC-0024 | — |

---

## Lessons Trending

| Lesson | Appears in |
|--------|------------|
| Working Set prediction highly accurate | SPEC-0010, SPEC-0011, SPEC-0012 |
| Event-driven reduces coupling | SPEC-0010, SPEC-0011 |
| Shared contracts reduce drift | SPEC-0009, SPEC-0010, SPEC-0011, SPEC-0012 |
| Abstractions first prevent coupling | SPEC-0011, SPEC-0012 |
| Deferred tests follow consistent pattern | SPEC-0010, SPEC-0011, SPEC-0012 |
| Shared package re-exports must be in Working Set | SPEC-0015, SPEC-0016 |
| Implementation improves design proactively | SPEC-0015 |
| Doorbell tests catch tenant isolation gaps effectively | SPEC-0015 |
| Migration SQL fallback needed for CI-like environments | SPEC-0016 |
| Testing files should be predicted in Working Set or explicitly deferred | SPEC-0016 |
| Doorbell tests + backward compat essential for contract evolution | SPEC-0017 |
| Pre-existing build errors must be tracked independently of current PR scope | SPEC-0018 |
| Audit consumes should use convenience methods (log()) to avoid circular DI | SPEC-0018 |
| ONNX Runtime via @xenova/transformers works well but worker_threads needs non-null parentPort | SPEC-0020 |
| KnowledgePublisher adoption pattern works cleanly with @Global() modules | SPEC-0020 |
| Doorbell + integration tests prove tenant isolation and scope enforcement | SPEC-0021 |
| Route path matching critical for rate limit key consistency in tests | SPEC-0021 |
| Controllers should use `request.tenantId` from auth context, not query params | SPEC-0021 |

---

## Current Platform Status

| Component | Status |
|-----------|--------|
| ADR | 0001–0024 ✅ |
| Platform Baseline | `sdd-v2.1-baseline` ✅ |
| Enterprise Design | ACTIVE ✅ |
| Feature Freeze | ACTIVE ✅ |
| Total archived SPECs | 22 |
| Pending SPECs | 2 (SPEC-0004, SPEC-0013) |
